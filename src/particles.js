import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
  }

  // Nổ tia sáng thông thường khi đánh cầu (Hit Spark / Tap)
  emitHit(pos, count = 16, isSmash = false) {
    if (isSmash) {
      return this.emitFireSmash(pos, count);
    }

    const color = 0x38bdf8;
    const speedBase = 5.5;

    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.04, 6, 6);
      const mat = new THREE.MeshBasicMaterial({ color });
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(pos);

      const phi = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI;
      const speed = (0.5 + Math.random() * 0.8) * speedBase;

      const vel = new THREE.Vector3(
        Math.sin(theta) * Math.cos(phi) * speed,
        Math.sin(theta) * Math.sin(phi) * speed + 1.8,
        Math.cos(theta) * speed
      );

      this.scene.add(p);
      this.particles.push({
        mesh: p,
        vel,
        gravity: -14,
        life: 0.35 + Math.random() * 0.2,
        maxLife: 0.35 + Math.random() * 0.2
      });
    }
  }

  // SIÊU HIỆU ỨNG SMASH TÓE LỬA (FIERY EXPLOSIVE SMASH)
  // Bắn tóe 48+ tia lửa rực rỡ, tàn lửa bay lơ lửng, vòng sóng xung kích kép và quầng sáng bùng nổ
  emitFireSmash(pos, count = 52) {
    const fireColors = [
      0xffffff, // Trắng sáng cực nóng ở tâm
      0xfef08a, // Vàng chanh rực lửa
      0xfbbf24, // Vàng hổ phách
      0xf97316, // Cam lửa
      0xef4444, // Đỏ rực
      0xdc2626  // Đỏ thẫm
    ];

    // 1. Chùm tia lửa tóe ra cực mạnh với vận tốc cao và tia lửa rơi hình vòng cung
    for (let i = 0; i < count; i++) {
      const color = fireColors[Math.floor(Math.random() * fireColors.length)];
      const radius = 0.05 + Math.random() * 0.045;
      const geo = new THREE.SphereGeometry(radius, 6, 6);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending
      });
      const p = new THREE.Mesh(geo, mat);
      p.position.set(
        pos.x + (Math.random() - 0.5) * 0.15,
        pos.y + (Math.random() - 0.5) * 0.15,
        pos.z + (Math.random() - 0.5) * 0.15
      );

      const phi = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI;
      const speed = 7.0 + Math.random() * 11.0;

      const vel = new THREE.Vector3(
        Math.sin(theta) * Math.cos(phi) * speed,
        Math.sin(theta) * Math.sin(phi) * speed + 3.2,
        Math.cos(theta) * speed
      );

      this.scene.add(p);
      const life = 0.35 + Math.random() * 0.35;
      this.particles.push({
        mesh: p,
        vel,
        gravity: -22, // Lực rơi tia lửa như pháo hoa / tia lửa hàn
        drag: 0.94,
        life,
        maxLife: life,
        isSpark: true
      });
    }

    // 2. Tàn lửa lơ lửng (Floating Embers) bốc lên không trung
    for (let i = 0; i < 14; i++) {
      const emberGeo = new THREE.SphereGeometry(0.045, 6, 6);
      const emberMat = new THREE.MeshBasicMaterial({
        color: 0xff7a00,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
      });
      const ember = new THREE.Mesh(emberGeo, emberMat);
      ember.position.set(
        pos.x + (Math.random() - 0.5) * 0.3,
        pos.y + (Math.random() - 0.5) * 0.2,
        pos.z + (Math.random() - 0.5) * 0.3
      );

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 2.2,
        1.8 + Math.random() * 2.8, // Bốc thẳng lên trời
        (Math.random() - 0.5) * 2.2
      );

      this.scene.add(ember);
      const life = 0.55 + Math.random() * 0.35;
      this.particles.push({
        mesh: ember,
        vel,
        gravity: 1.5, // Nổi bồng bềnh lên
        drag: 0.96,
        life,
        maxLife: life,
        isEmber: true
      });
    }

    // 3. Vòng sóng xung kích lửa kép (Double Fire Shockwave Ring)
    // Vòng trong vàng chanh cực nhanh
    const innerRingGeo = new THREE.RingGeometry(0.12, 0.36, 28);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0xfff08a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    const innerShockwave = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerShockwave.position.copy(pos);
    innerShockwave.rotation.x = -Math.PI / 2;
    this.scene.add(innerShockwave);

    this.particles.push({
      mesh: innerShockwave,
      isRing: true,
      scaleSpeed: 24,
      life: 0.25,
      maxLife: 0.25
    });

    // Vòng ngoài đỏ cam cuộn sóng
    const outerRingGeo = new THREE.RingGeometry(0.2, 0.55, 28);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0xff4500,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    const outerShockwave = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerShockwave.position.copy(pos);
    outerShockwave.rotation.x = -Math.PI / 2;
    this.scene.add(outerShockwave);

    this.particles.push({
      mesh: outerShockwave,
      isRing: true,
      scaleSpeed: 18,
      life: 0.36,
      maxLife: 0.36
    });
  }

  // Tàn lửa đuôi cầu khi đang bay quả smash (Smash Trail Embers)
  emitSmashTrail(pos) {
    const fireColors = [0xfff08a, 0xfb923c, 0xef4444];
    for (let i = 0; i < 2; i++) {
      const color = fireColors[Math.floor(Math.random() * fireColors.length)];
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 6, 6),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
      );
      p.position.set(
        pos.x + (Math.random() - 0.5) * 0.12,
        pos.y + (Math.random() - 0.5) * 0.12,
        pos.z + (Math.random() - 0.5) * 0.12
      );
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        Math.random() * 1.2,
        (Math.random() - 0.5) * 1.5
      );
      this.scene.add(p);
      this.particles.push({
        mesh: p,
        vel,
        gravity: -5,
        life: 0.22,
        maxLife: 0.22
      });
    }
  }

  // Vết nổ lửa khi quả smash cắm xuống sàn sân (Floor Smash Blast)
  emitFireImpact(pos) {
    // 1. Tia lửa nảy bật ngược từ mặt sàn lên
    for (let i = 0; i < 28; i++) {
      const color = Math.random() < 0.5 ? 0xfef08a : 0xf97316;
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 6, 6),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending })
      );
      p.position.set(pos.x, 0.03, pos.z);

      const angle = Math.random() * Math.PI * 2;
      const speedXZ = 2.5 + Math.random() * 5.5;
      const vel = new THREE.Vector3(
        Math.cos(angle) * speedXZ,
        3.5 + Math.random() * 5.5, // Bật ngược lên cao
        Math.sin(angle) * speedXZ
      );

      this.scene.add(p);
      this.particles.push({
        mesh: p,
        vel,
        gravity: -20,
        drag: 0.95,
        life: 0.35 + Math.random() * 0.2,
        maxLife: 0.35 + Math.random() * 0.2
      });
    }

    // 2. Vòng lửa trên sàn lan tỏa (Ground Flame Ring)
    const floorRingGeo = new THREE.RingGeometry(0.18, 0.45, 24);
    const floorRingMat = new THREE.MeshBasicMaterial({
      color: 0xff5500,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    const floorRing = new THREE.Mesh(floorRingGeo, floorRingMat);
    floorRing.position.set(pos.x, 0.02, pos.z);
    floorRing.rotation.x = -Math.PI / 2;
    this.scene.add(floorRing);

    this.particles.push({
      mesh: floorRing,
      isRing: true,
      scaleSpeed: 14,
      life: 0.38,
      maxLife: 0.38
    });

    // 3. Khói bụi sàn
    this.emitDust(pos);
  }

  // Bụi sàn khi dive/trượt người (Dust puff)
  emitDust(pos) {
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.65 })
      );
      p.position.set(pos.x + (Math.random() - 0.5) * 0.4, 0.05, pos.z + (Math.random() - 0.5) * 0.4);
      const vel = new THREE.Vector3((Math.random() - 0.5) * 1.8, 0.8 + Math.random() * 1.5, (Math.random() - 0.5) * 1.8);
      this.scene.add(p);
      this.particles.push({
        mesh: p,
        vel,
        gravity: -2.5,
        life: 0.45,
        maxLife: 0.45
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      const progress = 1 - p.life / p.maxLife;

      if (p.isRing) {
        // Phóng to vòng sóng xung kích và mờ dần
        const s = 1 + progress * p.scaleSpeed;
        p.mesh.scale.set(s, s, 1);
        p.mesh.material.opacity = (1 - progress) * 0.92;
      } else {
        if (p.drag) {
          p.vel.x *= p.drag;
          p.vel.z *= p.drag;
        }
        p.vel.y += p.gravity * dt;
        p.mesh.position.addScaledVector(p.vel, dt);

        // Hiệu ứng mờ dần và thu nhỏ
        const scaleVal = Math.max(0.05, 1 - progress * 0.9);
        p.mesh.scale.setScalar(scaleVal);
        if (p.mesh.material.transparent) {
          p.mesh.material.opacity = Math.max(0, 1 - progress);
        }
      }
    }
  }
}
