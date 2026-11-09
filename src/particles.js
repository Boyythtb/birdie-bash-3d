import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
  }

  // Nổ tia sáng khi đánh cầu (Hit Spark / Smash Burst)
  emitHit(pos, count = 16, isSmash = false) {
    const color = isSmash ? 0xf59e0b : 0x38bdf8;
    const speedBase = isSmash ? 9 : 5;

    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(isSmash ? 0.05 : 0.035, 6, 6);
      const mat = new THREE.MeshBasicMaterial({ color });
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(pos);

      // Bắn tóe ra hình cầu
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI;
      const speed = (0.5 + Math.random() * 0.8) * speedBase;

      const vel = new THREE.Vector3(
        Math.sin(theta) * Math.cos(phi) * speed,
        Math.sin(theta) * Math.sin(phi) * speed + 2,
        Math.cos(theta) * speed
      );

      this.scene.add(p);
      this.particles.push({
        mesh: p,
        vel,
        gravity: -15,
        life: 0.35 + Math.random() * 0.2,
        maxLife: 0.35 + Math.random() * 0.2
      });
    }

    // Nếu là Smash, thêm hiệu ứng vòng sóng xung kích (Shockwave Ring)
    if (isSmash) {
      const ringGeo = new THREE.RingGeometry(0.1, 0.25, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95
      });
      const shockwave = new THREE.Mesh(ringGeo, ringMat);
      shockwave.position.copy(pos);
      shockwave.rotation.x = -Math.PI / 2;
      this.scene.add(shockwave);

      this.particles.push({
        mesh: shockwave,
        isRing: true,
        scaleSpeed: 16,
        life: 0.28,
        maxLife: 0.28
      });
    }
  }

  // Bụi sàn khi dive/trượt người (Dust puff)
  emitDust(pos) {
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.6 })
      );
      p.position.set(pos.x + (Math.random() - 0.5) * 0.4, 0.05, pos.z + (Math.random() - 0.5) * 0.4);
      const vel = new THREE.Vector3((Math.random() - 0.5) * 1.5, 0.8 + Math.random() * 1.2, (Math.random() - 0.5) * 1.5);
      this.scene.add(p);
      this.particles.push({
        mesh: p,
        vel,
        gravity: -2,
        life: 0.4,
        maxLife: 0.4
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
        p.mesh.material.opacity = (1 - progress) * 0.9;
      } else {
        p.vel.y += p.gravity * dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        p.mesh.scale.setScalar(Math.max(0.1, 1 - progress));
      }
    }
  }
}
