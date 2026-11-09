import * as THREE from 'three';
import { COURT } from './court.js';
import { sounds } from './audio.js';
import { network } from './network.js';

export class GameManager {
  constructor({ scene, camera, player, bot, shuttlecock, particles, onUIUpdate }) {
    this.scene = scene;
    this.camera = camera;
    this.player = player;
    this.bot = bot;
    this.shuttlecock = shuttlecock;
    this.particles = particles;
    this.onUIUpdate = onUIUpdate;

    // Chế độ chơi: 'bot' | 'online-1v1' | 'online-2v2'
    this.gameMode = 'bot';
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
    this.defaultCamPos = new THREE.Vector3(-7.2, 10.5, 13.2);
    this.defaultCamLookAt = new THREE.Vector3(1.0, 0.4, -0.5);

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
    this.multiplayerSlot = yourSlot;
    this.playerScore = 0;
    this.botScore = 0;
    this.rallyCount = 0;
    this.maxRally = 0;
    this.currentServer = 'player';
    this.setupServe();
  }

  setupServe() {
    this.state = 'SERVE';
    this.stateTimer = 0;
    this.rallyCount = 0;

    // Đặt vị trí người chơi và đối thủ
    this.player.group.position.set(1.0, 0, 4.6);
    this.player.state = 'idle';
    this.bot.group.position.set(-1.0, 0, -4.6);
    this.bot.state = 'idle';

    // CẦU LUÔN NẰM NGAY TRÊN TAY NGƯỜI PHÁT CẦU - KHÔNG BAO GIỜ BỊ RỜI NHAU
    this.shuttlecock.ground();
    if (this.currentServer === 'player') {
      this.shuttlecock.position.set(1.35, 1.05, 4.25);
      this.notifyUI('BẠN PHÁT CẦU', 'Chỉ cần nhấn [SPACE] hoặc Click chuột để giao cầu', 'info');
    } else {
      this.shuttlecock.position.set(-1.35, 1.05, -4.25);
      this.notifyUI('ĐỐI THỦ PHÁT CẦU', 'Chuẩn bị đón cầu!', 'warning');

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

    const targetX = THREE.MathUtils.clamp(this.aimTarget.x, -1.9, 1.9);
    const targetZ = -4.8;
    const startPos = this.player.group.position.clone().add(new THREE.Vector3(0.35, 1.1, -0.35));

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

    this.notifyUI('RALLY BẮT ĐẦU!', 'Đang tranh cầu', 'success');
  }

  botServe() {
    this.state = 'RALLY';
    this.bot.playAction('swing');
    sounds.playHit(false);
    this.particles.emitHit(this.shuttlecock.position, 12, false);

    const targetX = (Math.random() - 0.5) * 2.2;
    const targetZ = 4.8;
    const startPos = this.bot.group.position.clone().add(new THREE.Vector3(-0.35, 1.1, 0.35));

    const vel = this.calculateTrajectory(startPos, new THREE.Vector3(targetX, 0, targetZ), 'clear', 0.95);

    this.shuttlecock.hit({
      from: startPos,
      velocity: vel,
      hitter: 'bot',
      shotType: 'serve'
    });
  }

  // CƠ CHẾ ĐÁNH THÔNG MINH THEO NGỮ CẢNH (Contextual Smart Hit)
  attemptSmartHit() {
    const s = this.shuttlecock;
    if (!s.isAirborne || s.lastHitter === 'player') return;

    const pPos = this.player.group.position;
    const distXZ = new THREE.Vector2(pPos.x - s.position.x, pPos.z - s.position.z).length();
    const height = s.position.y;

    // 1. Cầu ở xa (> 1.3m) và sắp tiếp đất -> Tự động Nhoài người Dive cứu cầu!
    if (distXZ > 1.3 && distXZ <= 2.8 && height < 1.15) {
      this.attemptPlayerDive();
      return;
    }

    // 2. Cầu trên cao (height >= 1.35m) -> Tự động BẬT NHẢY SMASH đập cắm sàn cực đã!
    if (height >= 1.35 && distXZ <= 2.3) {
      this.attemptPlayerHit('smash');
      return;
    }

    // 3. Đang đứng sát lưới (pPos.z < 2.2m) và cầu tầm thấp -> Tự động BỎ NHỎ sát lưới (Drop)
    if (pPos.z < 2.2 && height < 1.35 && distXZ <= 2.1) {
      this.attemptPlayerHit('drop');
      return;
    }

    // 4. Mặc định: Phông sâu an toàn
    this.attemptPlayerHit('clear');
  }

  attemptPlayerDive() {
    this.player.playAction('dive');
    sounds.playDive();
    this.particles.emitDust(this.player.group.position);
    this.attemptPlayerHit('clear', true);
  }

  calculateTrajectory(startPos, targetPos, shotType, speedMult = 1.0) {
    const g = -14.5;
    const dx = targetPos.x - startPos.x;
    const dz = targetPos.z - startPos.z;

    let flightTime = 1.1;
    let targetNetY = 1.85;

    if (shotType === 'smash') {
      flightTime = 0.35 / speedMult;
      targetNetY = 1.72;
    } else if (shotType === 'drop') {
      flightTime = 0.72 / speedMult;
      targetNetY = 1.68;
    } else {
      flightTime = 1.25 / speedMult;
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
      vy = Math.max(vy, 5.0);
    }

    return new THREE.Vector3(vx, vy, vz);
  }

  // Người chơi tung cú đánh
  attemptPlayerHit(preferredType = 'clear', isDive = false) {
    const s = this.shuttlecock;
    if (!s.isAirborne || s.lastHitter === 'player') return;

    const pPos = this.player.group.position;
    const distXZ = new THREE.Vector2(pPos.x - s.position.x, pPos.z - s.position.z).length();
    const height = s.position.y;

    const maxReach = isDive ? 2.85 : 2.25;

    if (distXZ <= maxReach && height >= 0.1 && height <= 4.0) {
      // HỖ TRỢ NAM CHÂM VỊ TRÍ (Magnetic Step):
      // Người chơi lướt nhanh về đúng điểm ngọt cạnh quả cầu để vợt chạm cầu chính xác 100%!
      const sweetOffset = 0.35;
      const targetCharX = s.position.x > pPos.x ? s.position.x - sweetOffset : s.position.x + sweetOffset;
      this.player.group.position.x = THREE.MathUtils.lerp(pPos.x, targetCharX, 0.65);
      this.player.group.position.z = THREE.MathUtils.lerp(pPos.z, s.position.z + 0.32, 0.65);

      // CỬA SỔ VÒNG TRÒN TIMING (Perfect / Good / Early)
      const timingRatio = s.initialTimeToLand > 0 ? s.timeToLand / s.initialTimeToLand : 0;
      let timingQuality = 'GOOD! ⚡';
      let speedMult = 1.0;

      if (timingRatio < 0.38 && timingRatio > 0.04) {
        timingQuality = 'PERFECT! 🔥';
        speedMult = 1.25;
        sounds.playTiming(true);
        this.shakeIntensity = preferredType === 'smash' ? 0.55 : 0.25;
      } else if (timingRatio >= 0.65) {
        timingQuality = 'EARLY ⚠️';
        speedMult = 0.9;
      } else {
        timingQuality = 'GOOD! ⚡';
        speedMult = 1.05;
        sounds.playTiming(false);
      }

      let actualShot = preferredType;
      if (preferredType === 'smash') {
        if (height >= 1.35) {
          this.player.playAction('smash');
          sounds.playHit(true);
          this.particles.emitHit(s.position, 32, true);
        } else {
          actualShot = 'clear';
          this.player.playAction('swing');
          sounds.playHit(false);
          this.particles.emitHit(s.position, 16, false);
        }
      } else if (preferredType === 'drop') {
        this.player.playAction('swing');
        sounds.playDrop();
        this.particles.emitHit(s.position, 12, false);
      } else {
        this.player.playAction('swing');
        sounds.playHit(false);
        this.particles.emitHit(s.position, 16, false);
      }

      // ĐIỂM RƠI ĐƯỢC TÍNH TOÁN AN TOÀN TRONG SÂN
      const targetPos = this.aimTarget.clone();

      if (actualShot === 'drop') {
        targetPos.z = THREE.MathUtils.clamp(targetPos.z, -2.0, -1.2);
      } else if (actualShot === 'smash') {
        targetPos.z = THREE.MathUtils.clamp(targetPos.z, -4.5, -2.5);
      } else {
        targetPos.z = THREE.MathUtils.clamp(targetPos.z, -5.8, -4.2);
      }
      targetPos.x = THREE.MathUtils.clamp(targetPos.x, -2.1, 2.1);

      const startPos = s.position.clone();
      const vel = this.calculateTrajectory(startPos, targetPos, actualShot, speedMult);

      s.hit({
        from: startPos,
        velocity: vel,
        hitter: 'player',
        shotType: actualShot
      });

      // BẮN GÓI TIN ĐỒNG BỘ NẾU ĐANG CHƠI ONLINE
      if (this.isMultiplayer) {
        network.sendHit({
          shotType: actualShot,
          from: { x: startPos.x, y: startPos.y, z: startPos.z },
          velocity: { x: vel.x, y: vel.y, z: vel.z },
          target: { x: targetPos.x, y: 0, z: targetPos.z },
          timing: timingQuality
        });
      }

      this.rallyCount++;
      if (this.rallyCount > this.maxRally) this.maxRally = this.rallyCount;

      if (this.rallyCount > 0 && this.rallyCount % 5 === 0) {
        sounds.playCheer();
        this.notifyUI(`🔥 ${this.rallyCount}x RALLY STREAK!`, 'Cực kỳ mãn nhãn!', 'smash');
      } else {
        this.notifyUI(timingQuality, `Rally: ${this.rallyCount} chạm`, actualShot === 'smash' ? 'smash' : 'hit');
      }
    } else {
      this.player.playAction('swing');
      sounds.playSwing();
      this.notifyUI('MISS! ❌', 'Đánh hụt rồi!', 'miss');
    }
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

      const isInWidth = Math.abs(landX) <= COURT.HALF_SINGLES_WIDTH;
      const isInLength = Math.abs(landZ) <= COURT.HALF_LENGTH;
      const isInside = isInWidth && isInLength;

      if (!isInside) {
        const winner = s.lastHitter === 'player' ? 'bot' : 'player';
        this.onPointScored(winner, 'CẦU RA NGOÀI! (OUT)');
      } else {
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
      sounds.playCheer();
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

    // Rung lắc camera (Screen Shake)
    if (this.shakeIntensity > 0) {
      this.camera.position.x = this.defaultCamPos.x + (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y = this.defaultCamPos.y + (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 2.5);
    } else {
      this.camera.position.lerp(this.defaultCamPos, 0.1);
    }
    this.camera.lookAt(this.defaultCamLookAt);
  }
}
