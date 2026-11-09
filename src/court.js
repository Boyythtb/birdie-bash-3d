import * as THREE from 'three';

export const COURT = {
  LENGTH: 13.4,
  WIDTH: 6.1,
  SINGLES_WIDTH: 5.18,
  HALF_LENGTH: 6.7,
  HALF_WIDTH: 3.05,
  HALF_SINGLES_WIDTH: 2.59,
  SHORT_SERVICE_Z: 1.98,
  DOUBLES_LONG_SERVICE_Z: 5.94,
  NET_HEIGHT: 1.55,
  NET_CENTER_HEIGHT: 1.524,
  LINE_WIDTH: 0.05
};

export function createCourt() {
  const group = new THREE.Group();

  // 1. SÀN NHÀ THI ĐẤU GỖ SÁNG BÓNG RỘNG RÃI (Blonde Maple Floor)
  const woodGeo = new THREE.PlaneGeometry(28, 38);
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    roughness: 0.38,
    metalness: 0.05
  });
  const woodFloor = new THREE.Mesh(woodGeo, woodMat);
  woodFloor.rotation.x = -Math.PI / 2;
  woodFloor.position.y = -0.01;
  woodFloor.receiveShadow = true;
  group.add(woodFloor);

  // Tạo hoa văn vân gỗ sáng thanh lịch
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 512;
  woodCanvas.height = 512;
  const wctx = woodCanvas.getContext('2d');
  wctx.fillStyle = '#fef3c7';
  wctx.fillRect(0, 0, 512, 512);
  wctx.fillStyle = 'rgba(217, 119, 6, 0.07)';
  for (let i = 0; i < 512; i += 24) {
    wctx.fillRect(0, i, 512, 1.5);
  }
  const woodTex = new THREE.CanvasTexture(woodCanvas);
  woodTex.wrapS = THREE.RepeatWrapping;
  woodTex.wrapT = THREE.RepeatWrapping;
  woodTex.repeat.set(12, 16);
  woodMat.map = woodTex;
  woodMat.needsUpdate = true;

  // 2. VÙNG THẢM BAO XUNG QUANH SÂN (BWF Court Green Apron / Surround)
  // Tạo viền thảm xanh rộng rãi giúp nhìn rõ ranh giới cuối sân
  const apronGeo = new THREE.PlaneGeometry(COURT.WIDTH + 1.8, COURT.LENGTH + 2.2);
  const apronMat = new THREE.MeshStandardMaterial({
    color: 0x0f766e, // Xanh ngọc đậm hơn một chút làm nền tương phản
    roughness: 0.58,
    metalness: 0.02
  });
  const apron = new THREE.Mesh(apronGeo, apronMat);
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = 0.001;
  apron.receiveShadow = true;
  group.add(apron);

  // 3. THẢM THI ĐẤU CHÍNH XANH LỤC TƯƠI SÁNG (BWF Emerald Green Mat)
  const matGeo = new THREE.PlaneGeometry(COURT.WIDTH, COURT.LENGTH);
  const matMaterial = new THREE.MeshStandardMaterial({
    color: 0x16a34a,
    roughness: 0.52,
    metalness: 0.02
  });
  const courtMat = new THREE.Mesh(matGeo, matMaterial);
  courtMat.rotation.x = -Math.PI / 2;
  courtMat.position.y = 0.002;
  courtMat.receiveShadow = true;
  group.add(courtMat);

  // 4. VẠCH KẺ SÂN TIÊU CHUẨN TRẮNG SÁNG (Crisp White Lines)
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const linesGroup = new THREE.Group();
  linesGroup.position.y = 0.004;

  function addLine(w, h, x, z) {
    const geo = new THREE.PlaneGeometry(w, h);
    const line = new THREE.Mesh(geo, lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(x, 0, z);
    linesGroup.add(line);
  }

  const lw = COURT.LINE_WIDTH;

  // Hai đường biên dọc đôi (X = ±3.05)
  addLine(lw, COURT.LENGTH, -COURT.HALF_WIDTH + lw / 2, 0);
  addLine(lw, COURT.LENGTH, COURT.HALF_WIDTH - lw / 2, 0);

  // HAI ĐƯỜNG BIÊN CUỐI SÂN (Back Boundary Lines: Z = ±6.7m) - RÕ NÉT RỰC RỠ
  addLine(COURT.WIDTH, lw * 1.2, 0, -COURT.HALF_LENGTH + lw / 2);
  addLine(COURT.WIDTH, lw * 1.2, 0, COURT.HALF_LENGTH - lw / 2);

  // Hai đường biên dọc đơn (Singles: X = ±2.59)
  addLine(lw, COURT.LENGTH, -COURT.HALF_SINGLES_WIDTH, 0);
  addLine(lw, COURT.LENGTH, COURT.HALF_SINGLES_WIDTH, 0);

  // Hai đường giao cầu gần (Z = ±1.98)
  addLine(COURT.WIDTH, lw, 0, -COURT.SHORT_SERVICE_Z);
  addLine(COURT.WIDTH, lw, 0, COURT.SHORT_SERVICE_Z);

  // Hai đường giao cầu xa đôi (Z = ±5.94)
  addLine(COURT.WIDTH, lw, 0, -COURT.DOUBLES_LONG_SERVICE_Z);
  addLine(COURT.WIDTH, lw, 0, COURT.DOUBLES_LONG_SERVICE_Z);

  // Đường trung tâm chia sân (Center line: X = 0)
  const halfServiceLen = COURT.HALF_LENGTH - COURT.SHORT_SERVICE_Z;
  addLine(lw, halfServiceLen, 0, -(COURT.SHORT_SERVICE_Z + halfServiceLen / 2));
  addLine(lw, halfServiceLen, 0, COURT.SHORT_SERVICE_Z + halfServiceLen / 2);

  group.add(linesGroup);

  // 5. LƯỚI CẦU LÔNG 3D & CỘT LƯỚI (Net & Steel Posts)
  const netGroup = new THREE.Group();

  const postGeo = new THREE.CylinderGeometry(0.038, 0.038, COURT.NET_HEIGHT, 16);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.3, metalness: 0.6 });

  const leftPost = new THREE.Mesh(postGeo, postMat);
  leftPost.position.set(-COURT.HALF_WIDTH - 0.05, COURT.NET_HEIGHT / 2, 0);
  leftPost.castShadow = true;
  netGroup.add(leftPost);

  const rightPost = new THREE.Mesh(postGeo, postMat);
  rightPost.position.set(COURT.HALF_WIDTH + 0.05, COURT.NET_HEIGHT / 2, 0);
  rightPost.castShadow = true;
  netGroup.add(rightPost);

  // Texture lưới mắt cáo
  const netCanvas = document.createElement('canvas');
  netCanvas.width = 128;
  netCanvas.height = 128;
  const nctx = netCanvas.getContext('2d');
  nctx.fillStyle = 'rgba(255, 255, 255, 0.0)';
  nctx.fillRect(0, 0, 128, 128);
  nctx.strokeStyle = 'rgba(70, 40, 30, 0.85)';
  nctx.lineWidth = 2.5;
  for (let i = 0; i <= 128; i += 16) {
    nctx.beginPath();
    nctx.moveTo(i, 0);
    nctx.lineTo(i, 128);
    nctx.stroke();
    nctx.beginPath();
    nctx.moveTo(0, i);
    nctx.lineTo(128, i);
    nctx.stroke();
  }
  const netTexture = new THREE.CanvasTexture(netCanvas);
  netTexture.wrapS = THREE.RepeatWrapping;
  netTexture.wrapT = THREE.RepeatWrapping;
  netTexture.repeat.set(44, 6);

  const netHeight = 0.76;
  const netTopY = COURT.NET_HEIGHT;
  const netBottomY = netTopY - netHeight;

  const netMeshGeo = new THREE.PlaneGeometry(COURT.WIDTH + 0.1, netHeight);
  const netMeshMat = new THREE.MeshBasicMaterial({
    map: netTexture,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide
  });
  const netMesh = new THREE.Mesh(netMeshGeo, netMeshMat);
  netMesh.position.set(0, netBottomY + netHeight / 2, 0);
  netGroup.add(netMesh);

  // Dải viền trắng trên đỉnh lưới
  const topTapeGeo = new THREE.BoxGeometry(COURT.WIDTH + 0.1, 0.075, 0.038);
  const topTapeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
  const topTape = new THREE.Mesh(topTapeGeo, topTapeMat);
  topTape.position.set(0, netTopY - 0.035, 0);
  topTape.castShadow = true;
  netGroup.add(topTape);

  group.add(netGroup);

  // 6. GHẾ TRỌNG TÀI
  const chairGroup = new THREE.Group();
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7, roughness: 0.3 });

  const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 2.0);
  for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.35, 0.35], [0.35, 0.35]]) {
    const leg = new THREE.Mesh(legGeo, metalMat);
    leg.position.set(x, 1.0, z);
    chairGroup.add(leg);
  }
  for (let y = 0.4; y < 1.8; y += 0.35) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.03, 0.1), metalMat);
    step.position.set(0, y, 0);
    chairGroup.add(step);
  }
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.5), chairMat);
  seat.position.set(0, 1.85, 0);
  chairGroup.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.06), chairMat);
  back.position.set(0, 2.05, -0.22);
  chairGroup.add(back);

  chairGroup.position.set(COURT.HALF_WIDTH + 1.2, 0, 0);
  chairGroup.rotation.y = -Math.PI / 2;
  group.add(chairGroup);

  // 7. KHÁN ĐÀI & BANNER (ĐẶT KHÉO LÉO KHÔNG BAO GIỜ CHẮN TẦM NHÌN CAMERA)
  const arenaGroup = new THREE.Group();

  function createBanner(text, w, h, x, z, rotY, bgColor = '#0284c7', fgColor = '#ffffff') {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 1024, 128);

    ctx.fillStyle = fgColor;
    ctx.font = 'bold 54px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 512, 64);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.strokeRect(6, 6, 1012, 116);

    const tex = new THREE.CanvasTexture(canvas);
    const bannerGeo = new THREE.BoxGeometry(w, h, 0.12);
    const bannerMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25 });
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(x, h / 2, z);
    banner.rotation.y = rotY;
    banner.castShadow = true;
    return banner;
  }

  // 2 Banner dọc hai bên hông sân (Kéo dài bao quát cả sân đấu)
  arenaGroup.add(createBanner('⚡ BIRDIE BASH 3D ⚡ SMASH & DASH ⚡', 28, 0.9, -6.8, 0, Math.PI / 2, '#0284c7', '#fef08a'));
  arenaGroup.add(createBanner('🏸 C-FIBER BADMINTON ARENA · CHAMPIONSHIP 🏸', 28, 0.9, 6.8, 0, -Math.PI / 2, '#0f766e', '#ffffff'));

  // Banner phía sau sân đối thủ (Z = -10.5m)
  arenaGroup.add(createBanner('🔥 POWER SMASH TOURNAMENT 2026 🔥', 13.5, 0.9, 0, -10.5, 0, '#e11d48', '#ffffff'));

  // Tường nhà thi đấu
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.7 });
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(34, 12, 0.5), wallMat);
  backWall.position.set(0, 6, -16);
  arenaGroup.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 12, 40), wallMat);
  leftWall.position.set(-13, 6, 0);
  arenaGroup.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 12, 40), wallMat);
  rightWall.position.set(13, 6, 0);
  arenaGroup.add(rightWall);

  // Khán giả Chibi trên khán đài
  const spectators = [];
  const spectatorColors = [0xef4444, 0x06b6d4, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899, 0x3b82f6];

  for (let row = 0; row < 3; row++) {
    const stepZ = -11.5 - row * 0.95;
    const stepY = row * 0.55 + 0.3;

    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(18, 0.45, 0.85),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 })
    );
    bench.position.set(0, stepY - 0.22, stepZ);
    arenaGroup.add(bench);

    for (let col = -8; col <= 8; col += 1.3) {
      const specGroup = new THREE.Group();
      const colRand = spectatorColors[Math.floor(Math.random() * spectatorColors.length)];

      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.18, 0.26, 4, 8),
        new THREE.MeshStandardMaterial({ color: colRand, roughness: 0.4 })
      );
      body.position.y = 0.3;
      specGroup.add(body);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffedd5, roughness: 0.5 })
      );
      head.position.y = 0.62;
      specGroup.add(head);

      specGroup.position.set(col + (Math.random() - 0.5) * 0.2, stepY, stepZ);
      arenaGroup.add(specGroup);

      spectators.push({
        group: specGroup,
        baseY: stepY,
        phase: Math.random() * Math.PI * 2,
        speed: 3 + Math.random() * 3
      });
    }
  }

  group.add(arenaGroup);

  return {
    mesh: group,
    spectators,
    update: (time) => {
      for (const s of spectators) {
        s.group.position.y = s.baseY + Math.sin(time * s.speed + s.phase) * 0.09;
      }
    }
  };
}
