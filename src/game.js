import * as THREE from 'three';
import { COURT } from './court.js';
import { sounds } from './audio.js';
import { network } from './network.js';

export class GameManager {
  constructor({ scene, camera, player, teammate, bot, bot2, court, shuttlecock, particles, onUIUpdate }) {
    this.scene = scene;
    this.camera = camera;
    this.player = player;
    this.teammate = teammate;
    this.bot = bot;
    this.bot2 = bot2;
    this.court = court;
    this.shuttlecock = shuttlecock;
    this.particles = particles;
    this.onUIUpdate = onUIUpdate;

    // Chế độ chơi: 'bot' (1v1) | 'bot-2v2' (2v2) | 'online-1v1' | 'online-2v2'
    this.gameMode = 'bot';
    this.isDoubles = false;
    this.isMultiplayer = false;
    this.multiplayerSlot = 0; // 0: Player 1 (Host), 1: Player 2 (Guest)
    this.serverSlot = 0; // 0: Slot 0 phát cầu, 1: Slot 1 phát cầu

    // Tỷ số & Trạng thái trận đấu
    this.playerScore = 0;
    this.botScore = 0;
    this.targetScore = 7;
    this.rallyCount = 0;
    this.maxRally = 0;
    this.currentServer = 'player';
    this.state = 'MENU';
    this.stateTimer = 0;

    // Bộ hẹn giờ trận đấu (Quản lý chặt chẽ để huỷ triệt để khi thoát hoặc hết trận)
    this.serveTimeout = null;
    this.botServeTimeout = null;
    this.pointTimeout = null;
    this.gameOverTimeout = null;

    // Rung lắc camera (Screen Shake)
    this.shakeIntensity = 0;
    this.bufferedAction = null;

    // 1. Góc nhìn Màn hình chờ & Lúc hết game (Isometric 3/4 góc chéo đặc trưng chuẩn Birdie Bash)
    this.lobbyCamPos = new THREE.Vector3(-7.2, 10.5, 13.2);
    this.lobbyCamLookAt = new THREE.Vector3(1.0, 0.4, -0.5);

    // 2. Góc nhìn Trong Trận Đấu (Camera sau lưng người chơi nhìn thẳng sân đấu như Màn 2)
    this.matchCamPos = new THREE.Vector3(0, 8.0, 13.4);
    this.matchCamLookAt = new THREE.Vector3(0, 0.6, -0.8);

    // Vị trí camera động được nội suy mượt mà (Smooth Lerp)
    this.currentCamPos = this.lobbyCamPos.clone();
    this.currentCamLookAt = this.lobbyCamLookAt.clone();
    this.defaultCamPos = this.lobbyCamPos;
    this.defaultCamLookAt = this.lobbyCamLookAt;

    // Lưu trữ phím điều khiển & Cảm ứng vuốt di chuyển
    this.keys = {};
    this.virtualJoystickDir = { x: 0, z: 0 };
    this.joystickVector = this.virtualJoystickDir;

    // VÒNG CHỈ THỊ HƯỚNG ĐÁNH THÔNG MINH (Smart Aim Reticle)
    this.aimTarget = new THREE.Vector3(0, 0.01, -4.8);
    this.buildAimReticle();

    this.bindEvents();
    this.setupMultiplayerListeners();
  }

  buildAimReticle() {
    this.aimReticle = new THREE.Group();

    // Vòng tròn ngoài phát sáng
    const ringGeo = new THREE.RingGeometry(0.32, 0.38, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    this.aimReticle.add(ring);

    // Dấu hồng tâm chữ thập
    const crossMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.9 });
    const hBar = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.04), crossMat);
    hBar.rotation.x = -Math.PI / 2;
    this.aimReticle.add(hBar);

    const vBar = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.5), crossMat);
    vBar.rotation.x = -Math.PI / 2;
    this.aimReticle.add(vBar);

    this.aimReticle.position.copy(this.aimTarget);
    this.scene.add(this.aimReticle);
  }

  // Kiểm tra lượt phát cầu hợp lệ (Đấu với Máy hoặc Đấu Online nhiều người)
  canPlayerServe() {
    if (this.state !== 'SERVE') return false;
    if (this.isMultiplayer) {
      return (this.multiplayerSlot === this.serverSlot);
    }
    return (this.currentServer === 'player');
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      if (this.state === 'MENU') return;
      this.keys[e.code] = true;

      if (this.state === 'SERVE' && (e.code === 'Space' || e.code === 'KeyJ')) {
        if (this.canPlayerServe()) {
          this.playerServe();
        } else {
          this.notifyUI('CHỜ ĐỐI THỦ PHÁT CẦU! ⏳', 'Chưa đến lượt của bạn, hãy đứng vị trí đón cầu!', 'warning');
        }
      } else if (this.state === 'RALLY') {
        if (e.code === 'Space' || e.code === 'KeyJ') {
          this.attemptSmartHit();
        } else if (e.code === 'KeyK') {
          this.attemptPlayerHit('smash');
        } else if (e.code === 'KeyL') {
          this.attemptPlayerHit('drop');
        } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyU') {
          this.attemptPlayerDive();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('mousedown', (e) => {
      if (this.state === 'MENU' || e.target.closest('#main-menu') || e.target.closest('#game-over-modal') || e.target.closest('.action-buttons') || e.target.closest('.hud-hint-btn') || e.target.closest('.modal-overlay')) {
        return;
      }
      if (this.state === 'SERVE') {
        if (this.canPlayerServe()) {
          this.playerServe();
        } else {
          this.notifyUI('CHỜ ĐỐI THỦ PHÁT CẦU! ⏳', 'Chưa đến lượt của bạn, hãy đứng vị trí đón cầu!', 'warning');
        }
      } else if (this.state === 'RALLY') {
        this.attemptSmartHit();
      }
    });
  }

  setupMultiplayerListeners() {
    // 1. Đối thủ di chuyển (Đảo đối xứng qua lưới để hiển thị ở sân đối diện Z < 0)
    network.on('remoteMove', (data) => {
      if (!this.isMultiplayer) return;
      if (data.slot !== this.multiplayerSlot) {
        this.bot.group.position.x = -data.x;
        this.bot.group.position.z = -data.z;
        if (data.state && this.bot.state !== data.state) {
          this.bot.playAction(data.state);
        }
      }
    });

    // 2. Đối thủ đánh cầu (tự động đảo góc nhìn qua lưới để quả cầu bay về phía sân người chơi)
    network.on('remoteHit', (data) => {
      if (!this.isMultiplayer) return;
      const hitterSlot = (data.hitterSlot !== undefined) ? data.hitterSlot : data.slot;
      if (hitterSlot === this.multiplayerSlot) return; // Bỏ qua nếu là cú đánh của chính mình

      // Giải phóng quả cầu sang trạng thái RALLY ngay lập tức (triệt tiêu lỗi cầu bị đóng băng lúc phát)
      this.state = 'RALLY';

      this.bot.playAction(data.shotType === 'smash' ? 'smash' : 'swing');
      sounds.playHit(data.shotType === 'smash');
      if (data.shotType === 'smash' && this.particles.emitFireSmash) {
        this.particles.emitFireSmash(this.shuttlecock.position, 48);
        this.shakeIntensity = 0.52;
      } else {
        this.particles.emitHit(this.shuttlecock.position, 16, false);
      }

      // Đảo tọa độ đối xứng qua tâm lưới (X' = -X, Z' = -Z, VX' = -VX, VZ' = -VZ)
      const fromPos = new THREE.Vector3(-data.from.x, data.from.y, -data.from.z);
      const vel = new THREE.Vector3(-data.velocity.x, data.velocity.y, -data.velocity.z);

      this.shuttlecock.hit({
        from: fromPos,
        velocity: vel,
        hitter: 'bot',
        shotType: data.shotType
      });

      this.registerRallyHit('bot', data.shotType);
      this.notifyUI(data.timing || 'ĐỐI THỦ ĐÁNH! 🏸', `Rally: ${this.rallyCount} chạm`, data.shotType === 'smash' ? 'smash' : 'hit');
    });

    // 3. Đồng bộ điểm số chính xác theo Slot (Slot 0 là Team 1, Slot 1 là Team 2)
    network.on('remoteScore', (data) => {
      if (!this.isMultiplayer) return;
      this.state = 'POINT';
      this.stateTimer = 0;
      if (this.multiplayerSlot === 0) {
        this.playerScore = (data.slot0Score !== undefined) ? data.slot0Score : (data.team1Score || 0);
        this.botScore = (data.slot1Score !== undefined) ? data.slot1Score : (data.team2Score || 0);
      } else {
        this.playerScore = (data.slot1Score !== undefined) ? data.slot1Score : (data.team2Score || 0);
        this.botScore = (data.slot0Score !== undefined) ? data.slot0Score : (data.team1Score || 0);
      }

      if (data.serverSlot !== undefined) {
        this.serverSlot = data.serverSlot;
      }
      this.currentServer = (this.multiplayerSlot === this.serverSlot) ? 'player' : 'bot';

      sounds.playWhistle();
      const isMyPoint = (data.scorerSlot === this.multiplayerSlot);
      if (isMyPoint) {
        sounds.playCheer();
        this.player.playAction('celebrate');
        this.notifyUI('BẠN GHI ĐIỂM! 🏸🎉', `${data.reason || ''} · Tỷ số: ${this.playerScore} - ${this.botScore}`, 'score-player');
      } else {
        this.bot.playAction('celebrate');
        this.notifyUI('ĐỐI THỦ GHI ĐIỂM! 🤖', `${data.reason || ''} · Tỷ số: ${this.playerScore} - ${this.botScore}`, 'score-bot');
      }

      const matchWinner = this.checkMatchWinner();
      if (matchWinner) {
        if (this.gameOverTimeout) clearTimeout(this.gameOverTimeout);
        this.gameOverTimeout = setTimeout(() => {
          if (this.state !== 'MENU') {
            this.gameOver(matchWinner);
          }
        }, 500);
      } else {
        if (this.pointTimeout) clearTimeout(this.pointTimeout);
        this.pointTimeout = setTimeout(() => {
          if (this.state !== 'MENU') {
            this.setupServe();
          }
        }, 2000);
      }
    });
  }

  // LUẬT TÍNH ĐIỂM BẮT BUỘC THEO QUỐC TẾ BWF (BWF LAW 7 - SCORING SYSTEM):
  // 1. Bên nào đạt mốc targetScore và cách biệt ít nhất 2 điểm sẽ thắng hiệp (Deuce rule)
  // 2. Nếu hòa liên tục, bên nào chạm trần điểm tối đa (maxCap) trước sẽ thắng ván đấu
  checkMatchWinner() {
    const target = this.targetScore;
    const maxCap = (target === 21) ? 30 : (target + 4); // 11 cho target 7; 15 cho target 11; 30 cho target 21
    const p = this.playerScore;
    const b = this.botScore;

    if ((p >= target || b >= target) && Math.abs(p - b) >= 2) {
      return p > b ? 'player' : 'bot';
    }
    if (p >= maxCap || b >= maxCap) {
      return p > b ? 'player' : 'bot';
    }
    return null;
  }

  startGame(difficulty = 'pro', mode = 'bot', yourSlot = 0) {
    // Huỷ triệt để mọi timeout cũ để trận mới độc lập 100%
    if (this.pointTimeout) { clearTimeout(this.pointTimeout); this.pointTimeout = null; }
    if (this.botServeTimeout) { clearTimeout(this.botServeTimeout); this.botServeTimeout = null; }
    if (this.gameOverTimeout) { clearTimeout(this.gameOverTimeout); this.gameOverTimeout = null; }
    if (this.serveTimeout) { clearTimeout(this.serveTimeout); this.serveTimeout = null; }

    this.gameMode = mode;
    this.isMultiplayer = mode.startsWith('online');
    this.isDoubles = mode.includes('2v2');
    this.multiplayerSlot = yourSlot;
    this.playerScore = 0;
    this.botScore = 0;
    this.rallyCount = 0;
    this.maxRally = 0;
    // Slot 0 (Chủ phòng) luôn phát cầu lượt đầu tiên (0-0)
    this.serverSlot = 0;
    this.currentServer = (this.multiplayerSlot === this.serverSlot) ? 'player' : 'bot';

    // Bật/tắt nhân vật đánh đôi
    if (this.teammate) this.teammate.group.visible = this.isDoubles;
    if (this.bot2) this.bot2.group.visible = this.isDoubles;

    // Thông báo chế độ
    if (this.isDoubles) {
      this.notifyUI('CHẾ ĐỘ ĐÁNH ĐÔI 2 VS 2! 👥', 'Phối hợp cùng đồng đội bao quát toàn bộ sân!', 'info');
    }

    this.state = 'SERVE';
    this.setupServe();
  }

  setupServe() {
    this.state = 'SERVE';
    this.stateTimer = 0;
    this.rallyCount = 0;

    // Xác định chính xác lượt phát cầu của bản thân (Người chơi hoặc Đấu Online)
    const isMyTurnToServe = this.canPlayerServe();
    this.currentServer = isMyTurnToServe ? 'player' : 'bot';

    // LUẬT CẦU LÔNG CHUẨN QUỐC TẾ BWF (EVEN / ODD SERVICE BOX):
    // Điểm số CHẴN (0, 2, 4...) -> Đứng ở ô giao cầu bên PHẢI
    // Điểm số LẺ (1, 3, 5...) -> Đứng ở ô giao cầu bên TRÁI
    const serverScore = isMyTurnToServe ? this.playerScore : this.botScore;
    const isEven = (serverScore % 2 === 0);

    let playerX, botX;
    if (isMyTurnToServe) {
      playerX = isEven ? 1.15 : -1.15; // Người chơi phát bên phải nếu chẵn, bên trái nếu lẻ
      botX = isEven ? -1.15 : 1.15;    // Đối thủ đứng chéo sân đón cầu
    } else {
      botX = isEven ? -1.15 : 1.15;    // Đối thủ phát bên phải nếu chẵn, bên trái nếu lẻ (theo góc nhìn đối thủ)
      playerX = isEven ? 1.15 : -1.15; // Người chơi đứng chéo sân đón cầu
    }

    this.player.group.position.set(playerX, 0, 4.6);
    this.player.state = 'idle';
    this.bot.group.position.set(botX, 0, -4.6);
    this.bot.state = 'idle';

    // Bố trí vị trí đồng đội & bot 2 trong chế độ Đánh Đôi 2v2 (1 người trước 1 người sau)
    if (this.isDoubles) {
      if (this.teammate) {
        // Đồng đội đứng bám lưới ở nửa sân bên kia
        this.teammate.group.position.set(-playerX * 0.7, 0, 3.0);
        this.teammate.state = 'idle';
      }
      if (this.bot2) {
        // Bot 2 đứng bám lưới đối diện
        this.bot2.group.position.set(-botX * 0.7, 0, -3.0);
        this.bot2.state = 'idle';
      }
    }

    // Cầu đặt ngay trên tay người phát cầu tương ứng
    this.shuttlecock.ground();
    if (isMyTurnToServe) {
      this.shuttlecock.position.set(playerX + (isEven ? 0.35 : -0.35), 1.05, 4.25);
      const sideText = isEven ? 'Ô PHẢI (Điểm chẵn)' : 'Ô TRÁI (Điểm lẻ)';
      this.notifyUI('BẠN PHÁT CẦU 🏸', `${sideText} · Bấm [ĐÁNH CẦU] để phát chéo sân`, 'info');
    } else {
      this.shuttlecock.position.set(botX + (isEven ? -0.35 : 0.35), 1.05, -4.25);
      const sideText = isEven ? 'Ô PHẢI (Điểm chẵn)' : 'Ô TRÁI (Điểm lẻ)';
      this.notifyUI(this.isMultiplayer ? 'ĐỐI THỦ PHÁT CẦU 🏸' : 'ĐỐI THỦ PHÁT CẦU 🤖', `Đối thủ đang phát từ ${sideText} · Chuẩn bị!`, 'warning');

      if (!this.isMultiplayer) {
        if (this.botServeTimeout) clearTimeout(this.botServeTimeout);
        this.botServeTimeout = setTimeout(() => {
          if (this.state === 'SERVE' && this.currentServer === 'bot') {
            this.botServe();
          }
        }, 1100);
      }
    }
  }

  playerServe() {
    if (this.state !== 'SERVE') return;
    this.state = 'RALLY';
    this.player.playAction('swing');
    sounds.playHit(false);
    this.particles.emitHit(this.shuttlecock.position, 14, false);

    // Phát cầu BẮT BUỘC chéo sân theo luật BWF:
    const isPlayerRight = this.player.group.position.x > 0;
    const baseTargetX = isPlayerRight ? -1.15 : 1.15;
    const targetX = THREE.MathUtils.clamp(baseTargetX + (this.aimTarget.x * 0.3), isPlayerRight ? -2.2 : 0.4, isPlayerRight ? -0.4 : 2.2);
    const targetZ = -4.8; // Rơi qua vạch phát cầu ngắn (-1.98m)
    const startPos = this.player.group.position.clone().add(new THREE.Vector3(isPlayerRight ? 0.35 : -0.35, 1.1, -0.35));

    const vel = this.calculateTrajectory(startPos, new THREE.Vector3(targetX, 0, targetZ), 'clear', 0.95);

    this.shuttlecock.hit({
      from: startPos,
      velocity: vel,
      hitter: 'player',
      shotType: 'serve'
    });

    if (this.isMultiplayer) {
      network.sendHit({
        shotType: 'serve',
        from: { x: startPos.x, y: startPos.y, z: startPos.z },
        velocity: { x: vel.x, y: vel.y, z: vel.z },
        target: { x: targetX, y: 0, z: targetZ },
        timing: 'GIAO CẦU 🏸'
      });
    }

    this.notifyUI('GIAO CẦU HỢP LỆ! 🏸', 'Rally bắt đầu', 'success');
  }

  botServe() {
    if (this.state !== 'SERVE') return;
    this.state = 'RALLY';
    this.bot.playAction('swing');
    sounds.playHit(false);
    this.particles.emitHit(this.shuttlecock.position, 12, false);

    // Bot phát chéo sân sang ô của player
    const isBotRight = this.bot.group.position.x < 0;
    const targetX = isBotRight ? 1.15 + (Math.random() - 0.5) * 0.5 : -1.15 + (Math.random() - 0.5) * 0.5;
    const targetZ = 4.8;
    const startPos = this.bot.group.position.clone().add(new THREE.Vector3(isBotRight ? -0.35 : 0.35, 1.1, 0.35));

    const vel = this.calculateTrajectory(startPos, new THREE.Vector3(targetX, 0, targetZ), 'clear', 0.95);

    this.shuttlecock.hit({
      from: startPos,
      velocity: vel,
      hitter: 'bot',
      shotType: 'serve'
    });
  }

  // HỆ THỐNG XỬ LÝ 4 NÚT HÀNH ĐỘNG ĐỘC LẬP & CHUẨN XÁC
  handlePlayerAction(actionType) {
    if (this.state === 'SERVE') {
      if (this.canPlayerServe()) {
        this.playerServe();
      } else {
        this.notifyUI('CHỜ ĐỐI THỦ PHÁT CẦU! ⏳', 'Chưa đến lượt của bạn, hãy đứng vị trí đón cầu!', 'warning');
      }
      return;
    }

    if (this.state !== 'RALLY') return;

    // Thử thực hiện cú đánh ngay
    const hitSuccess = this.executePlayerShot(actionType);
    if (!hitSuccess) {
      // Nếu cầu chưa tới nơi, lưu vào bộ đệm (Buffer) để tự động tung đòn ngay khi cầu vào tầm!
      this.bufferedAction = {
        type: actionType,
        time: Date.now()
      };
    }
  }

  canHitShuttle(actionType) {
    const s = this.shuttlecock;
    if (!s.isAirborne || s.lastHitter === 'player' || s.velocity.z < 0) return false;
    const pPos = this.player.group.position;
    const distXZ = new THREE.Vector2(pPos.x - s.position.x, pPos.z - s.position.z).length();
    const height = s.position.y;
    // Bán kính tiếp xúc vợt thực tế (giới hạn trong tầm với hợp lý, triệt tiêu lỗi đánh toàn map):
    // - Dive (cứu cầu): tối đa 2.2m (bước rướn chân lao người trượt sàn)
    // - Smash (đập cầu): tối đa 1.65m (bật nhảy tại chỗ vươn cao)
    // - Clear / Drop / Hit: tối đa 1.45m (sải tay + chiều dài cán vợt)
    const maxReach = actionType === 'dive' ? 2.2 : (actionType === 'smash' ? 1.65 : 1.45);
    return distXZ <= maxReach && height >= 0.05 && height <= 4.2 && s.position.z > 0.05;
  }

  // 1. CƠ CHẾ "1 NÚT DUY NHẤT" (Contextual One-Button Hit)
  // Tự động phân tích tình huống quả cầu và người chơi để kích hoạt đòn đánh tối ưu nhất:
  // 💥 Cầu ở trên cao -> Jump Smash cắm sàn cực mạnh!
  // 🪶 Sát lưới & tầm thấp -> Bỏ nhỏ (Drop shot) lỡ trớn đối thủ!
  // 💨 Rơi xa chân hoặc sát đất -> Lao người trượt sàn (Dive) cứu bóng ngoạn mục!
  // 🏸 Vị trí thông thường -> Phông cầu bổng sâu an toàn qua lại!
  resolveContextualShotType() {
    const s = this.shuttlecock;
    const pPos = this.player.group.position;
    const distXZ = Math.hypot(pPos.x - s.position.x, pPos.z - s.position.z);
    const height = s.position.y;
    const sZ = s.position.z;
    const pZ = pPos.z;

    // 💥 1. Khi quả cầu đang ở trên cao và trong tầm bật nhảy: Jump Smash cắm sàn!
    if (height >= 2.0 && distXZ <= 1.65) {
      return 'smash';
    }

    // 🪶 2. Khi bạn đang đứng sát lưới và cầu ở tầm thấp: Chạm nhẹ bỏ nhỏ (Drop shot)!
    if ((pZ <= 2.6 || sZ <= 2.3) && height < 2.0 && height >= 0.55 && distXZ <= 1.45) {
      return 'drop';
    }

    // 💨 3. Khi quả cầu rơi ở xa tầm chân hoặc sát đất trong cự ly cứu: Lao người trượt sàn (Dive)!
    if (distXZ > 1.35 && distXZ <= 2.2 && height <= 1.4 && sZ > 0.1) {
      return 'dive';
    }

    // 🏸 4. Ở các vị trí thông thường: Tự động phông cầu bổng sâu an toàn qua lại!
    return 'hit';
  }

  attemptSmartHit() {
    if (this.state === 'SERVE') {
      if (this.canPlayerServe()) {
        this.playerServe();
      } else {
        this.notifyUI('CHỜ ĐỐI THỦ PHÁT CẦU! ⏳', 'Chưa đến lượt của bạn, hãy đứng vị trí đón cầu!', 'warning');
      }
      return;
    }

    if (this.state !== 'RALLY') return;

    // 1 Nút Duy Nhất: Xác định chiêu thức tối ưu theo ngữ cảnh
    const smartType = this.resolveContextualShotType();
    const hitSuccess = this.executePlayerShot(smartType);

    if (!hitSuccess) {
      // Lưu vào bộ đệm để tự động tung đòn ngay khi cầu vào tầm
      this.bufferedAction = {
        type: 'smart',
        time: Date.now()
      };
    }
  }

  attemptPlayerDive() {
    this.handlePlayerAction('dive');
  }

  attemptPlayerHit(type) {
    this.handlePlayerAction(type);
  }

  // 4. KHEN THƯỞNG CHUỖI RALLY (Rally Streaks)
  // Quản lý nhịp giằng co rally và khen thưởng mỗi chuỗi 5 pha liên tiếp
  registerRallyHit(hitter = 'player', shotType = 'hit') {
    this.rallyCount++;
    if (this.rallyCount > this.maxRally) {
      this.maxRally = this.rallyCount;
    }

    // Cứ mỗi chuỗi 5 pha cầu giằng co liên tiếp (5x, 10x, 15x, 20x RALLY STREAK):
    // Khán giả bùng nổ tiếng reo hò kèm hiệu ứng danh hiệu rực lửa trên màn hình!
    if (this.rallyCount > 0 && this.rallyCount % 5 === 0) {
      this.triggerRallyStreak(this.rallyCount);
    }
  }

  triggerRallyStreak(count) {
    if (sounds && sounds.playCheer) sounds.playCheer();
    if (this.court && this.court.cheer) this.court.cheer(2.5);
    this.shakeIntensity = Math.min(0.55, 0.25 + count * 0.02);

    let title = `🔥 ${count}x RALLY STREAK! 🔥`;
    let subtitle = 'GIẰNG CO BỐC LỬA · KHÁN GIẢ HÒ REO!';
    if (count === 10) {
      title = `⚡ 10x SUPER RALLY! ⚡`;
      subtitle = 'ĐỈNH CAO PHẢN XẠ · TRANH TÀI NGHẸT THỞ!';
    } else if (count === 15) {
      title = `👑 15x GODLIKE RALLY! 👑`;
      subtitle = 'ĐẲNG CẤP THẦN THÁNH · ĐÔI CÔNG HUYỀN THOẠI!';
    } else if (count >= 20) {
      title = `🏆 ${count}x UNSTOPPABLE! 🏆`;
      subtitle = 'BẤT KHẢ CHIẾN BẠI · KỶ LỤC THẾ GIỚI!';
    }

    this.notifyUI(title, subtitle, 'streak');
  }

  calculateTrajectory(startPos, targetPos, shotType, speedMult = 1.0) {
    const g = -14.5;
    const dx = targetPos.x - startPos.x;
    const dz = targetPos.z - startPos.z;

    let flightTime = 1.1;
    let targetNetY = 1.85;

    if (shotType === 'smash') {
      flightTime = 0.28 / speedMult;
      targetNetY = 1.68;
    } else if (shotType === 'drop') {
      flightTime = 0.82 / speedMult;
      targetNetY = 1.62; // Bay lướt sát mép trên của lưới
    } else {
      flightTime = 1.20 / speedMult;
      targetNetY = 3.6;
    }

    const dragFactorZ = 1 + 0.045 * Math.abs(dz);
    const vz = (dz / flightTime) * dragFactorZ;

    const dragFactorX = 1 + 0.045 * Math.abs(dx);
    const vx = (dx / flightTime) * dragFactorX;

    const timeToNet = Math.abs(startPos.z / vz);
    let vy = (targetNetY - startPos.y - 0.5 * g * timeToNet * timeToNet) / timeToNet;

    if (shotType === 'clear') {
      vy = Math.max(vy, 11.2 * speedMult);
    } else if (shotType === 'drop') {
      vy = Math.max(vy, 4.2);
    } else if (shotType === 'smash') {
      vy = Math.min(vy, 3.5); // Cắm dốc xuống cực mạnh
    }

    return new THREE.Vector3(vx, vy, vz);
  }

  executePlayerShot(actionType) {
    const s = this.shuttlecock;
    if (!this.canHitShuttle(actionType)) return false;

    const pPos = this.player.group.position;
    this.registerRallyHit('player', actionType);

    // 3. NAM CHÂM HÚT VỊ TRÍ (Magnetic Step Assist)
    // Chỉ hỗ trợ bước đệm nhỏ (tối đa 0.25m) để nhân vật xoay chân thuận vào góc đánh
    // TUYỆT ĐỐI KHÔNG dịch chuyển tức thời xuyên bản đồ!
    if (actionType !== 'dive') {
      const idealOffsetX = (s.position.x > pPos.x) ? -0.28 : 0.28;
      const idealOffsetZ = (actionType === 'smash') ? 0.35 : 0.20;
      const stepTargetX = THREE.MathUtils.clamp(s.position.x + idealOffsetX, -2.15, 2.15);
      const stepTargetZ = THREE.MathUtils.clamp(s.position.z + idealOffsetZ, 1.15, 5.75);

      const dx = stepTargetX - pPos.x;
      const dz = stepTargetZ - pPos.z;
      const stepDist = Math.hypot(dx, dz);
      if (stepDist > 0.01) {
        const stepClamped = Math.min(stepDist, 0.25);
        pPos.x += (dx / stepDist) * stepClamped * 0.7;
        pPos.z += (dz / stepDist) * stepClamped * 0.7;
      }
    }

    // 1. CỨU CẦU (Dive)
    // Giới hạn cự ly trượt sàn tối đa 0.75m khi rướn cứu bóng
    if (actionType === 'dive') {
      const slideDx = s.position.x - pPos.x;
      const slideDz = (s.position.z + 0.25) - pPos.z;
      const slideDist = Math.hypot(slideDx, slideDz);
      if (slideDist > 0.01) {
        const slideClamped = Math.min(slideDist, 0.75);
        pPos.x = THREE.MathUtils.clamp(pPos.x + (slideDx / slideDist) * slideClamped, -2.15, 2.15);
        pPos.z = THREE.MathUtils.clamp(pPos.z + (slideDz / slideDist) * slideClamped, 1.15, 5.75);
      }
      this.player.playAction('dive');
      sounds.playDive();
      this.particles.emitDust(this.player.group.position);

      const targetPos = new THREE.Vector3(
        THREE.MathUtils.clamp(this.aimTarget.x, -2.1, 2.1),
        0,
        -5.2
      );
      const startPos = s.position.clone();
      const vel = this.calculateTrajectory(startPos, targetPos, 'clear', 1.0);
      vel.y = Math.max(vel.y, 12.8); // Cứu bổng cao phòng thủ

      s.hit({
        from: startPos,
        velocity: vel,
        hitter: 'player',
        shotType: 'dive'
      });

      this.notifyUI('💨 CỨU CẦU NGOẠN MỤC! 🛡️', `Rally: ${this.rallyCount} chạm`, 'hit');
      return true;
    }

    // 2. SMASH (Đập Cầu Cắm Sàn Tóe Lửa)
    if (actionType === 'smash') {
      this.player.playAction('smash');
      sounds.playHit(true);
      this.shakeIntensity = 0.65;
      if (this.particles.emitFireSmash) {
        this.particles.emitFireSmash(s.position, 56);
      } else {
        this.particles.emitHit(s.position, 36, true);
      }

      const targetPos = new THREE.Vector3(
        THREE.MathUtils.clamp(this.aimTarget.x, -2.0, 2.0),
        0,
        -3.2
      );
      const startPos = s.position.clone();
      const vel = this.calculateTrajectory(startPos, targetPos, 'smash', 1.35);

      s.hit({
        from: startPos,
        velocity: vel,
        hitter: 'player',
        shotType: 'smash'
      });

      this.notifyUI('💥 SIÊU SMASH TÓE LỬA! 🔥', `Rally: ${this.rallyCount} chạm`, 'smash');
      return true;
    }

    // 3. BỎ NHỎ (Drop Shot Sát Lưới)
    if (actionType === 'drop') {
      this.player.playAction('swing');
      sounds.playDrop();
      this.particles.emitHit(s.position, 12, false);

      const targetPos = new THREE.Vector3(
        THREE.MathUtils.clamp(this.aimTarget.x, -2.0, 2.0),
        0,
        -1.35
      );
      const startPos = s.position.clone();
      const vel = this.calculateTrajectory(startPos, targetPos, 'drop', 1.0);

      s.hit({
        from: startPos,
        velocity: vel,
        hitter: 'player',
        shotType: 'drop'
      });

      this.notifyUI('🪶 BỎ NHỎ SÁT LƯỚI! ✨', `Rally: ${this.rallyCount} chạm`, 'drop');
      return true;
    }

    // 4. ĐÁNH CẦU PHÔNG (Hit / Clear Cơ Bản)
    this.player.playAction('swing');
    sounds.playHit(false);
    this.particles.emitHit(s.position, 16, false);

    const targetPos = new THREE.Vector3(
      THREE.MathUtils.clamp(this.aimTarget.x, -2.1, 2.1),
      0,
      -5.0
    );
    const startPos = s.position.clone();
    const vel = this.calculateTrajectory(startPos, targetPos, 'clear', 1.0);

    s.hit({
      from: startPos,
      velocity: vel,
      hitter: 'player',
      shotType: 'clear'
    });

    this.notifyUI('🏸 ĐÁNH CẦU CHẮC TAY! 🎯', `Rally: ${this.rallyCount} chạm`, 'hit');
    return true;
  }

  checkNetCollision() {
    const s = this.shuttlecock;
    if (!s.isAirborne) return;

    const prevZ = s.position.z - s.velocity.z * 0.016;
    const currZ = s.position.z;

    if ((prevZ * currZ <= 0) && Math.abs(currZ) < 0.28) {
      if (Math.abs(s.position.x) <= COURT.HALF_WIDTH) {
        if (s.position.y <= COURT.NET_HEIGHT) {
          sounds.playFloorTap();
          this.particles.emitHit(s.position, 10, false);
          s.velocity.z = -s.velocity.z * 0.2;
          s.velocity.x *= 0.3;
          s.velocity.y = -2;

          this.onPointScored(s.lastHitter === 'player' ? 'bot' : 'player', 'VƯỚNG LƯỚI! (NET FAULT)');
        }
      }
    }
  }

  checkGroundHit() {
    const s = this.shuttlecock;
    if (!s.isAirborne) return;

    if (s.position.y <= 0.06) {
      const wasSmash = (s.shotType === 'smash');
      const impactPos = s.position.clone();
      s.ground();
      sounds.playFloorTap();
      sounds.playWhistle();

      if (wasSmash && this.particles.emitFireImpact) {
        this.particles.emitFireImpact(impactPos);
        this.shakeIntensity = 0.38;
      }

      const landX = s.position.x;
      const landZ = s.position.z;
      const hitter = s.lastHitter;
      const isServe = (s.shotType === 'serve');
      const halfWidth = this.isDoubles ? COURT.HALF_WIDTH : COURT.HALF_SINGLES_WIDTH;

      // ========================================================
      // 1. CẦU KHÔNG QUA LƯỚI / RƠI Ở SÂN NHÀ CỦA BÊN VỪA ĐÁNH
      // ========================================================
      if (hitter === 'player' && landZ >= 0) {
        const reason = isServe ? 'GIAO CẦU KHÔNG QUA LƯỚI! (NET FAULT)' : 'CẦU KHÔNG QUA LƯỚI! (NET FAULT)';
        this.onPointScored('bot', reason);
        return;
      }

      if (hitter === 'bot' && landZ <= 0) {
        const reason = isServe ? 'ĐỐI THỦ GIAO CẦU KHÔNG QUA LƯỚI!' : 'ĐỐI THỦ ĐÁNH KHÔNG QUA LƯỚI!';
        this.onPointScored('player', reason);
        return;
      }

      // ========================================================
      // 2. LUẬT GIAO CẦU CHUẨN QUỐC TẾ BWF (BWF LAW 9, 10 & 11)
      // ========================================================
      if (isServe) {
        const maxServiceZ = this.isDoubles ? COURT.DOUBLES_LONG_SERVICE_Z : COURT.HALF_LENGTH;

        if (hitter === 'player') {
          // Player giao cầu sang sân Bot (Z < 0):
          // a. Lỗi giao cầu ngắn (không qua vạch phát cầu ngắn 1.98m)
          if (landZ > -COURT.SHORT_SERVICE_Z) {
            this.onPointScored('bot', 'LỖI GIAO CẦU NGẮN! (SHORT SERVICE FAULT)');
            return;
          }
          // b. Lỗi giao cầu dài ra ngoài vạch cuối
          if (landZ < -maxServiceZ) {
            const reason = this.isDoubles ? 'GIAO CẦU DÀI NGOÀI VẠCH ĐÔI! (LONG FAULT)' : 'GIAO CẦU DÀI RA NGOÀI SÂN! (LONG FAULT)';
            this.onPointScored('bot', reason);
            return;
          }
          // c. Lỗi ra ngoài vạch biên
          if (Math.abs(landX) > halfWidth) {
            const reason = this.isDoubles ? 'GIAO CẦU NGOÀI VẠCH BIÊN ĐÔI!' : 'GIAO CẦU NGOÀI VẠCH BIÊN ĐƠN!';
            this.onPointScored('bot', reason);
            return;
          }
          // d. Lỗi giao nhầm ô / Lệch vạch giữa sân (Phát chéo sân chuẩn BWF):
          // Player phát từ ô Phải (player.x > 0) -> phải rơi vào ô Phải của Bot (landX < 0)
          // Player phát từ ô Trái (player.x < 0) -> phải rơi vào ô Trái của Bot (landX > 0)
          const serverWasRight = this.player.group.position.x > 0;
          const landedRightCourt = landX < 0;
          if (serverWasRight !== landedRightCourt) {
            this.onPointScored('bot', 'LỖI GIAO CẦU NHẦM Ô! (WRONG COURT FAULT)');
            return;
          }

          this.onPointScored('player', 'GIAO CẦU ĂN ĐIỂM TRỰC TIẾP! (ACE)');
          return;
        } else {
          // Bot giao cầu sang sân Player (Z > 0):
          if (landZ < COURT.SHORT_SERVICE_Z) {
            this.onPointScored('player', 'ĐỐI THỦ GIAO CẦU NGẮN! (SHORT SERVICE FAULT)');
            return;
          }
          if (landZ > maxServiceZ) {
            const reason = this.isDoubles ? 'ĐỐI THỦ GIAO DÀI NGOÀI VẠCH ĐÔI!' : 'ĐỐI THỦ GIAO DÀI RA NGOÀI SÂN!';
            this.onPointScored('player', reason);
            return;
          }
          if (Math.abs(landX) > halfWidth) {
            const reason = this.isDoubles ? 'ĐỐI THỦ GIAO NGOÀI BIÊN ĐÔI!' : 'ĐỐI THỦ GIAO NGOÀI BIÊN ĐƠN!';
            this.onPointScored('player', reason);
            return;
          }
          const botWasRight = this.bot.group.position.x < 0;
          const landedRightCourt = landX > 0;
          if (botWasRight !== landedRightCourt) {
            this.onPointScored('player', 'ĐỐI THỦ GIAO NHẦM Ô! (WRONG COURT FAULT)');
            return;
          }

          this.onPointScored('bot', 'ĐỐI THỦ GIAO CẦU ĂN ĐIỂM! (ACE)');
          return;
        }
      }

      // ========================================================
      // 3. LUẬT TÍNH ĐIỂM TRONG PHA CẦU (RALLY RULES - BWF LAW 13)
      // ========================================================
      const isInWidth = Math.abs(landX) <= halfWidth;
      const isInLength = Math.abs(landZ) <= COURT.HALF_LENGTH;
      const isInside = isInWidth && isInLength;

      if (!isInside) {
        // Cầu bay ra ngoài sân: Bên vừa đánh làm mất điểm!
        const winner = hitter === 'player' ? 'bot' : 'player';
        const reason = hitter === 'player'
          ? (this.isDoubles ? 'BẠN ĐÁNH CẦU NGOÀI BIÊN ĐÔI! (OUT)' : 'BẠN ĐÁNH CẦU RA NGOÀI SÂN! (OUT)')
          : (this.isDoubles ? 'ĐỐI THỦ ĐÁNH NGOÀI BIÊN ĐÔI! (OUT)' : 'ĐỐI THỦ ĐÁNH CẦU RA NGOÀI! (OUT)');
        this.onPointScored(winner, reason);
      } else {
        // Cầu rơi hợp lệ trong sân đối phương: Bên vừa đánh ghi điểm!
        const winner = hitter === 'player' ? 'player' : 'bot';
        const reason = hitter === 'player' ? 'CẦU TRONG SÂN! (IN POINT)' : 'ĐỐI THỦ GHI ĐIỂM SÂN NHÀ!';
        this.onPointScored(winner, reason);
      }
    }
  }

  onPointScored(winner, reason) {
    if (this.state === 'POINT' || this.state === 'GAMEOVER' || this.state === 'MENU') return;
    this.state = 'POINT';
    this.stateTimer = 0;

    if (winner === 'player') {
      this.playerScore++;
      this.currentServer = 'player';
      if (this.isMultiplayer) {
        this.serverSlot = this.multiplayerSlot; // Bên thắng rally giữ quyền phát cầu lượt kế tiếp
      }
      this.player.playAction('celebrate');
      if (this.teammate && this.isDoubles) this.teammate.playAction('celebrate');
      sounds.playCheer();
      if (this.court && this.court.cheer) this.court.cheer(1.6); // Khán giả reo hò & Trọng tài giơ cờ
      this.notifyUI('BẠN GHI ĐIỂM! 🏸🎉', `${reason} · Tỷ số: ${this.playerScore} - ${this.botScore}`, 'score-player');
    } else {
      this.botScore++;
      this.currentServer = 'bot';
      if (this.isMultiplayer) {
        this.serverSlot = (this.multiplayerSlot === 0 ? 1 : 0); // Đổi lượt phát cầu cho đối thủ
      }
      this.bot.playAction('celebrate');
      this.notifyUI('ĐỐI THỦ GHI ĐIỂM! 🤖', `${reason} · Tỷ số: ${this.playerScore} - ${this.botScore}`, 'score-bot');
    }

    if (this.isMultiplayer) {
      const slot0Score = (this.multiplayerSlot === 0) ? this.playerScore : this.botScore;
      const slot1Score = (this.multiplayerSlot === 1) ? this.playerScore : this.botScore;
      const scorerSlot = (winner === 'player') ? this.multiplayerSlot : (this.multiplayerSlot === 0 ? 1 : 0);

      network.sendScore({
        slot0Score,
        slot1Score,
        serverSlot: this.serverSlot,
        scorerSlot,
        team1Score: slot0Score,
        team2Score: slot1Score,
        reason
      });
    }

    const matchWinner = this.checkMatchWinner();
    if (matchWinner) {
      if (this.gameOverTimeout) clearTimeout(this.gameOverTimeout);
      this.gameOverTimeout = setTimeout(() => {
        if (this.state !== 'MENU') {
          this.gameOver(matchWinner);
        }
      }, 500);
    } else {
      // Thông báo trạng thái Deuce hoặc Game Point kịch tính chuẩn BWF
      const p = this.playerScore;
      const b = this.botScore;
      const target = this.targetScore;
      const isDeuce = (p >= target - 1 && b >= target - 1 && p === b);
      const isGamePointPlayer = (p >= target - 1 && p > b);
      const isGamePointBot = (b >= target - 1 && b > p);

      if (isDeuce) {
        setTimeout(() => {
          this.notifyUI('🔥 DEUCE! HÒA KỊCH TÍNH! 🔥', `Tỷ số ${p} - ${b} · Cách biệt 2 điểm để thắng!`, 'warning');
        }, 900);
      } else if (isGamePointPlayer) {
        setTimeout(() => {
          this.notifyUI('⚡ GAME POINT CHO BẠN! ⚡', `Tỷ số ${p} - ${b} · Còn 1 điểm nữa để chiến thắng!`, 'info');
        }, 900);
      } else if (isGamePointBot) {
        setTimeout(() => {
          this.notifyUI('⚠️ GAME POINT ĐỐI THỦ! ⚠️', `Tỷ số ${p} - ${b} · Đối thủ đang nắm điểm quyết định!`, 'warning');
        }, 900);
      }

      if (this.pointTimeout) clearTimeout(this.pointTimeout);
      this.pointTimeout = setTimeout(() => {
        if (this.state !== 'MENU') {
          this.setupServe();
        }
      }, 2000);
    }
  }

  gameOver(winner) {
    if (this.state === 'MENU') return;
    this.state = 'GAMEOVER';
    if (winner === 'player') {
      sounds.playCheer();
      this.player.playAction('celebrate');
      if (this.teammate && this.isDoubles) this.teammate.playAction('celebrate');
      this.notifyUI('🏆 BẠN ĐÃ CHIẾN THẮNG! 🏆', `Chiến thắng với tỷ số ${this.playerScore} - ${this.botScore}!`, 'win');
    } else {
      this.bot.playAction('celebrate');
      if (this.bot2 && this.isDoubles) this.bot2.playAction('celebrate');
      this.notifyUI('💔 ĐỐI THỦ THẮNG CUỘC!', `Tỷ số: ${this.playerScore} - ${this.botScore}. Hãy thử lại nhé!`, 'lose');
    }
  }

  notifyUI(title, subtitle, type) {
    if (this.onUIUpdate) {
      this.onUIUpdate({
        title,
        subtitle,
        type,
        playerScore: this.playerScore,
        botScore: this.botScore,
        rallyCount: this.rallyCount,
        currentServer: this.currentServer,
        canPlayerServe: this.canPlayerServe(),
        isMultiplayer: this.isMultiplayer,
        serverSlot: this.serverSlot,
        multiplayerSlot: this.multiplayerSlot,
        state: this.state
      });
    }
  }


  // CHIẾN THUẬT ĐÁNH ĐÔI 2v2 THÔNG MINH ĐẲNG CẤP (BWF DOUBLES TACTICS)
  // Phân vùng chuẩn xác (Left/Right & Front/Back), không tranh chấp cầu, di chuyển mượt mà có animation
  updateDoubles(dt) {
    if (!this.isDoubles || this.state !== 'RALLY') return;

    const s = this.shuttlecock;
    const p = this.player.group.position;
    const tm = this.teammate;
    const b1 = this.bot;
    const b2 = this.bot2;

    if (!tm || !b1 || !b2) return;

    const landX = THREE.MathUtils.clamp(s.predictedLanding.x, -2.6, 2.6);
    const landZ = THREE.MathUtils.clamp(s.predictedLanding.z, -6.0, 6.0);

    // ========================================================
    // 1. ĐỒNG ĐỘI AI (TEAMMATE) - PHỐI HỢP ĂN Ý VỚI NGƯỜI CHƠI
    // ========================================================
    const isBallHeadingToPlayer = s.isAirborne && s.velocity.z > 0 && s.lastHitter !== 'player';

    // Vị trí giữ cự ly bọc lót cơ bản theo người chơi
    let tmTargetX = (p.x < 0) ? 1.35 : -1.35;
    let tmTargetZ = (p.z < 3.8) ? 4.8 : 2.5;

    const distPlayerToLanding = Math.hypot(p.x - landX, p.z - landZ);
    const distTmToLanding = Math.hypot(tm.group.position.x - landX, tm.group.position.z - landZ);
    const distPlayerToBall = Math.hypot(p.x - s.position.x, p.z - s.position.z);

    // QUY TẮC BỌC LÓT THÔNG MINH (Smart Arbitration):
    // Người chơi luôn được ưu tiên cao nhất để tận hưởng trải nghiệm đánh cầu.
    // Đồng đội chỉ can thiệp khi:
    // a. Cầu rơi xa người chơi (> 2.8m) và đồng đội ở gần hơn
    // b. Hoặc cầu rơi sâu góc đối diện người chơi (> 3.2m)
    // c. Hoặc pha bóng nguy hiểm sắp chạm đất (< 0.65m) mà người chơi cách xa > 1.9m
    const tmAssigned = isBallHeadingToPlayer && (
      (distPlayerToLanding > 2.8 && distTmToLanding < distPlayerToLanding) ||
      (distPlayerToLanding > 3.2) ||
      (s.position.y < 0.65 && distPlayerToBall > 1.9 && distTmToLanding < 2.0)
    );

    if (tmAssigned) {
      // Đồng đội chủ động tiến tới điểm đón cầu
      tmTargetX = landX;
      tmTargetZ = Math.max(1.6, landZ - 0.25);
    } else {
      // Người chơi phụ trách cầu -> Đồng đội lùi/tiến bọc lót khoảng trống sân nhà
      if (p.x < -0.2) {
        tmTargetX = 1.35; // Người chơi bên trái -> Đồng đội bao quát bên phải
      } else if (p.x > 0.2) {
        tmTargetX = -1.35; // Người chơi bên phải -> Đồng đội bao quát bên trái
      } else {
        tmTargetX = (landX < 0) ? 1.35 : -1.35;
      }

      if (p.z < 3.6) {
        tmTargetZ = 5.0; // Người chơi lên lưới -> Đồng đội lùi sâu bao quát đáy sân
      } else {
        tmTargetZ = 2.4; // Người chơi lùi đáy -> Đồng đội tiến bám lưới đón quả rụng
      }
    }

    // Di chuyển đồng đội có inputDir để kích hoạt animation chạy/bước chân mượt mà
    const tmPos = tm.group.position;
    const tmDir = new THREE.Vector3(tmTargetX - tmPos.x, 0, tmTargetZ - tmPos.z);
    const tmDist = tmDir.length();
    let tmInputDir = null;
    if (tmDist > 0.15) {
      tmDir.normalize();
      tmInputDir = tmDir;
    }
    tm.update(dt, tmInputDir);

    // Đồng đội thực hiện cú đánh khi cầu vào tầm vợt (Và người chơi không đứng ngay sát đó)
    const distTmToBallXZ = Math.hypot(tmPos.x - s.position.x, tmPos.z - s.position.z);
    const canTmHit = isBallHeadingToPlayer &&
                     distTmToBallXZ < 1.65 &&
                     s.position.z > 0.35 &&
                     s.position.y > 0.2 &&
                     s.position.y < 3.8 &&
                     distPlayerToBall > 1.85; // Không cướp cầu khi người chơi đang ngay sát đó

    if (canTmHit) {
      const height = s.position.y;
      const startPos = s.position.clone();
      const tmShotType = height > 1.85 ? 'smash' : (tmPos.z < 3.0 && height < 1.6 ? 'drop' : 'clear');
      this.registerRallyHit('player', tmShotType);

      if (height > 1.85) {
        // SMASH TÓE LỬA DŨNG MÃNH
        tm.playAction('smash');
        sounds.playHit(true);
        this.shakeIntensity = 0.55;
        if (this.particles.emitFireSmash) {
          this.particles.emitFireSmash(startPos, 50);
        }

        const openX = (b1.group.position.x + b2.group.position.x > 0) ? -1.7 : 1.7;
        const targetPos = new THREE.Vector3(openX + (Math.random() - 0.5) * 0.4, 0, -3.2);
        const vel = this.calculateTrajectory(startPos, targetPos, 'smash', 1.35);

        s.hit({ from: startPos, velocity: vel, hitter: 'player', shotType: 'smash' });
        this.notifyUI('💥 ĐỒNG ĐỘI SMASH TÓE LỬA! 🔥', `Rally: ${this.rallyCount} chạm`, 'smash');
      } else if (tmPos.z < 3.0 && height < 1.6) {
        // BỎ NHỎ TINH TẾ SÁT LƯỚI
        tm.playAction('swing');
        sounds.playDrop();
        this.particles.emitHit(startPos, 14, false);

        const openX = (Math.random() - 0.5) * 3.0;
        const targetPos = new THREE.Vector3(openX, 0, -1.35);
        const vel = this.calculateTrajectory(startPos, targetPos, 'drop', 0.85);

        s.hit({ from: startPos, velocity: vel, hitter: 'player', shotType: 'drop' });
        this.notifyUI('🏸 ĐỒNG ĐỘI BỎ NHỎ TINH TẾ! 🎯', `Rally: ${this.rallyCount} chạm`, 'hit');
      } else {
        // PHÔNG CẦU CAO SÂU CUỐI SÂN
        tm.playAction('swing');
        sounds.playHit(false);
        this.particles.emitHit(startPos, 16, false);

        const targetPos = new THREE.Vector3((Math.random() - 0.5) * 3.4, 0, -5.0);
        const vel = this.calculateTrajectory(startPos, targetPos, 'clear', 0.98);

        s.hit({ from: startPos, velocity: vel, hitter: 'player', shotType: 'clear' });
        this.notifyUI('🏸 ĐỒNG ĐỘI BỌC LÓT PHÔNG CẦU! 🛡️', `Rally: ${this.rallyCount} chạm`, 'hit');
      }
    }

    // ========================================================
    // 2. BỘ ĐÔI MÁY (BOT 1 & BOT 2) - PHỐI HỢP ĐÁNH ĐÔI THÔNG MINH
    // ========================================================
    const isBallHeadingToBots = s.isAirborne && s.velocity.z < 0 && s.lastHitter !== 'bot';
    const b1Pos = b1.group.position;
    const b2Pos = b2.group.position;

    if (isBallHeadingToBots) {
      // Phân chia nhiệm vụ theo khoảng cách tới điểm rơi dự đoán
      const d1 = Math.hypot(b1Pos.x - landX, b1Pos.z - landZ);
      const d2 = Math.hypot(b2Pos.x - landX, b2Pos.z - landZ);

      const hitter = (d1 <= d2) ? b1 : b2;
      const cover = (d1 <= d2) ? b2 : b1;

      // Hitter di chuyển đón cầu
      const hitterTargetX = landX;
      const hitterTargetZ = Math.min(-0.9, landZ - 0.25);

      const hDir = new THREE.Vector3(hitterTargetX - hitter.group.position.x, 0, hitterTargetZ - hitter.group.position.z);
      let hInputDir = null;
      if (hDir.length() > 0.15) {
        hDir.normalize();
        hInputDir = hDir;
      }
      hitter.update(dt, hInputDir);

      // Cover bot di chuyển trám vị trí hở
      let coverTargetX = (hitterTargetX < -0.3) ? 1.35 : (hitterTargetX > 0.3 ? -1.35 : -hitterTargetX * 0.7);
      let coverTargetZ = (hitterTargetZ < -4.0) ? -2.4 : -4.8; // Hitter ở đáy -> Cover bám lưới, ngược lại lùi sâu

      const cDir = new THREE.Vector3(coverTargetX - cover.group.position.x, 0, coverTargetZ - cover.group.position.z);
      let cInputDir = null;
      if (cDir.length() > 0.15) {
        cDir.normalize();
        cInputDir = cDir;
      }
      cover.update(dt, cInputDir);

      // Kiểm tra đánh trả cho Hitter
      const distHitterBallXZ = Math.hypot(hitter.group.position.x - s.position.x, hitter.group.position.z - s.position.z);
      const canHitterHit = distHitterBallXZ < 1.65 &&
                           s.position.z < -0.35 &&
                           s.position.y > 0.2 &&
                           s.position.y < 3.8;

      if (canHitterHit) {
        const height = s.position.y;
        const startPos = s.position.clone();
        const rand = Math.random();
        const botShotType = (height > 1.85 && rand < 0.65) ? 'smash' : ((hitter.group.position.z > -2.8 && height < 1.6 && rand < 0.38) ? 'drop' : 'clear');
        this.registerRallyHit('bot', botShotType);

        if (height > 1.85 && rand < 0.65) {
          // BOT SMASH TÓE LỬA
          hitter.playAction('smash');
          sounds.playHit(true);
          this.shakeIntensity = 0.52;
          if (this.particles.emitFireSmash) {
            this.particles.emitFireSmash(startPos, 48);
          }

          const openX = (p.x > 0) ? -1.65 : 1.65;
          const targetPos = new THREE.Vector3(openX + (Math.random() - 0.5) * 0.4, 0, 3.2);
          const vel = this.calculateTrajectory(startPos, targetPos, 'smash', 1.35);

          s.hit({ from: startPos, velocity: vel, hitter: 'bot', shotType: 'smash' });
          this.notifyUI('💥 ĐỐI THỦ SMASH TÓE LỬA! 🔥', `Rally: ${this.rallyCount} chạm`, 'smash');
        } else if (hitter.group.position.z > -2.8 && height < 1.6 && rand < 0.38) {
          // BOT BỎ NHỎ SÁT LƯỚI
          hitter.playAction('swing');
          sounds.playDrop();
          this.particles.emitHit(startPos, 14, false);

          const openX = (Math.random() - 0.5) * 3.2;
          const targetPos = new THREE.Vector3(openX, 0, 1.35);
          const vel = this.calculateTrajectory(startPos, targetPos, 'drop', 0.82);

          s.hit({ from: startPos, velocity: vel, hitter: 'bot', shotType: 'drop' });
          this.notifyUI('🏸 ĐỐI THỦ BỎ NHỎ! 🎯', `Rally: ${this.rallyCount} chạm`, 'hit');
        } else {
          // BOT PHÔNG CẦU CAO SÂU
          hitter.playAction('swing');
          sounds.playHit(false);
          this.particles.emitHit(startPos, 16, false);

          const openX = (p.x > 0) ? -1.75 : 1.75;
          const targetPos = new THREE.Vector3(openX, 0, 4.9);
          const vel = this.calculateTrajectory(startPos, targetPos, 'clear', 0.98);

          s.hit({ from: startPos, velocity: vel, hitter: 'bot', shotType: 'clear' });
        }
      }
    } else {
      // Cầu đang bay sang sân Player -> Cả Bot 1 và Bot 2 trở về vị trí phòng thủ đôi song song
      const b1TargetX = -1.25;
      const b1TargetZ = -4.0;
      const b1Dir = new THREE.Vector3(b1TargetX - b1Pos.x, 0, b1TargetZ - b1Pos.z);
      let b1Input = null;
      if (b1Dir.length() > 0.15) { b1Dir.normalize(); b1Input = b1Dir; }
      b1.update(dt, b1Input);

      const b2TargetX = 1.25;
      const b2TargetZ = -4.0;
      const b2Dir = new THREE.Vector3(b2TargetX - b2Pos.x, 0, b2TargetZ - b2Pos.z);
      let b2Input = null;
      if (b2Dir.length() > 0.15) { b2Dir.normalize(); b2Input = b2Dir; }
      b2.update(dt, b2Input);
    }
  }

  update(dt) {
    this.stateTimer += dt;

    // TRONG LÚC GIAO CẦU (SERVE):
    // QUẢ CẦU BẮT BUỘC ĐI THEO NGƯỜI PHÁT CẦU - KHÔNG BAO GIỜ BỊ NGƯỜI 1 NƠI CẦU 1 NƠI!
    if (this.state === 'SERVE') {
      const isMyTurn = this.canPlayerServe();
      if (isMyTurn) {
        const px = this.player.group.position.x;
        const pz = this.player.group.position.z;
        this.shuttlecock.position.set(
          px + (px > 0 ? 0.35 : -0.35),
          1.05 + Math.sin(this.stateTimer * 4.5) * 0.04,
          pz - 0.35
        );
        this.shuttlecock.velocity.set(0, 0, 0);
      } else {
        const bx = this.bot.group.position.x;
        const bz = this.bot.group.position.z;
        this.shuttlecock.position.set(
          bx + (bx < 0 ? -0.35 : 0.35),
          1.05 + Math.sin(this.stateTimer * 4.5) * 0.04,
          bz + 0.35
        );
        this.shuttlecock.velocity.set(0, 0, 0);
      }
    }

    if (this.state === 'RALLY') {
      this.checkNetCollision();
      this.updateDoubles(dt);
      this.checkGroundHit();

      // Hiệu ứng tàn lửa đuôi cầu khi đang bay cú smash tóe lửa
      if (this.shuttlecock.isAirborne && this.shuttlecock.shotType === 'smash' && this.particles.emitSmashTrail) {
        this.particles.emitSmashTrail(this.shuttlecock.position);
      }

      // Xử lý bộ đệm thao tác (Buffered Action) để tự động tung đòn ngay khi cầu vào tầm
      if (this.bufferedAction) {
        if (Date.now() - this.bufferedAction.time < 380) {
          const actionType = (this.bufferedAction.type === 'smart') ? this.resolveContextualShotType() : this.bufferedAction.type;
          if (this.canHitShuttle(actionType)) {
            this.executePlayerShot(actionType);
            this.bufferedAction = null;
          }
        } else {
          this.bufferedAction = null;
        }
      }

      // 3. NAM CHÂM HÚT VỊ TRÍ (Magnetic Step Assist)
      // Khi cầu bay về phía sân người chơi, chỉ hỗ trợ vi chỉnh nhẹ khi người chơi ĐÃ CHẠY ĐẾN GẦN (dưới 1.25m)
      if (this.shuttlecock.isAirborne && this.shuttlecock.velocity.z > 0 && this.shuttlecock.position.z > 0.5) {
        const pPos = this.player.group.position;
        const sPos = this.shuttlecock.position;
        const distToBall = Math.hypot(pPos.x - sPos.x, pPos.z - sPos.z);
        if (distToBall < 1.25 && sPos.y < 2.5) {
          const pullTargetX = sPos.x + (sPos.x > pPos.x ? -0.28 : 0.28);
          const pullTargetZ = sPos.z + 0.22;
          pPos.x = THREE.MathUtils.lerp(pPos.x, THREE.MathUtils.clamp(pullTargetX, -2.15, 2.15), 0.06 * dt * 60);
          pPos.z = THREE.MathUtils.lerp(pPos.z, THREE.MathUtils.clamp(pullTargetZ, 1.15, 5.75), 0.06 * dt * 60);
        }
      }
    }

    // Di chuyển người chơi theo phím hoặc Joystick (chỉ trong pha cầu RALLY - chuẩn BWF Law 9 giữ vị trí khi giao cầu)
    const moveDir = { x: 0, z: 0 };
    if (this.state === 'RALLY') {
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveDir.x -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) moveDir.x += 1;
      if (this.keys['KeyW'] || this.keys['ArrowUp']) moveDir.z -= 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) moveDir.z += 1;

      if (this.virtualJoystickDir.x !== 0 || this.virtualJoystickDir.z !== 0) {
        moveDir.x = this.virtualJoystickDir.x;
        moveDir.z = this.virtualJoystickDir.z;
      }

      if (moveDir.x !== 0 && moveDir.z !== 0) {
        const len = Math.hypot(moveDir.x, moveDir.z);
        moveDir.x /= len;
        moveDir.z /= len;
      }

      this.player.update(dt, moveDir);
    } else {
      this.player.update(dt, { x: 0, z: 0 });
    }

    // Gửi vị trí qua mạng nếu đang đánh Online
    if (this.isMultiplayer && (moveDir.x !== 0 || moveDir.z !== 0 || this.player.state !== 'idle')) {
      network.sendMove(this.player.group.position.x, this.player.group.position.z, this.player.state);
    }

    // 2. TỰ ĐỘNG TÌM KHOẢNG TRỐNG (Smart Auto-Aiming):
    // Nếu người chơi chủ động giữ phím A/D hoặc Joystick ngang -> Điều khiển hướng ngắm thủ công
    if (moveDir.x !== 0) {
      this.aimTarget.x += moveDir.x * 4.5 * dt;
    } else if (this.state === 'RALLY' || this.state === 'SERVE') {
      // Khi không giữ phím hướng nào, AI tự động phân tích vị trí đối thủ:
      // nếu đối thủ lệch bên phải, quả cầu tự động vung chéo sang góc trống bên trái và ngược lại!
      let openSpaceX = 0;
      if (!this.isDoubles) {
        const botX = this.bot.group.position.x;
        if (botX > 0.1) {
          openSpaceX = -1.75;
        } else if (botX < -0.1) {
          openSpaceX = 1.75;
        } else {
          openSpaceX = (this.player.group.position.x > 0) ? -1.75 : 1.75;
        }
      } else {
        const b1X = this.bot.group.position.x;
        const b2X = this.bot2 ? this.bot2.group.position.x : 0;
        const avgX = (b1X + b2X) / 2;
        if (avgX > 0.15) {
          openSpaceX = -1.75;
        } else if (avgX < -0.15) {
          openSpaceX = 1.75;
        } else {
          openSpaceX = (Math.abs(b1X - b2X) > 1.8) ? 0 : ((this.player.group.position.x > 0) ? -1.75 : 1.75);
        }
      }

      // Nội suy mượt mà điểm ngắm vào góc trống đối thủ
      this.aimTarget.x = THREE.MathUtils.lerp(this.aimTarget.x, openSpaceX, Math.min(1.0, 4.0 * dt));
    }

    // ĐIỂM NGẮM LUÔN ĐƯỢC KHÓA AN TOÀN TRONG SÂN (Triệt tiêu 100% tình trạng cầu bay ra ngoài)
    this.aimTarget.x = THREE.MathUtils.clamp(this.aimTarget.x, -2.05, 2.05);
    this.aimReticle.position.copy(this.aimTarget);
    this.aimReticle.visible = (this.state === 'RALLY' || this.state === 'SERVE');

    // Chuyển đổi góc camera mượt mà:
    // Khi ở Màn hình chờ (MENU) hoặc lúc hết game (GAMEOVER) -> Quay về màn hình chéo 3/4 Isometric đặc trưng
    // Khi đang trong trận đấu (SERVE, RALLY, POINT) -> Camera sau lưng người chơi nhìn thẳng như Màn 2
    const isLobby = (this.state === 'MENU' || this.state === 'GAMEOVER');
    const targetCamPos = isLobby ? this.lobbyCamPos : this.matchCamPos;
    const targetLookAt = isLobby ? this.lobbyCamLookAt : this.matchCamLookAt;

    // Tốc độ nội suy mượt mà phụ thuộc dt (phản hồi dứt khoát, mượt mà 100% trên cả 60Hz, 120Hz ProMotion và thiết bị yếu)
    const camLerpFactor = 1.0 - Math.exp(-6.5 * dt);
    this.currentCamPos.lerp(targetCamPos, camLerpFactor);
    this.currentCamLookAt.lerp(targetLookAt, camLerpFactor);

    if (this.currentCamPos.distanceTo(targetCamPos) < 0.005) {
      this.currentCamPos.copy(targetCamPos);
    }
    if (this.currentCamLookAt.distanceTo(targetLookAt) < 0.005) {
      this.currentCamLookAt.copy(targetLookAt);
    }

    if (this.shakeIntensity > 0) {
      this.camera.position.x = this.currentCamPos.x + (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y = this.currentCamPos.y + (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.z = this.currentCamPos.z;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 2.5);
    } else {
      this.camera.position.copy(this.currentCamPos);
    }
    this.camera.lookAt(this.currentCamLookAt);
  }

  // Khôi phục vị trí các nhân vật khi về sảnh chính hoặc hết trận
  resetLobbyPositions() {
    this.player.group.position.set(0.5, 0, 4.2);
    this.player.group.rotation.y = Math.PI;
    this.player.state = 'idle';
    this.player.velocity.set(0, 0, 0);

    this.bot.group.position.set(-0.8, 0, -4.2);
    this.bot.group.rotation.y = 0;
    this.bot.state = 'idle';
    this.bot.velocity.set(0, 0, 0);

    if (this.teammate) {
      this.teammate.group.visible = false;
      this.teammate.group.position.set(-1.2, 0, 3.2);
      this.teammate.group.rotation.y = Math.PI;
      this.teammate.state = 'idle';
      this.teammate.velocity.set(0, 0, 0);
    }

    if (this.bot2) {
      this.bot2.group.visible = false;
      this.bot2.group.position.set(1.0, 0, -3.2);
      this.bot2.group.rotation.y = 0;
      this.bot2.state = 'idle';
      this.bot2.velocity.set(0, 0, 0);
    }

    this.shuttlecock.ground();
    this.shuttlecock.position.set(0.85, 1.05, 4.2);
    this.shuttlecock.velocity.set(0, 0, 0);
    this.shuttlecock.isAirborne = false;
    if (this.shuttlecock.trailLine) this.shuttlecock.trailLine.visible = false;
    if (this.shuttlecock.indicatorGroup) this.shuttlecock.indicatorGroup.visible = false;
    if (this.aimReticle) this.aimReticle.visible = false;
  }

  // Quay về Sảnh chính hoàn chỉnh & triệt tiêu mọi xung đột trạng thái
  returnToMenu() {
    // 1. Huỷ triệt để toàn bộ các timeout đang chờ để không bị gọi đè lại SERVE hay RALLY
    if (this.pointTimeout) { clearTimeout(this.pointTimeout); this.pointTimeout = null; }
    if (this.botServeTimeout) { clearTimeout(this.botServeTimeout); this.botServeTimeout = null; }
    if (this.gameOverTimeout) { clearTimeout(this.gameOverTimeout); this.gameOverTimeout = null; }
    if (this.serveTimeout) { clearTimeout(this.serveTimeout); this.serveTimeout = null; }

    // 2. Thiết lập trạng thái chắc chắn là MENU
    this.state = 'MENU';
    this.stateTimer = 0;
    this.bufferedAction = null;
    this.shakeIntensity = 0;
    this.keys = {};
    this.virtualJoystickDir = { x: 0, z: 0 };

    // 3. Thoát trận Online và huỷ đánh đôi
    if (this.isMultiplayer) {
      try { network.leaveRoom(); } catch (e) {}
      this.isMultiplayer = false;
      this.serverSlot = 0;
    }
    this.isDoubles = false;

    // 4. Khôi phục vị trí các nhân vật về trạng thái sảnh chờ
    this.resetLobbyPositions();
  }
}
