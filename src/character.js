import * as THREE from 'three';

export class Character {
  constructor({
    color = 0xf59e0b,
    secondaryColor = 0xffedd5,
    name = 'Player',
    isPlayer = true,
    initialPos = new THREE.Vector3(0, 0, 4.5)
  }) {
    this.name = name;
    this.isPlayer = isPlayer;
    this.group = new THREE.Group();
    this.initialPos = initialPos.clone();
    this.group.position.copy(initialPos);

    // Thuộc tính di chuyển & trạng thái
    this.speed = 8.0;
    this.velocity = new THREE.Vector3();
    this.state = 'idle'; // 'idle', 'run', 'swing', 'smash', 'dive', 'celebrate'
    this.stateTime = 0;
    this.jumpY = 0;
    this.jumpVelocity = 0;
    this.isGrounded = true;

    // Hướng nhìn về phía lưới (Player ở Z > 0 nhìn về -Z, Bot ở Z < 0 nhìn về +Z)
    // Vì mô hình được dựng với mặt hướng về +Z trong tọa độ local:
    // - Player quay mặt về -Z cần xoay 180 độ (Math.PI)
    // - Bot quay mặt về +Z thì giữ nguyên 0 độ (0)
    this.facingZ = isPlayer ? -1 : 1;
    this.baseRotationY = isPlayer ? Math.PI : 0;
    this.group.rotation.y = this.baseRotationY;

    this.buildModel(color, secondaryColor);
  }

  buildModel(primaryColor, secondaryColor) {
    // 1. Thân chính (Body chibi)
    const bodyGeo = new THREE.SphereGeometry(0.38, 16, 16);
    bodyGeo.scale(1, 1.15, 0.9);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      roughness: 0.45
    });
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.bodyMesh.position.y = 0.55;
    this.bodyMesh.castShadow = true;
    this.group.add(this.bodyMesh);

    // Yếm ngực màu phụ sáng (Belly patch)
    const bellyGeo = new THREE.SphereGeometry(0.24, 12, 12);
    bellyGeo.scale(0.85, 1, 0.4);
    const bellyMat = new THREE.MeshStandardMaterial({ color: secondaryColor, roughness: 0.55 });
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.position.set(0, -0.05, 0.28);
    this.bodyMesh.add(belly);

    // 2. Đầu to dễ thương (Chibi Head)
    const headGeo = new THREE.SphereGeometry(0.42, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.4 });
    this.headMesh = new THREE.Mesh(headGeo, headMat);
    this.headMesh.position.set(0, 0.5, 0.05);
    this.headMesh.castShadow = true;
    this.bodyMesh.add(this.headMesh);

    // Mắt to long lanh (Eyes with white highlight)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const eyeHighlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 10), eyeMat);
      eye.position.set(side * 0.17, 0.08, 0.36);

      const sparkle = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 6), eyeHighlightMat);
      sparkle.position.set(side * 0.02, 0.025, 0.05);
      eye.add(sparkle);
      this.headMesh.add(eye);

      // Tai thú (Ears)
      const earGeo = new THREE.ConeGeometry(0.14, 0.3, 8);
      const earMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.45 });
      const ear = new THREE.Mesh(earGeo, earMat);
      ear.position.set(side * 0.28, 0.42, 0);
      ear.rotation.z = -side * 0.35;
      ear.rotation.x = -0.15;
      this.headMesh.add(ear);

      // Má hồng dễ thương (Blush cheeks)
      const blushMat = new THREE.MeshBasicMaterial({ color: 0xf472b6 });
      const blush = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), blushMat);
      blush.scale.set(1.2, 0.6, 0.2);
      blush.position.set(side * 0.26, -0.05, 0.33);
      this.headMesh.add(blush);
    }

    // Mõm & Mũi (Snout & Nose)
    const snout = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 10),
      new THREE.MeshStandardMaterial({ color: secondaryColor, roughness: 0.55 })
    );
    snout.scale.set(1.2, 0.8, 1);
    snout.position.set(0, -0.02, 0.38);
    this.headMesh.add(snout);

    const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeMat);
    noseTip.position.set(0, 0.04, 0.48);
    this.headMesh.add(noseTip);

    // 3. Tay cầm vợt (Right arm & Badminton racket)
    this.armPivot = new THREE.Group();
    this.armPivot.position.set(0.42, 0.15, 0.1);
    this.bodyMesh.add(this.armPivot);

    const armGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.32, 8);
    const armMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.5 });
    const arm = new THREE.Mesh(armGeo, armMat);
    arm.position.y = -0.15;
    this.armPivot.add(arm);

    // Vợt cầu lông (Racket)
    this.racketGroup = new THREE.Group();
    this.racketGroup.position.set(0, -0.3, 0.15);

    // Cán vợt (Grip đỏ)
    const gripGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.22, 8);
    const gripMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.7 });
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.position.y = 0.1;
    this.racketGroup.add(grip);

    // Đũa vợt (Shaft)
    const shaftGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.4, 8);
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.y = 0.4;
    this.racketGroup.add(shaft);

    // Khung vợt (Frame)
    const frameGeo = new THREE.TorusGeometry(0.19, 0.018, 8, 24);
    frameGeo.scale(1, 1.25, 1);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.25 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.y = 0.78;
    this.racketGroup.add(frame);

    // Mặt lưới vợt (Strings)
    const stringCanvas = document.createElement('canvas');
    stringCanvas.width = 64;
    stringCanvas.height = 64;
    const sctx = stringCanvas.getContext('2d');
    sctx.fillStyle = 'rgba(255,255,255,0.0)';
    sctx.fillRect(0, 0, 64, 64);
    sctx.strokeStyle = 'rgba(255,255,255,0.85)';
    sctx.lineWidth = 2.5;
    for (let i = 0; i <= 64; i += 8) {
      sctx.beginPath();
      sctx.moveTo(i, 0);
      sctx.lineTo(i, 64);
      sctx.stroke();
      sctx.beginPath();
      sctx.moveTo(0, i);
      sctx.lineTo(64, i);
      sctx.stroke();
    }
    const stringTex = new THREE.CanvasTexture(stringCanvas);
    stringTex.wrapS = THREE.RepeatWrapping;
    stringTex.wrapT = THREE.RepeatWrapping;
    stringTex.repeat.set(4, 5);

    const stringMesh = new THREE.Mesh(
      new THREE.CircleGeometry(0.18, 16),
      new THREE.MeshBasicMaterial({ map: stringTex, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    stringMesh.scale.set(1, 1.25, 1);
    stringMesh.position.y = 0.78;
    this.racketGroup.add(stringMesh);

    this.racketGroup.rotation.x = Math.PI / 4;
    this.armPivot.add(this.racketGroup);

    // 4. Chân nhấp nhô (Feet)
    this.feet = [];
    for (const side of [-1, 1]) {
      const footGeo = new THREE.SphereGeometry(0.1, 8, 8);
      footGeo.scale(1, 0.6, 1.4);
      const footMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
      const foot = new THREE.Mesh(footGeo, footMat);
      foot.position.set(side * 0.2, 0.08, 0);
      foot.castShadow = true;
      this.group.add(foot);
      this.feet.push(foot);
    }

    // 5. Bóng râm dưới sàn (Ground shadow)
    const shadowGeo = new THREE.PlaneGeometry(1.0, 1.0);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 64;
    shadowCanvas.height = 64;
    const shctx = shadowCanvas.getContext('2d');
    const grad = shctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(15, 30, 20, 0.45)');
    grad.addColorStop(1, 'rgba(15, 30, 20, 0.0)');
    shctx.fillStyle = grad;
    shctx.fillRect(0, 0, 64, 64);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);

    this.shadowMesh = new THREE.Mesh(
      shadowGeo,
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
    );
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = 0.005;
    this.group.add(this.shadowMesh);
  }

  playAction(action) {
    if (this.state === 'smash' || this.state === 'dive') {
      if (this.stateTime < 0.35) return false;
    }
    this.state = action;
    this.stateTime = 0;

    if (action === 'smash') {
      this.jumpVelocity = 8.2;
      this.isGrounded = false;
    } else if (action === 'dive') {
      this.velocity.z = this.facingZ * 13;
      this.jumpVelocity = 2.4;
      this.isGrounded = false;
    }
    return true;
  }

  update(dt, inputDir = null) {
    this.stateTime += dt;

    if (inputDir && (inputDir.x !== 0 || inputDir.z !== 0)) {
      if (this.state !== 'dive' && this.state !== 'smash') {
        this.velocity.x = inputDir.x * this.speed;
        this.velocity.z = inputDir.z * this.speed;
        if (this.state === 'idle') this.state = 'run';
      }
    } else {
      if (this.state === 'run') this.state = 'idle';
      this.velocity.x *= 0.75;
      if (this.state !== 'dive') this.velocity.z *= 0.75;
    }

    if (this.state === 'dive') {
      this.velocity.z *= 0.93;
      if (this.stateTime > 0.45) {
        this.state = 'idle';
      }
    }

    this.group.position.x += this.velocity.x * dt;
    this.group.position.z += this.velocity.z * dt;

    // Giới hạn nửa sân
    const halfW = 2.85;
    this.group.position.x = THREE.MathUtils.clamp(this.group.position.x, -halfW, halfW);

    if (this.isPlayer) {
      this.group.position.z = THREE.MathUtils.clamp(this.group.position.z, 0.7, 6.5);
    } else {
      this.group.position.z = THREE.MathUtils.clamp(this.group.position.z, -6.5, -0.7);
    }

    // Nhảy
    if (!this.isGrounded) {
      this.jumpY += this.jumpVelocity * dt;
      this.jumpVelocity -= 24 * dt;
      if (this.jumpY <= 0) {
        this.jumpY = 0;
        this.jumpVelocity = 0;
        this.isGrounded = true;
        if (this.state === 'smash') this.state = 'idle';
      }
    }

    this.bodyMesh.position.y = 0.55 + this.jumpY;

    const shadowScale = Math.max(0.3, 1 - this.jumpY * 0.4);
    this.shadowMesh.scale.set(shadowScale, shadowScale, shadowScale);

    this.animate(dt);
  }

  animate(dt) {
    const time = this.stateTime;

    // Hướng nhìn chuẩn đối diện qua lưới
    // Người chơi (Player) xoay nhìn về -Z (Math.PI)
    // Đối thủ (Bot) xoay nhìn về +Z (0)
    let targetRotY = this.baseRotationY;

    // Nghiêng nhẹ khi rẽ trái/phải khi chạy
    if (this.state === 'run' && Math.abs(this.velocity.x) > 0.5) {
      const turnAngle = this.isPlayer ? (-this.velocity.x * 0.05) : (this.velocity.x * 0.05);
      targetRotY += turnAngle;
    }

    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetRotY, dt * 10);

    if (this.state === 'idle') {
      this.bodyMesh.scale.y = 1.15 + Math.sin(time * 6) * 0.03;
      this.armPivot.rotation.x = Math.sin(time * 4) * 0.15;
      this.armPivot.rotation.z = 0;
      this.feet[0].position.y = 0.08;
      this.feet[1].position.y = 0.08;
    } else if (this.state === 'run') {
      this.bodyMesh.rotation.z = Math.sin(time * 14) * 0.15;
      this.feet[0].position.y = 0.08 + Math.max(0, Math.sin(time * 14) * 0.12);
      this.feet[1].position.y = 0.08 + Math.max(0, -Math.sin(time * 14) * 0.12);
      this.armPivot.rotation.x = Math.sin(time * 14) * 0.5;
    } else if (this.state === 'swing') {
      const progress = Math.min(time / 0.25, 1);
      if (progress < 0.35) {
        this.armPivot.rotation.x = -Math.PI * 0.45 * (progress / 0.35);
        this.armPivot.rotation.y = 0.4;
      } else {
        const fProg = (progress - 0.35) / 0.65;
        this.armPivot.rotation.x = -Math.PI * 0.45 + Math.PI * 1.35 * fProg;
        this.armPivot.rotation.y = -0.6 * fProg;
      }
      if (time > 0.3) this.state = 'idle';
    } else if (this.state === 'smash') {
      const progress = Math.min(time / 0.4, 1);
      if (progress < 0.4) {
        this.armPivot.rotation.x = -Math.PI * 0.8;
        this.bodyMesh.rotation.x = -0.3;
      } else {
        const sProg = (progress - 0.4) / 0.6;
        this.armPivot.rotation.x = -Math.PI * 0.8 + Math.PI * 1.65 * sProg;
        this.bodyMesh.rotation.x = 0.45 * sProg;
      }
    } else if (this.state === 'dive') {
      this.bodyMesh.rotation.x = 1.1;
      this.bodyMesh.position.y = 0.25;
      this.armPivot.rotation.x = Math.PI * 0.6;
    } else if (this.state === 'celebrate') {
      this.bodyMesh.position.y = 0.55 + Math.abs(Math.sin(time * 10)) * 0.45;
      this.armPivot.rotation.x = -Math.PI * 0.7 + Math.sin(time * 12) * 0.35;
      this.group.rotation.y += dt * 4;
    }
  }
}
