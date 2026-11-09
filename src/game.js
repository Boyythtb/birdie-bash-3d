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

    // 1. Góc nhìn Lobby & Sân thi đấu (Camera sau lưng người chơi nhìn thẳng sân đấu, cân đối và chuẩn xác)
    this.lobbyCamPos = new THREE.Vector3(0, 8.4, 13.8);
    this.lobbyCamLookAt = new THREE.Vector3(0, 0.6, -0.8);

    // 2. Góc nhìn Trong Trận Đấu (Camera sau lưng người chơi nhìn thẳng sân đấu như Màn 2)
    this.matchCamPos = new THREE.Vector3(0, 8.0, 13.4);
    this.matchCamLookAt = new THREE.Vector3(0, 0.6, -0.8);

    // Vị trí camera động được nội suy mượt mà (Smooth Lerp)
    this.currentCamPos = this.matchCamPos.clone();
    this.currentCamLookAt = this.matchCamLookAt.clone();
    this.defaultCamPos = this.matchCamPos;
    this.defaultCamLookAt = this.matchCamLookAt;

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
        if (data.shotType === 'smash' && this.particles.emitFireSmash) {
          this.particles.emitFireSmash(this.shuttlecock.position, 48);
          this.shakeIntensity = 0.52;
        } else {
          this.particles.emitHit(this.shuttlecock.position, 16, false);
        }

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
      this.rallyCount++;
      const height = s.position.y;
      const startPos = s.position.clone();

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
        this.rallyCount++;
        const height = s.position.y;
        const startPos = s.position.clone();
        const rand = Math.random();

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

      // Hiệu ứng tàn lửa đuôi cầu khi đang bay cú smash tóe lửa
      if (this.shuttlecock.isAirborne && this.shuttlecock.shotType === 'smash' && this.particles.emitSmashTrail) {
        this.particles.emitSmashTrail(this.shuttlecock.position);
      }
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

  // Khôi phục vị trí các nhân vật khi về sảnh chính hoặc hết trận
  // Giữ nguyên góc nhìn thẳng chuẩn thi đấu (không bị nghiêng chéo) và hoạt cảnh nhún nhảy sống động
  resetLobbyPositions() {
    this.player.group.position.set(0, 0, 4.5);
    this.player.group.rotation.y = Math.PI;
    this.player.state = 'idle';
    this.player.velocity.set(0, 0, 0);

    this.bot.group.position.set(0, 0, -4.5);
    this.bot.group.rotation.y = 0;
    this.bot.state = 'idle';
    this.bot.velocity.set(0, 0, 0);

    if (this.teammate) {
      this.teammate.group.position.set(1.2, 0, 3.5);
      this.teammate.group.rotation.y = Math.PI;
      this.teammate.state = 'idle';
      this.teammate.velocity.set(0, 0, 0);
    }

    if (this.bot2) {
      this.bot2.group.position.set(-1.2, 0, -3.5);
      this.bot2.group.rotation.y = 0;
      this.bot2.state = 'idle';
      this.bot2.velocity.set(0, 0, 0);
    }

    this.shuttlecock.ground();
    this.shuttlecock.position.set(0.35, 1.05, 4.15);
  }
}
