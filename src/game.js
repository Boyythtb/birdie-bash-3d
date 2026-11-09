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
    this.multiplayerSlot = 0; // 0: Player 1 (Sân dưới, Z>0), 1: Player 2 (Sân trên, Z<0)

    // Tỷ số & Trạng thái trận đấu
    this.playerScore = 0;
    this.botScore = 0;
    this.targetScore = 7;
    this.rallyCount = 0;
    this.maxRally = 0;
    this.currentServer = 'player';
    this.state = 'MENU';
    this.stateTimer = 0;

    // Rung lắc camera (Screen Shake)
    this.shakeIntensity = 0;
    this.bufferedAction = null;

    // 1. Góc nhìn Lobby (Isometric 3/4 góc chéo ấm áp chuẩn Birdie Bash khi ở Màn hình chờ)
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

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (this.state === 'SERVE' && (e.code === 'Space' || e.code === 'KeyJ')) {
        if (!this.isMultiplayer && this.currentServer === 'player') {
          this.playerServe();
        } else if (this.isMultiplayer) {
          if ((this.multiplayerSlot === 0 && this.currentServer === 'player') || (this.multiplayerSlot === 1 && this.currentServer === 'bot')) {
            this.playerServe();
          }
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
      if (e.target.closest('#main-menu') || e.target.closest('#game-over-modal') || e.target.closest('.action-buttons') || e.target.closest('.hud-hint-btn') || e.target.closest('.modal-overlay')) {
        return;
      }
      if (this.state === 'SERVE') {
        if (!this.isMultiplayer && this.currentServer === 'player') {
          this.playerServe();
        } else if (this.isMultiplayer) {
          if ((this.multiplayerSlot === 0 && this.currentServer === 'player') || (this.multiplayerSlot === 1 && this.currentServer === 'bot')) {
            this.playerServe();
          }
        }
      } else if (this.state === 'RALLY') {
        this.attemptSmartHit();
      }
    });
  }

  setupMultiplayerListeners() {
    // 1. Đối thủ di chuyển
    network.on('remoteMove', (data) => {
      if (!this.isMultiplayer) return;
      if (data.slot !== this.multiplayerSlot) {
        this.bot.group.position.x = data.x;
        this.bot.group.position.z = data.z;
        if (data.state && this.bot.state !== data.state) {
          this.bot.playAction(data.state);
        }
      }
    });

    // 2. Đối thủ đánh cầu
    network.on('remoteHit', (data) => {
      if (!this.isMultiplayer) return;
      if (data.slot !== this.multiplayerSlot) {
        this.bot.playAction(data.shotType === 'smash' ? 'smash' : 'swing');
        sounds.playHit(data.shotType === 'smash');
        this.particles.emitHit(this.shuttlecock.position, data.shotType === 'smash' ? 28 : 16, data.shotType === 'smash');

        const fromPos = new THREE.Vector3(data.from.x, data.from.y, data.from.z);
        const vel = new THREE.Vector3(data.velocity.x, data.velocity.y, data.velocity.z);

        this.shuttlecock.hit({
          from: fromPos,
          velocity: vel,
          hitter: 'bot',
          shotType: data.shotType
        });

        this.rallyCount++;
        this.notifyUI(data.timing || 'ĐỐI THỦ ĐÁNH!', `Rally: ${this.rallyCount}`, data.shotType === 'smash' ? 'smash' : 'hit');
      }
    });

    // 3. Đồng bộ điểm số
    network.on('remoteScore', (data) => {
      if (!this.isMultiplayer) return;
      this.playerScore = data.team1Score;
      this.botScore = data.team2Score;
      sounds.playWhistle();
      this.notifyUI('ĐIỂM SỐ ONLINE!', data.reason || '', 'info');
    });
  }

  startGame(difficulty = 'pro', mode = 'bot', yourSlot = 0) {
    this.gameMode = mode;
    this.isMultiplayer = mode.startsWith('online');
    this.isDoubles = mode.includes('2v2');
    this.multiplayerSlot = yourSlot;
    this.playerScore = 0;
    this.botScore = 0;
    this.rallyCount = 0;
    this.maxRally = 0;
    this.currentServer = 'player';

    // Bật/tắt nhân vật đánh đôi
    if (this.teammate) this.teammate.group.visible = this.isDoubles;
    if (this.bot2) this.bot2.group.visible = this.isDoubles;

    // Thông báo chế độ
    if (this.isDoubles) {
      this.notifyUI('CHẾ ĐỘ ĐÁNH ĐÔI 2 VS 2! 👥', 'Phối hợp cùng đồng đội bao quát toàn bộ sân!', 'info');
    }

    this.setupServe();
  }

  setupServe() {
    this.state = 'SERVE';
    this.stateTimer = 0;
    this.rallyCount = 0;

    // LUẬT CẦU LÔNG CHUẨN QUỐC TẾ BWF (EVEN / ODD SERVICE BOX):
    // Điểm số CHẴN (0, 2, 4...) -> Đứng ở ô giao cầu bên PHẢI
    // Điểm số LẺ (1, 3, 5...) -> Đứng ở ô giao cầu bên TRÁI
    const serverScore = this.currentServer === 'player' ? this.playerScore : this.botScore;
    const isEven = (serverScore % 2 === 0);

    let playerX, botX;
    if (this.currentServer === 'player') {
      playerX = isEven ? 1.15 : -1.15; // Player phát bên phải nếu chẵn, bên trái nếu lẻ
      botX = isEven ? -1.15 : 1.15;    // Đối thủ đứng chéo sân đón cầu
    } else {
      botX = isEven ? -1.15 : 1.15;    // Bot phát bên phải nếu chẵn, bên trái nếu lẻ
      playerX = isEven ? 1.15 : -1.15; // Player đứng chéo sân đón cầu
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
    if (this.currentServer === 'player') {
      this.shuttlecock.position.set(playerX + (isEven ? 0.35 : -0.35), 1.05, 4.25);
      const sideText = isEven ? 'Ô PHẢI (Điểm chẵn)' : 'Ô TRÁI (Điểm lẻ)';
      this.notifyUI('BẠN PHÁT CẦU 🏸', `${sideText} · Bấm [ĐÁNH CẦU] để phát chéo sân`, 'info');
    } else {
      this.shuttlecock.position.set(botX + (isEven ? -0.35 : 0.35), 1.05, -4.25);
      const sideText = isEven ? 'Ô PHẢI (Điểm chẵn)' : 'Ô TRÁI (Điểm lẻ)';
      this.notifyUI('ĐỐI THỦ PHÁT CẦU 🤖', `Đối thủ phát từ ${sideText} · Chuẩn bị!`, 'warning');

      if (!this.isMultiplayer) {
        setTimeout(() => {
          if (this.state === 'SERVE' && this.currentServer === 'bot') {
            this.botServe();
          }
        }, 1100);
      }
    }
  }

  playerServe() {
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
      if (!this.isMultiplayer && this.currentServer === 'player') {
        this.playerServe();
      } else if (this.isMultiplayer && ((this.multiplayerSlot === 0 && this.currentServer === 'player') || (this.multiplayerSlot === 1 && this.currentServer === 'bot'))) {
        this.playerServe();
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
    const maxReach = actionType === 'dive' ? 3.85 : (actionType === 'smash' ? 2.65 : 2.35);
    return distXZ <= maxReach && height >= 0.05 && height <= 4.5 && s.position.z > 0.05;
  }

  attemptSmartHit() {
    this.handlePlayerAction('hit');
  }

  attemptPlayerDive() {
    this.handlePlayerAction('dive');
  }

  attemptPlayerHit(type) {
    this.handlePlayerAction(type);
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
    this.rallyCount++;

    // 1. CỨU CẦU (Dive)
    if (actionType === 'dive') {
      const slideTargetX = THREE.MathUtils.clamp(s.position.x, -2.1, 2.1);
      const slideTargetZ = THREE.MathUtils.clamp(s.position.z + 0.3, 1.2, 5.8);
      this.player.group.position.x = THREE.MathUtils.lerp(pPos.x, slideTargetX, 0.85);
      this.player.group.position.z = THREE.MathUtils.lerp(pPos.z, slideTargetZ, 0.85);
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

    // 2. SMASH (Đập Cầu Cắm Sàn)
    if (actionType === 'smash') {
      this.player.playAction('smash');
      sounds.playHit(true);
      this.shakeIntensity = 0.55;
      this.particles.emitHit(s.position, 36, true);

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

      this.notifyUI('💥 SIÊU SMASH ĐẬP CẮM SÀN! 🔥', `Rally: ${this.rallyCount} chạm`, 'smash');
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
      s.ground();
      sounds.playFloorTap();
      sounds.playWhistle();

      const landX = s.position.x;
      const landZ = s.position.z;

      const halfWidth = this.isDoubles ? COURT.HALF_WIDTH : COURT.HALF_SINGLES_WIDTH;
      const isInWidth = Math.abs(landX) <= halfWidth;
      const isInLength = Math.abs(landZ) <= COURT.HALF_LENGTH;
      const isInside = isInWidth && isInLength;

      // LUẬT PHÁT CẦU (BWF SERVICE RULES):
      if (s.shotType === 'serve') {
        const isShortServe = Math.abs(landZ) < COURT.SHORT_SERVICE_Z;
        if (isShortServe) {
          // Lỗi phát cầu ngắn (không qua vạch giao cầu ngắn 1.98m)
          const winner = s.lastHitter === 'player' ? 'bot' : 'player';
          this.onPointScored(winner, 'LỖI PHÁT CẦU NGẮN! (SHORT SERVICE FAULT)');
          return;
        }

        // Kiểm tra phát chéo sân:
        const hitterWasPlayer = s.lastHitter === 'player';
        const serverX = hitterWasPlayer ? this.player.group.position.x : this.bot.group.position.x;
        const serverWasRight = hitterWasPlayer ? (serverX > 0) : (serverX < 0);
        // Nếu phát từ ô phải -> cầu phải rơi sang ô phải của đối phương:
        const landedRightCourt = hitterWasPlayer ? (landX < 0) : (landX > 0);
        if (serverWasRight !== landedRightCourt) {
          const winner = hitterWasPlayer ? 'bot' : 'player';
          this.onPointScored(winner, 'LỖI PHÁT NHẦM Ô! (WRONG COURT FAULT)');
          return;
        }
      }

      // LUẬT TÍNH ĐIỂM BÌNH THƯỜNG TRONG RALLY:
      if (!isInside) {
        // Cầu bay ra ngoài sân: Bên đánh cầu ra ngoài bị mất điểm
        const winner = s.lastHitter === 'player' ? 'bot' : 'player';
        this.onPointScored(winner, 'CẦU RA NGOÀI! (OUT)');
      } else {
        // Cầu rơi trong sân: Bên không đỡ được cầu bị thua điểm
        const winner = landZ < 0 ? 'player' : 'bot';
        this.onPointScored(winner, 'CẦU TRONG SÂN! (IN POINT)');
      }
    }
  }

  onPointScored(winner, reason) {
    if (this.state === 'POINT' || this.state === 'GAMEOVER') return;
    this.state = 'POINT';
    this.stateTimer = 0;

    if (winner === 'player') {
      this.playerScore++;
      this.currentServer = 'player';
      this.player.playAction('celebrate');
      if (this.teammate && this.isDoubles) this.teammate.playAction('celebrate');
      sounds.playCheer();
      if (this.court && this.court.cheer) this.court.cheer(1.6); // Khán giả reo hò & Trọng tài giơ cờ
      this.notifyUI('BẠN GHI ĐIỂM! 🏸🎉', `${reason} · Tỷ số: ${this.playerScore} - ${this.botScore}`, 'score-player');
    } else {
      this.botScore++;
      this.currentServer = 'bot';
      this.bot.playAction('celebrate');
      this.notifyUI('ĐỐI THỦ GHI ĐIỂM! 🤖', `${reason} · Tỷ số: ${this.playerScore} - ${this.botScore}`, 'score-bot');
    }

    if (this.isMultiplayer) {
      network.sendScore({
        team1Score: this.playerScore,
        team2Score: this.botScore,
        scorerTeam: winner === 'player' ? 1 : 2,
        reason
      });
    }

    if (this.playerScore >= this.targetScore || this.botScore >= this.targetScore) {
      setTimeout(() => {
        this.gameOver(this.playerScore >= this.targetScore ? 'player' : 'bot');
      }, 1500);
    } else {
      setTimeout(() => {
        this.setupServe();
      }, 2000);
    }
  }

  gameOver(winner) {
    this.state = 'GAMEOVER';
    if (winner === 'player') {
      sounds.playCheer();
      this.notifyUI('🏆 BẠN ĐÃ CHIẾN THẮNG! 🏆', `Chiến thắng với tỷ số ${this.playerScore} - ${this.botScore}!`, 'win');
    } else {
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
        state: this.state
      });
    }
  }


  // CHIẾN THUẬT ĐÁNH ĐÔI 2v2 (CÔNG - THỦ PHỐI HỢP LINH HOẠT)
  updateDoubles(dt) {
    if (!this.isDoubles || this.state !== 'RALLY') return;

    const s = this.shuttlecock;
    const p = this.player.group.position;
    const tm = this.teammate;
    const b1 = this.bot;
    const b2 = this.bot2;

    // 1. Đồng đội AI tự động bọc lót theo vị trí của người chơi
    if (tm) {
      let targetZ = 3.2;
      let targetX = -p.x * 0.65;

      if (p.z < 4.0) {
        // Người chơi đang ở trước lưới -> Đồng đội lùi về sau bao quát đáy sân
        targetZ = 5.2;
        targetX = -p.x * 0.8;
      } else {
        // Người chơi đang lùi sâu -> Đồng đội tiến lên bám lưới bắt cầu con
        targetZ = 2.8;
        targetX = -p.x * 0.6;
      }

      // Nếu cầu đang bay sang sân nhà (z > 0)
      if (s.isAirborne && s.velocity.z > 0) {
        const distToPlayer = p.distanceTo(s.position);
        const distToTeammate = tm.group.position.distanceTo(s.position);

        // Nếu quả cầu gần đồng đội hơn hoặc người chơi ở quá xa
        if (distToTeammate < distToPlayer || distToPlayer > 3.2) {
          targetX = THREE.MathUtils.clamp(s.position.x, -2.5, 2.5);
          targetZ = THREE.MathUtils.clamp(s.position.z, 1.8, 5.8);
        }
      }

      const tmPos = tm.group.position;
      tmPos.x = THREE.MathUtils.lerp(tmPos.x, targetX, dt * 4.8);
      tmPos.z = THREE.MathUtils.lerp(tmPos.z, targetZ, dt * 4.8);

      // Đồng đội tự động đỡ cầu khi vào tầm vợt
      const distXZ = new THREE.Vector2(tmPos.x - s.position.x, tmPos.z - s.position.z).length();
      if (s.isAirborne && s.position.z > 0.4 && distXZ < 1.6 && s.position.y > 0.25 && s.position.y < 3.2) {
        tm.playAction(s.position.y > 1.8 ? 'smash' : 'swing');
        sounds.playHit(false);
        this.particles.emitHit(s.position, 14, false);
        this.rallyCount++;

        const targetOppX = (Math.random() - 0.5) * 4.4;
        const targetOppZ = -4.8 + (Math.random() - 0.5) * 1.5;
        const vel = this.calculateTrajectory(s.position, new THREE.Vector3(targetOppX, 0, targetOppZ), 'clear', 0.95);
        s.hit({ from: s.position.clone(), velocity: vel, hitter: 'player', shotType: 'clear' });
        this.notifyUI('ĐỒNG ĐỘI TIẾP CẦU! 🏸', 'Pha phối hợp ăn ý!', 'success');
      }
    }

    // 2. Bot 1 và Bot 2 phối hợp phòng thủ & tấn công
    if (b1 && b2) {
      // Bot 2 bọc lót theo Bot 1
      const b1Pos = b1.group.position;
      const b2Pos = b2.group.position;

      let b2TargetZ = (b1Pos.z > -4.0) ? -5.2 : -2.8;
      let b2TargetX = -b1Pos.x * 0.7;

      if (s.isAirborne && s.velocity.z < 0) {
        const dist1 = b1Pos.distanceTo(s.position);
        const dist2 = b2Pos.distanceTo(s.position);
        if (dist2 < dist1) {
          b2TargetX = THREE.MathUtils.clamp(s.position.x, -2.6, 2.6);
          b2TargetZ = THREE.MathUtils.clamp(s.position.z, -5.8, -1.8);
        }
      }

      b2Pos.x = THREE.MathUtils.lerp(b2Pos.x, b2TargetX, dt * 4.5);
      b2Pos.z = THREE.MathUtils.lerp(b2Pos.z, b2TargetZ, dt * 4.5);

      // Bot 2 đánh trả nếu đến gần
      const distB2 = new THREE.Vector2(b2Pos.x - s.position.x, b2Pos.z - s.position.z).length();
      if (s.isAirborne && s.position.z < -0.4 && distB2 < 1.6 && s.position.y > 0.25 && s.position.y < 3.2) {
        b2.playAction(s.position.y > 1.8 ? 'smash' : 'swing');
        sounds.playHit(false);
        this.particles.emitHit(s.position, 14, false);
        this.rallyCount++;

        const targetPlayerX = (Math.random() - 0.5) * 4.4;
        const targetPlayerZ = 4.8 + (Math.random() - 0.5) * 1.5;
        const vel = this.calculateTrajectory(s.position, new THREE.Vector3(targetPlayerX, 0, targetPlayerZ), 'clear', 0.95);
        s.hit({ from: s.position.clone(), velocity: vel, hitter: 'bot', shotType: 'clear' });
      }
    }
  }

  update(dt) {
    this.stateTimer += dt;

    // TRONG LÚC GIAO CẦU (SERVE):
    // QUẢ CẦU BẮT BUỘC ĐI THEO NGƯỜI PHÁT CẦU - KHÔNG BAO GIỜ BỊ NGƯỜI 1 NƠI CẦU 1 NƠI!
    if (this.state === 'SERVE') {
      if (this.currentServer === 'player') {
        const px = this.player.group.position.x;
        const pz = this.player.group.position.z;
        this.shuttlecock.position.set(
          px + 0.35,
          1.05 + Math.sin(this.stateTimer * 4.5) * 0.04,
          pz - 0.35
        );
        this.shuttlecock.velocity.set(0, 0, 0);
      } else {
        const bx = this.bot.group.position.x;
        const bz = this.bot.group.position.z;
        this.shuttlecock.position.set(
          bx - 0.35,
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
    }

    // Di chuyển người chơi theo phím hoặc Joystick
    const moveDir = { x: 0, z: 0 };
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

    // Gửi vị trí qua mạng nếu đang đánh Online
    if (this.isMultiplayer && (moveDir.x !== 0 || moveDir.z !== 0 || this.player.state !== 'idle')) {
      network.sendMove(this.player.group.position.x, this.player.group.position.z, this.player.state);
    }

    // Cập nhật Hồng tâm ngắm (Aim Reticle)
    if (moveDir.x !== 0) {
      this.aimTarget.x += moveDir.x * 4.5 * dt;
      this.aimTarget.x = THREE.MathUtils.clamp(this.aimTarget.x, -2.1, 2.1);
    }
    this.aimReticle.position.copy(this.aimTarget);
    this.aimReticle.visible = (this.state === 'RALLY' || this.state === 'SERVE');

    // Chuyển đổi góc camera mượt mà:
    // Khi ở Lobby -> Isometric 3/4 góc chéo
    // Khi vào trận (SERVE, RALLY, POINT, GAMEOVER) -> Camera sau lưng người chơi nhìn thẳng như Màn 2
    const targetCamPos = (this.state === 'MENU') ? this.lobbyCamPos : this.matchCamPos;
    const targetLookAt = (this.state === 'MENU') ? this.lobbyCamLookAt : this.matchCamLookAt;

    this.currentCamPos.lerp(targetCamPos, 0.08);
    this.currentCamLookAt.lerp(targetLookAt, 0.08);

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
}
