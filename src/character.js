import * as THREE from 'three';

export class Character {
  constructor({
    color = 0xf59e0b,
    secondaryColor = 0xffedd5,
    jerseyColor = 0x0284c7,
    jerseyNumber = '7',
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

    // Hướng nhìn về phía lưới
    this.facingZ = isPlayer ? -1 : 1;
    this.baseRotationY = isPlayer ? Math.PI : 0;
    this.group.rotation.y = this.baseRotationY;

    this.racketSkin = localStorage.getItem('tboy_racket_skin') || 'titan';
    this.buildModel(color, secondaryColor, jerseyColor, jerseyNumber);
    this.setRacketSkin(this.racketSkin);
  }

  buildModel(primaryColor, secondaryColor, jerseyColor, jerseyNumber) {
    // Nhóm xoay thân & đầu
    this.rootNode = new THREE.Group();
    this.group.add(this.rootNode);

    // 1. THÂN CHÍNH (Body)
    const bodyGeo = new THREE.SphereGeometry(0.38, 18, 18);
    bodyGeo.scale(1, 1.15, 0.92);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      roughness: 0.4
    });
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.bodyMesh.position.y = 0.55;
    this.bodyMesh.castShadow = true;
    this.rootNode.add(this.bodyMesh);

    // 2. ÁO THỂ THAO THI ĐẤU (Sports Jersey)
    const jerseyGeo = new THREE.CylinderGeometry(0.39, 0.37, 0.45, 18);
    const jerseyMat = new THREE.MeshStandardMaterial({
      color: jerseyColor,
      roughness: 0.35,
      metalness: 0.05
    });
    this.jerseyMesh = new THREE.Mesh(jerseyGeo, jerseyMat);
    this.jerseyMesh.position.set(0, -0.02, 0);
    this.bodyMesh.add(this.jerseyMesh);

    // Số áo thể thao in sau lưng & trước ngực
    const numCanvas = document.createElement('canvas');
    numCanvas.width = 128;
    numCanvas.height = 128;
    const nctx = numCanvas.getContext('2d');
    nctx.fillStyle = 'rgba(0, 0, 0, 0)';
    nctx.fillRect(0, 0, 128, 128);
    nctx.fillStyle = '#ffffff';
    nctx.font = '900 84px "Segoe UI", Arial, sans-serif';
    nctx.textAlign = 'center';
    nctx.textBaseline = 'middle';
    nctx.fillText(jerseyNumber || '7', 64, 64);
    const numTex = new THREE.CanvasTexture(numCanvas);

    const numBadgeGeo = new THREE.PlaneGeometry(0.24, 0.24);
    const numBadgeMat = new THREE.MeshBasicMaterial({ map: numTex, transparent: true });

    // Số sau lưng (rất dễ thấy khi người chơi điều khiển từ góc camera)
    const backNum = new THREE.Mesh(numBadgeGeo, numBadgeMat);
    backNum.position.set(0, 0, -0.4);
    backNum.rotation.y = Math.PI;
    this.bodyMesh.add(backNum);

    // Yếm ngực màu phụ sáng (Belly patch)
    const bellyGeo = new THREE.SphereGeometry(0.24, 14, 14);
    bellyGeo.scale(0.85, 1, 0.35);
    const bellyMat = new THREE.MeshStandardMaterial({ color: secondaryColor, roughness: 0.55 });
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.position.set(0, -0.05, 0.29);
    this.bodyMesh.add(belly);

    // 3. ĐẦU TO CHIBI DỄ THƯƠNG (Chibi Head)
    const headGeo = new THREE.SphereGeometry(0.44, 20, 20);
    const headMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.35 });
    this.headMesh = new THREE.Mesh(headGeo, headMat);
    this.headMesh.position.set(0, 0.52, 0.05);
    this.headMesh.castShadow = true;
    this.bodyMesh.add(this.headMesh);

    // Băng đô thể thao trên trán (Sports Headband)
    const bandGeo = new THREE.CylinderGeometry(0.445, 0.445, 0.08, 20);
    const bandMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const headband = new THREE.Mesh(bandGeo, bandMat);
    headband.position.set(0, 0.12, 0);
    this.headMesh.add(headband);

    // Sọc viền đỏ trên băng đô
    const bandStripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.448, 0.448, 0.025, 20),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    bandStripe.position.set(0, 0.12, 0);
    this.headMesh.add(bandStripe);

    // Mắt to long lanh (Eyes with white highlight sparkle)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const eyeHighlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.072, 12, 12), eyeMat);
      eye.position.set(side * 0.18, 0.08, 0.37);

      const sparkle = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), eyeHighlightMat);
      sparkle.position.set(side * 0.02, 0.025, 0.052);
      eye.add(sparkle);
      this.headMesh.add(eye);

      // Tai thú (Ears)
      const earGeo = new THREE.ConeGeometry(0.15, 0.32, 10);
      const earMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.45 });
      const ear = new THREE.Mesh(earGeo, earMat);
      ear.position.set(side * 0.28, 0.44, 0);
      ear.rotation.z = -side * 0.35;
      ear.rotation.x = -0.15;
      this.headMesh.add(ear);

      // Vành trong tai màu hồng phấn
      const innerEar = new THREE.Mesh(
        new THREE.ConeGeometry(0.09, 0.22, 8),
        new THREE.MeshBasicMaterial({ color: 0xfda4af })
      );
      innerEar.position.set(0, -0.02, 0.06);
      innerEar.rotation.x = 0.1;
      ear.add(innerEar);

      // Má hồng dễ thương (Blush cheeks)
      const blushMat = new THREE.MeshBasicMaterial({ color: 0xf472b6 });
      const blush = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), blushMat);
      blush.scale.set(1.2, 0.6, 0.2);
      blush.position.set(side * 0.28, -0.06, 0.35);
      this.headMesh.add(blush);
    }

    // Mõm & Mũi (Snout & Nose)
    const snout = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 12, 12),
      new THREE.MeshStandardMaterial({ color: secondaryColor, roughness: 0.55 })
    );
    snout.scale.set(1.2, 0.85, 1);
    snout.position.set(0, -0.02, 0.4);
    this.headMesh.add(snout);

    const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), eyeMat);
    noseTip.position.set(0, 0.04, 0.51);
    this.headMesh.add(noseTip);

    // Đuôi lắc lư phía sau (Cute Wagging Tail)
    this.tailPivot = new THREE.Group();
    this.tailPivot.position.set(0, -0.22, -0.38);
    const tailGeo = new THREE.ConeGeometry(0.08, 0.28, 8);
    const tailMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.5 });
    const tailMesh = new THREE.Mesh(tailGeo, tailMat);
    tailMesh.position.set(0, 0.12, -0.08);
    tailMesh.rotation.x = -0.8;
    this.tailPivot.add(tailMesh);
    this.bodyMesh.add(this.tailPivot);

    // 4. TAY CẦM VỢT CHUYÊN NGHIỆP (Arm & Pro Racket)
    this.armPivot = new THREE.Group();
    this.armPivot.position.set(0.44, 0.14, 0.12);
    this.bodyMesh.add(this.armPivot);

    const armGeo = new THREE.CylinderGeometry(0.075, 0.065, 0.34, 8);
    const armMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.5 });
    const arm = new THREE.Mesh(armGeo, armMat);
    arm.position.y = -0.16;
    this.armPivot.add(arm);

    // Băng cổ tay thể thao (Wristband)
    const wristband = new THREE.Mesh(
      new THREE.CylinderGeometry(0.078, 0.078, 0.07, 10),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
    );
    wristband.position.y = -0.26;
    this.armPivot.add(wristband);

    // Vợt cầu lông (Racket Group)
    this.racketGroup = new THREE.Group();
    this.racketGroup.position.set(0, -0.32, 0.16);

    // Cán vợt (Grip đỏ nổi bật)
    const gripGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.24, 8);
    const gripMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.7 });
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.position.y = 0.11;
    this.racketGroup.add(grip);

    // Đũa vợt (Shaft Carbon bóng bẩy)
    const shaftGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.42, 8);
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.2 });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.y = 0.42;
    this.racketGroup.add(shaft);

    // Khung vợt (Isometric Frame)
    const frameGeo = new THREE.TorusGeometry(0.20, 0.02, 8, 28);
    frameGeo.scale(1, 1.28, 1);
    this.racketFrameMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15, // Mặc định Vàng Titan
      metalness: 0.9,
      roughness: 0.15
    });
    this.racketFrame = new THREE.Mesh(frameGeo, this.racketFrameMat);
    this.racketFrame.position.y = 0.82;
    this.racketGroup.add(this.racketFrame);

    // Mặt lưới vợt (High tension strings)
    const stringCanvas = document.createElement('canvas');
    stringCanvas.width = 64;
    stringCanvas.height = 64;
    const sctx = stringCanvas.getContext('2d');
    sctx.fillStyle = 'rgba(255,255,255,0.0)';
    sctx.fillRect(0, 0, 64, 64);
    sctx.strokeStyle = 'rgba(255,255,255,0.9)';
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
      new THREE.CircleGeometry(0.19, 16),
      new THREE.MeshBasicMaterial({ map: stringTex, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
    );
    stringMesh.scale.set(1, 1.28, 1);
    stringMesh.position.y = 0.82;
    this.racketGroup.add(stringMesh);

    this.racketGroup.rotation.x = Math.PI / 4;
    this.armPivot.add(this.racketGroup);

    // 5. CHÂN & GIÀY THỂ THAO ĐẾ CAO SU (Sneakers)
    this.feet = [];
    for (const side of [-1, 1]) {
      const footGroup = new THREE.Group();
      footGroup.position.set(side * 0.22, 0.08, 0);

      // Thân giày
      const shoeGeo = new THREE.BoxGeometry(0.16, 0.12, 0.28);
      const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
      const shoe = new THREE.Mesh(shoeGeo, shoeMat);
      shoe.position.set(0, 0.03, 0.04);
      shoe.castShadow = true;
      footGroup.add(shoe);

      // Đế cao su vàng bám sàn (Gum sole)
      const soleGeo = new THREE.BoxGeometry(0.17, 0.04, 0.29);
      const soleMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.7 });
      const sole = new THREE.Mesh(soleGeo, soleMat);
      sole.position.set(0, -0.04, 0.04);
      footGroup.add(sole);

      this.rootNode.add(footGroup);
      this.feet.push(footGroup);
    }

    // 6. BÓNG RÂM DƯỚI SÀN (Soft Ground Shadow)
    const shadowGeo = new THREE.PlaneGeometry(1.2, 1.2);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 64;
    shadowCanvas.height = 64;
    const shctx = shadowCanvas.getContext('2d');
    const grad = shctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.5)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0.0)');
    shctx.fillStyle = grad;
    shctx.fillRect(0, 0, 64, 64);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);

    this.shadowMesh = new THREE.Mesh(
      shadowGeo,
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
    );
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = 0.006;
    this.group.add(this.shadowMesh);
  }

  // Đổi diện mạo nhân vật linh hoạt
  updateAppearance({ color, secondaryColor, jerseyColor, avatar, name }) {
    if (color && this.bodyMesh) {
      this.bodyMesh.material.color.setHex(color);
      this.headMesh.material.color.setHex(color);
    }
    if (jerseyColor && this.jerseyMesh) {
      this.jerseyMesh.material.color.setHex(jerseyColor);
    }
    if (name) this.name = name;
  }

  setRacketSkin(skinType) {
    this.racketSkin = skinType;
    if (this.isPlayer) {
      localStorage.setItem('tboy_racket_skin', skinType);
    }
    if (!this.racketFrameMat) return;

    const skins = {
      titan: { color: 0xfacc15, metalness: 0.95, roughness: 0.1 },  // Vàng Titan
      laser: { color: 0xef4444, metalness: 0.9, roughness: 0.15 },  // Đỏ Laser
      cyan: { color: 0x06b6d4, metalness: 0.92, roughness: 0.12 },  // Xanh Cyan Neon
      sakura: { color: 0xf472b6, metalness: 0.85, roughness: 0.2 }, // Hồng Sakura
      classic: { color: 0x0284c7, metalness: 0.85, roughness: 0.18 } // Xanh Đậm Cổ Điển
    };

    const s = skins[skinType] || skins.titan;
    this.racketFrameMat.color.setHex(s.color);
    this.racketFrameMat.metalness = s.metalness;
    this.racketFrameMat.roughness = s.roughness;
  }

  playAction(action) {
    if (this.state === 'smash' || this.state === 'dive') {
      if (this.stateTime < 0.32) return false;
    }
    this.state = action;
    this.stateTime = 0;

    if (action === 'smash') {
      this.jumpVelocity = 8.5;
      this.isGrounded = false;
    } else if (action === 'dive') {
      this.velocity.z = this.facingZ * 13.5;
      this.jumpVelocity = 2.6;
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
      this.velocity.x *= 0.72;
      if (this.state !== 'dive') this.velocity.z *= 0.72;
    }

    if (this.state === 'dive') {
      this.velocity.z *= 0.92;
      if (this.stateTime > 0.48) {
        this.state = 'idle';
      }
    }

    this.group.position.x += this.velocity.x * dt;
    this.group.position.z += this.velocity.z * dt;

    // Giới hạn nửa sân thi đấu
    const halfW = 2.85;
    this.group.position.x = THREE.MathUtils.clamp(this.group.position.x, -halfW, halfW);

    if (this.isPlayer) {
      this.group.position.z = THREE.MathUtils.clamp(this.group.position.z, 0.7, 6.5);
    } else {
      this.group.position.z = THREE.MathUtils.clamp(this.group.position.z, -6.5, -0.7);
    }

    // Nhảy trên không trung
    if (!this.isGrounded) {
      this.jumpY += this.jumpVelocity * dt;
      this.jumpVelocity -= 26 * dt;
      if (this.jumpY <= 0) {
        this.jumpY = 0;
        this.jumpVelocity = 0;
        this.isGrounded = true;
        if (this.state === 'smash') this.state = 'idle';
      }
    }

    this.bodyMesh.position.y = 0.55 + this.jumpY;

    // Bóng râm co giãn theo độ cao nhảy
    const shadowScale = Math.max(0.3, 1 - this.jumpY * 0.4);
    this.shadowMesh.scale.set(shadowScale, shadowScale, shadowScale);

    this.animate(dt);
  }

  animate(dt) {
    const time = this.stateTime;
    let targetRotY = this.baseRotationY;

    if (this.state === 'run' && Math.abs(this.velocity.x) > 0.5) {
      const turnAngle = this.isPlayer ? (-this.velocity.x * 0.05) : (this.velocity.x * 0.05);
      targetRotY += turnAngle;
    }
    this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetRotY, 0.2);

    // Lắc lư đuôi (Tail Wag)
    if (this.tailPivot) {
      this.tailPivot.rotation.y = Math.sin(time * 8) * 0.35;
    }

    // 1. CHẠY (RUN)
    if (this.state === 'run') {
      const runFreq = 14;
      const legSwing = Math.sin(time * runFreq) * 0.4;
      if (this.feet[0] && this.feet[1]) {
        this.feet[0].position.z = legSwing * 0.25;
        this.feet[1].position.z = -legSwing * 0.25;
      }
      this.bodyMesh.position.y = 0.55 + Math.abs(Math.sin(time * runFreq)) * 0.06;
      this.armPivot.rotation.x = Math.sin(time * runFreq) * 0.35;
    }

    // 2. VUNG VỢT (SWING)
    else if (this.state === 'swing') {
      const swingDur = 0.26;
      const progress = Math.min(time / swingDur, 1.0);
      this.armPivot.rotation.x = THREE.MathUtils.lerp(-Math.PI * 0.4, Math.PI * 0.6, progress);
      this.armPivot.rotation.z = Math.sin(progress * Math.PI) * 0.3;
      if (progress >= 1.0) this.state = 'idle';
    }

    // 3. SMASH (BẬT NHẢY ĐẬP CẦU)
    else if (this.state === 'smash') {
      const progress = Math.min(time / 0.45, 1.0);
      if (progress < 0.45) {
        this.armPivot.rotation.x = THREE.MathUtils.lerp(0, -Math.PI * 0.85, progress / 0.45);
      } else {
        const smashProgress = (progress - 0.45) / 0.55;
        this.armPivot.rotation.x = THREE.MathUtils.lerp(-Math.PI * 0.85, Math.PI * 0.75, smashProgress);
      }
    }

    // 4. DIVE (TRƯỢT NGƯỜI CỨU CẦU)
    else if (this.state === 'dive') {
      const progress = Math.min(time / 0.48, 1.0);
      const divePitch = this.facingZ > 0 ? 0.85 : -0.85;
      this.rootNode.rotation.x = THREE.MathUtils.lerp(0, divePitch, Math.sin(progress * Math.PI));
      this.armPivot.rotation.x = Math.PI * 0.5;
    }

    // 5. ĂN MỪNG (CELEBRATE)
    else if (this.state === 'celebrate') {
      this.bodyMesh.position.y = 0.55 + Math.abs(Math.sin(time * 9)) * 0.18;
      this.armPivot.rotation.x = -Math.PI * 0.7 + Math.sin(time * 12) * 0.25;
      if (this.tailPivot) {
        this.tailPivot.rotation.y = Math.sin(time * 18) * 0.6;
      }
      if (time > 1.8) this.state = 'idle';
    }

    // 6. ĐỨNG CHỜ (IDLE)
    else {
      this.bodyMesh.position.y = 0.55 + Math.sin(time * 3.5) * 0.025;
      this.armPivot.rotation.x = Math.sin(time * 3.5) * 0.08;
      if (this.feet[0] && this.feet[1]) {
        this.feet[0].position.z = 0;
        this.feet[1].position.z = 0;
      }
    }
  }
}
