import * as THREE from 'three';

export class Shuttlecock {
  constructor() {
    this.group = new THREE.Group();
    this.position = this.group.position;
    this.velocity = new THREE.Vector3(0, 0, 0);

    // Vật lý cầu lông tinh chỉnh chuẩn xác, mượt mà
    this.gravity = -14.5;
    this.dragCoeff = 0.055;
    this.isAirborne = false;
    this.lastHitter = null; // 'player' | 'bot' | 'remote'
    this.shotType = 'clear';

    // Dữ liệu dự đoán điểm rơi
    this.predictedLanding = new THREE.Vector3();
    this.timeToLand = 0;
    this.initialTimeToLand = 0;

    this.buildModel();
    this.buildLandingIndicator();
    this.buildTrail();
  }

  buildModel() {
    this.meshGroup = new THREE.Group();

    // 1. Đế bần (Cork base - trắng sáng bóng bẩy)
    const corkGeo = new THREE.SphereGeometry(0.075, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const corkMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.1
    });
    const cork = new THREE.Mesh(corkGeo, corkMat);
    cork.position.y = -0.06;
    cork.rotation.x = Math.PI;
    cork.castShadow = true;
    this.meshGroup.add(cork);

    // 2. Chùm lông vũ (Feather skirt)
    const skirtGeo = new THREE.CylinderGeometry(0.135, 0.07, 0.18, 16, 1, true);
    const skirtMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.6,
      side: THREE.DoubleSide
    });
    const skirt = new THREE.Mesh(skirtGeo, skirtMat);
    skirt.position.y = 0.03;
    this.meshGroup.add(skirt);

    // Dải băng viền xanh ngọc nổi bật
    const bandGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.022, 16);
    const bandMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.position.y = -0.04;
    this.meshGroup.add(band);

    this.group.add(this.meshGroup);
  }

  buildLandingIndicator() {
    this.indicatorGroup = new THREE.Group();
    this.indicatorGroup.visible = false;

    // Vòng tròn co giãn thu nhỏ về tâm (Timing Ring)
    const ringGeo = new THREE.RingGeometry(0.38, 0.46, 36);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });
    this.outerRing = new THREE.Mesh(ringGeo, ringMat);
    this.outerRing.rotation.x = -Math.PI / 2;
    this.indicatorGroup.add(this.outerRing);

    // Điểm tâm tiếp đất cố định (Target Sweetspot)
    const centerGeo = new THREE.CircleGeometry(0.16, 24);
    const centerMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    this.centerSpot = new THREE.Mesh(centerGeo, centerMat);
    this.centerSpot.rotation.x = -Math.PI / 2;
    this.indicatorGroup.add(this.centerSpot);

    // Vòng phát sáng phụ
    const glowGeo = new THREE.RingGeometry(0.18, 0.22, 24);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    this.innerGlow = new THREE.Mesh(glowGeo, glowMat);
    this.innerGlow.rotation.x = -Math.PI / 2;
    this.indicatorGroup.add(this.innerGlow);

    this.indicatorGroup.position.y = 0.01;
  }

  buildTrail() {
    this.trailPoints = [];
    this.maxTrail = 18;
    this.trailGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxTrail * 3);
    const colors = new Float32Array(this.maxTrail * 3);

    for (let i = 0; i < this.maxTrail; i++) {
      colors[i * 3] = 0.05;
      colors[i * 3 + 1] = 0.65;
      colors[i * 3 + 2] = 0.95;
    }

    this.trailGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.trailGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.trailMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 3,
      transparent: true,
      opacity: 0.85
    });
    this.trailLine = new THREE.Line(this.trailGeo, this.trailMat);
    this.trailLine.frustumCulled = false;
  }

  // Đánh hoặc phát cầu
  hit({ from, velocity, hitter, shotType = 'clear' }) {
    this.position.copy(from);
    this.velocity.copy(velocity);
    this.isAirborne = true;
    this.lastHitter = hitter;
    this.shotType = shotType;

    this.predictLanding();
  }

  // Dự đoán điểm rơi chính xác
  predictLanding() {
    const simPos = this.position.clone();
    const simVel = this.velocity.clone();
    const dt = 0.02;
    let time = 0;

    for (let step = 0; step < 260; step++) {
      const speed = simVel.length();
      const dragMag = this.dragCoeff * speed;
      const dragAcc = simVel.clone().multiplyScalar(-dragMag);

      simVel.x += dragAcc.x * dt;
      simVel.y += (this.gravity + dragAcc.y) * dt;
      simVel.z += dragAcc.z * dt;

      simPos.addScaledVector(simVel, dt);
      time += dt;

      if (simPos.y <= 0.05) {
        this.predictedLanding.copy(simPos);
        this.predictedLanding.y = 0.01;
        this.timeToLand = time;
        this.initialTimeToLand = time;
        this.indicatorGroup.position.copy(this.predictedLanding);
        this.indicatorGroup.visible = true;
        return;
      }
    }
  }

  update(dt) {
    if (!this.isAirborne) {
      this.indicatorGroup.visible = false;
      return;
    }

    // Áp dụng lực cản khí động học & Trọng lực
    const speed = this.velocity.length();
    const dragMag = this.dragCoeff * speed;
    const dragAcc = this.velocity.clone().multiplyScalar(-dragMag);

    this.velocity.x += dragAcc.x * dt;
    this.velocity.y += (this.gravity + dragAcc.y) * dt;
    this.velocity.z += dragAcc.z * dt;

    this.position.addScaledVector(this.velocity, dt);

    // Xoay đầu bần chúc theo hướng bay
    if (speed > 0.4) {
      const targetDir = this.velocity.clone().normalize();
      const up = new THREE.Vector3(0, -1, 0);
      this.meshGroup.quaternion.setFromUnitVectors(up, targetDir);
    }

    // Cập nhật vòng Timing thu nhỏ dần vào tâm
    if (this.indicatorGroup.visible) {
      this.timeToLand = Math.max(0, this.timeToLand - dt);
      const ratio = this.initialTimeToLand > 0 ? this.timeToLand / this.initialTimeToLand : 0;

      // Scale co lại về phía 0.5 (Sweetspot)
      const scale = 0.45 + ratio * 2.3;
      this.outerRing.scale.set(scale, scale, 1);

      // Đổi màu theo nhịp tiếp cận
      if (ratio < 0.35 && ratio > 0.04) {
        // VÙNG VÀNG PERFECT (Xanh lục neon rực rỡ)
        this.outerRing.material.color.setHex(0x22c55e);
        this.centerSpot.material.color.setHex(0x16a34a);
      } else if (ratio < 0.65) {
        // GOOD (Vàng cam thể thao)
        this.outerRing.material.color.setHex(0xf59e0b);
        this.centerSpot.material.color.setHex(0xd97706);
      } else {
        // EARLY (Xanh ngọc / Bạc)
        this.outerRing.material.color.setHex(0x38bdf8);
        this.centerSpot.material.color.setHex(0x0284c7);
      }
    }

    // Cập nhật Trail vệt sáng theo màu loại cú đánh
    this.trailPoints.unshift(this.position.clone());
    if (this.trailPoints.length > this.maxTrail) {
      this.trailPoints.pop();
    }

    let baseR = 0.05, baseG = 0.65, baseB = 0.95;
    if (this.shotType === 'smash') {
      baseR = 0.98; baseG = 0.45; baseB = 0.05; // Cam lửa rực
    } else if (this.shotType === 'drop') {
      baseR = 0.75; baseG = 0.35; baseB = 0.98; // Tím phong lan
    }

    const positions = this.trailGeo.attributes.position.array;
    const colors = this.trailGeo.attributes.color.array;

    for (let i = 0; i < this.trailPoints.length; i++) {
      positions[i * 3] = this.trailPoints[i].x;
      positions[i * 3 + 1] = this.trailPoints[i].y;
      positions[i * 3 + 2] = this.trailPoints[i].z;

      // Độ nhạt dần về đuôi vệt sáng
      const fade = 1 - (i / this.maxTrail);
      colors[i * 3] = baseR * fade;
      colors[i * 3 + 1] = baseG * fade;
      colors[i * 3 + 2] = baseB * fade;
    }

    this.trailGeo.attributes.position.needsUpdate = true;
    this.trailGeo.attributes.color.needsUpdate = true;
    this.trailGeo.setDrawRange(0, this.trailPoints.length);
  }

  ground() {
    this.isAirborne = false;
    this.velocity.set(0, 0, 0);
    this.position.y = 0.06;
    this.indicatorGroup.visible = false;
    this.trailPoints = [];
    this.trailGeo.setDrawRange(0, 0);
  }
}
