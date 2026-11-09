import * as THREE from 'three';

export class BotAI {
  constructor(botCharacter, shuttlecock, difficulty = 'pro') {
    this.bot = botCharacter;
    this.shuttlecock = shuttlecock;
    this.difficulty = difficulty;

    this.homeBase = new THREE.Vector3(0, 0, -4.2);
    this.targetPos = this.homeBase.clone();
    this.reactionTimer = 0;
    this.hasDecidedShot = false;
  }

  setDifficulty(diff) {
    this.difficulty = diff;
    if (diff === 'rookie') {
      this.bot.speed = 5.8;
    } else if (diff === 'pro') {
      this.bot.speed = 7.4;
    } else {
      this.bot.speed = 8.6;
    }
  }

  update(dt, playerPos = null) {
    const pPos = playerPos || new THREE.Vector3(0, 0, 4.5);
    const s = this.shuttlecock;
    const isBallHeadedToBot = s.isAirborne && s.velocity.z < 0;

    if (isBallHeadedToBot) {
      this.reactionTimer += dt;
      const minReaction = this.difficulty === 'rookie' ? 0.22 : this.difficulty === 'pro' ? 0.08 : 0.02;

      if (this.reactionTimer >= minReaction) {
        let targetX = s.predictedLanding.x;
        let targetZ = s.predictedLanding.z;

        if (this.difficulty === 'rookie') {
          targetX += (Math.sin(Date.now() * 0.005)) * 0.45;
        }

        this.targetPos.set(targetX, 0, Math.min(targetZ - 0.35, -0.9));
      }
    } else {
      this.reactionTimer = 0;
      this.hasDecidedShot = false;
      this.targetPos.copy(this.homeBase);
    }

    const toTarget = new THREE.Vector3().subVectors(this.targetPos, this.bot.group.position);
    toTarget.y = 0;
    const dist = toTarget.length();

    let inputDir = null;
    if (dist > 0.15) {
      toTarget.normalize();
      inputDir = toTarget;
    }

    this.bot.update(dt, inputDir);
    this.checkHit(pPos);
  }

  checkHit(playerPos = null) {
    const pPos = playerPos || new THREE.Vector3(0, 0, 4.5);
    const s = this.shuttlecock;
    if (!s.isAirborne || s.velocity.z > 0 || s.lastHitter === 'bot') return;

    const botPos = this.bot.group.position;
    const distXZ = new THREE.Vector2(botPos.x - s.position.x, botPos.z - s.position.z).length();
    const height = s.position.y;

    const canReach = distXZ < 1.65 && height > 0.15 && height < 3.8;

    if (canReach && s.position.z < -0.3) {
      this.executeBotShot(pPos);
    }
  }

  executeBotShot(playerPos = null) {
    const pPos = playerPos || new THREE.Vector3(0, 0, 4.5);
    const s = this.shuttlecock;
    const height = s.position.y;
    const startPos = s.position.clone();

    let shotType = 'clear';
    const rand = Math.random();

    if (this.difficulty === 'ace') {
      if (height > 1.7 && rand < 0.7) {
        shotType = 'smash';
      } else if (pPos.z > 4.8 && rand < 0.55) {
        shotType = 'drop';
      } else {
        shotType = 'clear';
      }
    } else if (this.difficulty === 'pro') {
      if (height > 1.9 && rand < 0.4) {
        shotType = 'smash';
      } else if (rand < 0.25) {
        shotType = 'drop';
      } else {
        shotType = 'clear';
      }
    } else {
      shotType = rand < 0.15 ? 'drop' : 'clear';
    }

    // Chọn điểm rơi trên sân người chơi (Luôn nằm trong khoảng an toàn X: [-2.1, 2.1], Z: [1.2, 5.8])
    let targetX = 0;
    if (this.difficulty !== 'rookie') {
      targetX = pPos.x > 0 ? -1.7 : 1.7;
      targetX += (Math.random() - 0.5) * 0.5;
    } else {
      targetX = (Math.random() - 0.5) * 1.8;
    }
    targetX = THREE.MathUtils.clamp(targetX, -2.1, 2.1);

    let targetZ = 4.8;
    let flightTime = 1.1;
    let targetNetY = 1.85;

    if (shotType === 'smash') {
      this.bot.playAction('smash');
      targetZ = 2.8 + Math.random() * 1.2; // Cắm giữa sân người chơi
      flightTime = 0.38;
      targetNetY = 1.72;
    } else if (shotType === 'drop') {
      this.bot.playAction('swing');
      targetZ = 1.4 + Math.random() * 0.6; // Thả sát lưới
      flightTime = 0.76;
      targetNetY = 1.68;
    } else {
      this.bot.playAction('swing');
      targetZ = 4.8 + Math.random() * 0.9; // Phông sâu cuối sân
      flightTime = 1.25;
      targetNetY = 3.6;
    }

    const g = -14.5;
    const dx = targetX - startPos.x;
    const dz = targetZ - startPos.z;

    const dragFactorZ = 1 + 0.045 * Math.abs(dz);
    const vz = (dz / flightTime) * dragFactorZ;

    const dragFactorX = 1 + 0.045 * Math.abs(dx);
    const vx = (dx / flightTime) * dragFactorX;

    const timeToNet = Math.abs(startPos.z / vz);
    let vy = (targetNetY - startPos.y - 0.5 * g * timeToNet * timeToNet) / timeToNet;

    if (shotType === 'clear') {
      vy = Math.max(vy, 11.2);
    } else if (shotType === 'drop') {
      vy = Math.max(vy, 5.0);
    }

    const vel = new THREE.Vector3(vx, vy, vz);

    s.hit({
      from: startPos,
      velocity: vel,
      hitter: 'bot',
      shotType
    });

    return shotType;
  }
}
