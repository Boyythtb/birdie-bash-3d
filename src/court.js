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

  // ==========================================================
  // 1. SÀN GỖ TỰ NHIÊN ẤM ÁP (Warm Maple Wood Parquet)
  // ==========================================================
  const woodGeo = new THREE.PlaneGeometry(42, 42);
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0xfde047, // Vàng gỗ sáng ấm áp
    roughness: 0.35,
    metalness: 0.02
  });
  const woodFloor = new THREE.Mesh(woodGeo, woodMat);
  woodFloor.rotation.x = -Math.PI / 2;
  woodFloor.position.y = -0.01;
  woodFloor.receiveShadow = true;
  group.add(woodFloor);

  // Tạo họa tiết vân sàn gỗ parquet thanh mảnh, sang trọng
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 512;
  woodCanvas.height = 512;
  const wctx = woodCanvas.getContext('2d');
  wctx.fillStyle = '#fde68a';
  wctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 512; i += 28) {
    wctx.fillStyle = i % 56 === 0 ? 'rgba(217, 119, 6, 0.08)' : 'rgba(180, 83, 9, 0.04)';
    wctx.fillRect(0, i, 512, 26);
    wctx.strokeStyle = 'rgba(217, 119, 6, 0.14)';
    wctx.lineWidth = 1;
    wctx.strokeRect(0, i, 512, 28);
  }
  const woodTex = new THREE.CanvasTexture(woodCanvas);
  woodTex.wrapS = THREE.RepeatWrapping;
  woodTex.wrapT = THREE.RepeatWrapping;
  woodTex.repeat.set(10, 10);
  woodMat.map = woodTex;
  woodMat.needsUpdate = true;

  // ==========================================================
  // 2. THẢM THI ĐẤU MINT GREEN (Birdie Bash Pastel Turquoise Mat)
  // ==========================================================
  const matGeo = new THREE.PlaneGeometry(COURT.WIDTH, COURT.LENGTH);
  const matMaterial = new THREE.MeshStandardMaterial({
    color: 0x34d399, // Xanh mint tươi sáng đặc trưng của Birdie Bash
    roughness: 0.45,
    metalness: 0.02
  });
  const courtMat = new THREE.Mesh(matGeo, matMaterial);
  courtMat.rotation.x = -Math.PI / 2;
  courtMat.position.y = 0.002;
  courtMat.receiveShadow = true;
  group.add(courtMat);

  // ==========================================================
  // 3. VẠCH KẺ SÂN TRẮNG SÁNG (Crisp White Lines)
  // ==========================================================
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const linesGroup = new THREE.Group();
  linesGroup.position.y = 0.005;

  function addLine(w, h, x, z) {
    const geo = new THREE.PlaneGeometry(w, h);
    const line = new THREE.Mesh(geo, lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(x, 0, z);
    linesGroup.add(line);
  }

  const lw = COURT.LINE_WIDTH;

  // Đường biên dọc đôi (X = ±3.05)
  addLine(lw, COURT.LENGTH, -COURT.HALF_WIDTH + lw / 2, 0);
  addLine(lw, COURT.LENGTH, COURT.HALF_WIDTH - lw / 2, 0);

  // Đường biên dọc đơn (X = ±2.59)
  addLine(lw, COURT.LENGTH, -COURT.HALF_SINGLES_WIDTH + lw / 2, 0);
  addLine(lw, COURT.LENGTH, COURT.HALF_SINGLES_WIDTH - lw / 2, 0);

  // Đường biên ngang cuối sân (Z = ±6.7)
  addLine(COURT.WIDTH, lw, 0, -COURT.HALF_LENGTH + lw / 2);
  addLine(COURT.WIDTH, lw, 0, COURT.HALF_LENGTH - lw / 2);

  // Đường giao cầu dài đánh đôi (Z = ±5.94)
  addLine(COURT.WIDTH, lw, 0, -COURT.DOUBLES_LONG_SERVICE_Z);
  addLine(COURT.WIDTH, lw, 0, COURT.DOUBLES_LONG_SERVICE_Z);

  // Đường giao cầu ngắn (Z = ±1.98)
  addLine(COURT.WIDTH, lw, 0, -COURT.SHORT_SERVICE_Z);
  addLine(COURT.WIDTH, lw, 0, COURT.SHORT_SERVICE_Z);

  // Đường trung tâm chia ô phát cầu (X = 0)
  const serviceCenterLen = COURT.HALF_LENGTH - COURT.SHORT_SERVICE_Z;
  addLine(lw, serviceCenterLen, 0, -(COURT.SHORT_SERVICE_Z + serviceCenterLen / 2));
  addLine(lw, serviceCenterLen, 0, COURT.SHORT_SERVICE_Z + serviceCenterLen / 2);

  group.add(linesGroup);

  // ==========================================================
  // 4. LƯỚI THI ĐẤU PASTEL PINK & POSTS (Pink Posts with Mint Mesh)
  // ==========================================================
  const netGroup = new THREE.Group();

  // Hai cột lưới màu hồng phấn ngọt ngào (Pastel Pink Posts)
  const postGeo = new THREE.CylinderGeometry(0.05, 0.05, COURT.NET_HEIGHT, 16);
  const postMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.3 });
  const postL = new THREE.Mesh(postGeo, postMat);
  postL.position.set(-COURT.HALF_WIDTH - 0.08, COURT.NET_HEIGHT / 2, 0);
  postL.castShadow = true;
  netGroup.add(postL);

  const postR = new THREE.Mesh(postGeo, postMat);
  postR.position.set(COURT.HALF_WIDTH + 0.08, COURT.NET_HEIGHT / 2, 0);
  postR.castShadow = true;
  netGroup.add(postR);

  // Đỉnh tròn cột lưới màu hồng
  const capGeo = new THREE.SphereGeometry(0.07, 12, 12);
  const capL = new THREE.Mesh(capGeo, postMat);
  capL.position.set(-COURT.HALF_WIDTH - 0.08, COURT.NET_HEIGHT + 0.03, 0);
  netGroup.add(capL);

  const capR = new THREE.Mesh(capGeo, postMat);
  capR.position.set(COURT.HALF_WIDTH + 0.08, COURT.NET_HEIGHT + 0.03, 0);
  netGroup.add(capR);

  // Thân lưới màu xanh thẫm
  const netHeight = 0.76;
  const netTopY = COURT.NET_HEIGHT;
  const netBottomY = netTopY - netHeight;
  const netMeshGeo = new THREE.PlaneGeometry(COURT.WIDTH + 0.16, netHeight);

  const netCanvas = document.createElement('canvas');
  netCanvas.width = 128;
  netCanvas.height = 64;
  const nctx = netCanvas.getContext('2d');
  nctx.fillStyle = 'rgba(6, 95, 70, 0.25)';
  nctx.fillRect(0, 0, 128, 64);
  nctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  nctx.lineWidth = 1;
  for (let x = 0; x < 128; x += 8) {
    nctx.beginPath();
    nctx.moveTo(x, 0);
    nctx.lineTo(x, 64);
    nctx.stroke();
  }
  for (let y = 0; y < 64; y += 8) {
    nctx.beginPath();
    nctx.moveTo(0, y);
    nctx.lineTo(128, y);
    nctx.stroke();
  }

  const netTex = new THREE.CanvasTexture(netCanvas);
  netTex.wrapS = THREE.RepeatWrapping;
  netTex.wrapT = THREE.RepeatWrapping;
  netTex.repeat.set(24, 8);

  const netMeshMat = new THREE.MeshStandardMaterial({
    map: netTex,
    transparent: true,
    opacity: 0.9,
    roughness: 0.4,
    side: THREE.DoubleSide
  });
  const netMesh = new THREE.Mesh(netMeshGeo, netMeshMat);
  netMesh.position.set(0, netBottomY + netHeight / 2, 0);
  netGroup.add(netMesh);

  // Dải băng viền trắng trên đỉnh lưới
  const topTapeGeo = new THREE.BoxGeometry(COURT.WIDTH + 0.16, 0.07, 0.035);
  const topTapeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
  const topTape = new THREE.Mesh(topTapeGeo, topTapeMat);
  topTape.position.set(0, netTopY - 0.035, 0);
  topTape.castShadow = true;
  netGroup.add(topTape);

  group.add(netGroup);

  // ==========================================================
  // 5. TƯỜNG PASTEL PINK ẤM CÚNG (Cozy Peach-Pink Walls)
  // ==========================================================
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.6 }); // Hồng phấn ấm áp
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }); // Nẹp chân tường trắng

  // Tường phía sau
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(40, 14, 0.4), wallMat);
  backWall.position.set(0, 7, -13);
  group.add(backWall);

  // Nẹp chân tường
  const backTrim = new THREE.Mesh(new THREE.BoxGeometry(40, 0.35, 0.45), trimMat);
  backTrim.position.set(0, 0.175, -13);
  group.add(backTrim);

  // Tường bên trái
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 14, 40), wallMat);
  leftWall.position.set(-14, 7, 0);
  group.add(leftWall);

  const leftTrim = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 40), trimMat);
  leftTrim.position.set(-14, 0.175, 0);
  group.add(leftTrim);

  // ==========================================================
  // 6. KHÁN ĐÀI BẬC THANG PASTEL PINK & KHÁN GIẢ GUMMY BEARS
  // ==========================================================
  const spectators = [];
  const gummyColors = [
    0x38bdf8, // Xanh da trời
    0xf472b6, // Hồng phấn
    0xfde047, // Vàng chuối
    0xa78bfa, // Tím oải hương
    0x34d399, // Xanh mint
    0xfb923c  // Cam đào
  ];

  const grandstandGroup = new THREE.Group();
  // Khán đài đặt bên cạnh sân (X > 0, góc trên bên phải)
  for (let row = 0; row < 4; row++) {
    const stepX = 5.2 + row * 1.05;
    const stepY = row * 0.65 + 0.32;

    // Bậc thang màu hồng
    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.45, 18),
      new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.4 })
    );
    bench.position.set(stepX, stepY - 0.22, 0);
    grandstandGroup.add(bench);

    // Hàng khán giả Gummy Beans dễ thương
    for (let z = -7.5; z <= 7.5; z += 1.35) {
      const gGroup = new THREE.Group();
      const colRand = gummyColors[Math.floor(Math.random() * gummyColors.length)];

      // Thân hạt đậu tròn (Jelly Bean body)
      const beanGeo = new THREE.CapsuleGeometry(0.18, 0.28, 4, 8);
      const beanMat = new THREE.MeshStandardMaterial({
        color: colRand,
        roughness: 0.35,
        metalness: 0.05
      });
      const beanMesh = new THREE.Mesh(beanGeo, beanMat);
      beanMesh.position.y = 0.32;
      gGroup.add(beanMesh);

      // Hai tai tròn nhỏ xíu
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(
          new THREE.SphereGeometry(0.06, 6, 6),
          beanMat
        );
        ear.position.set(side * 0.14, 0.52, 0);
        gGroup.add(ear);
      }

      gGroup.position.set(stepX, stepY, z + (Math.random() - 0.5) * 0.2);
      grandstandGroup.add(gGroup);

      spectators.push({
        group: gGroup,
        baseY: stepY,
        phase: Math.random() * Math.PI * 2,
        speed: 2.5 + Math.random() * 2.5
      });
    }
  }
  group.add(grandstandGroup);

  // ==========================================================
  // 6b. KHÁN ĐÀI PHÍA SAU SÂN (BACK BLEACHERS NHÌN THẲNG NHƯ MÀN 2)
  // ==========================================================
  const backStandGroup = new THREE.Group();
  for (let row = 0; row < 3; row++) {
    const stepZ = -9.2 - row * 0.95;
    const stepY = row * 0.55 + 0.35;

    // Bậc thang màu hồng
    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(16, 0.45, 0.85),
      new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.4 })
    );
    bench.position.set(0, stepY - 0.22, stepZ);
    backStandGroup.add(bench);

    // Hàng khán giả Gummy Beans ngồi cổ vũ
    for (let x = -6.8; x <= 6.8; x += 1.1) {
      const gGroup = new THREE.Group();
      const colRand = gummyColors[Math.floor(Math.random() * gummyColors.length)];

      const beanGeo = new THREE.CapsuleGeometry(0.16, 0.26, 4, 8);
      const beanMat = new THREE.MeshStandardMaterial({
        color: colRand,
        roughness: 0.35,
        metalness: 0.05
      });
      const beanMesh = new THREE.Mesh(beanGeo, beanMat);
      beanMesh.position.y = 0.28;
      gGroup.add(beanMesh);

      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), beanMat);
        ear.position.set(side * 0.12, 0.48, 0);
        gGroup.add(ear);
      }

      gGroup.position.set(x + (Math.random() - 0.5) * 0.15, stepY, stepZ);
      backStandGroup.add(gGroup);

      spectators.push({
        group: gGroup,
        baseY: stepY,
        phase: Math.random() * Math.PI * 2,
        speed: 2.2 + Math.random() * 2.5
      });
    }
  }
  group.add(backStandGroup);

  // BANNER THI ĐẤU POWER SMASH / TBOY BADMINTON PHÍA SAU
  const bannerCanvas = document.createElement('canvas');
  bannerCanvas.width = 1024;
  bannerCanvas.height = 96;
  const bCtx = bannerCanvas.getContext('2d');
  bCtx.fillStyle = '#f43f5e';
  bCtx.fillRect(0, 0, bannerCanvas.width, bannerCanvas.height);
  bCtx.fillStyle = '#ffffff';
  bCtx.font = 'bold 44px sans-serif';
  bCtx.textAlign = 'center';
  bCtx.textBaseline = 'middle';
  bCtx.fillText('★ TBOY BADMINTON · POWER SMASH TOURNAMENT 2026 ★', 512, 48);

  const bannerTex = new THREE.CanvasTexture(bannerCanvas);
  const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTex });
  const bannerMesh = new THREE.Mesh(new THREE.PlaneGeometry(13.8, 0.8), bannerMat);
  bannerMesh.position.set(0, 0.55, -8.1);
  group.add(bannerMesh);

  // ==========================================================
  // GHẾ & TRỌNG TÀI 3D CHÍNH THỨC (PRO REFEREE HIGH CHAIR)
  // ==========================================================
  const refGroup = new THREE.Group();
  const refMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 }); // Xanh đậm

  // 4 chân thang
  const legGeo = new THREE.CylinderGeometry(0.025, 0.025, 2.2, 8);
  for (const lx of [-0.25, 0.25]) {
    for (const lz of [-0.25, 0.25]) {
      const leg = new THREE.Mesh(legGeo, refMat);
      leg.position.set(lx, 1.1, lz);
      refGroup.add(leg);
    }
  }

  // Bậc thang
  for (let s = 0.4; s <= 1.8; s += 0.35) {
    const rung = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.03), refMat);
    rung.position.set(0, s, -0.25);
    refGroup.add(rung);
  }

  // Mặt ghế & Tựa lưng
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.55), refMat);
  seat.position.set(0, 2.1, 0);
  refGroup.add(seat);

  const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.05), refMat);
  backrest.position.set(0, 2.45, 0.25);
  refGroup.add(backrest);

  // --- TRỌNG TÀI CHIBI 3D NGỒI TRÊN GHẾ (REFEREE CHARACTER) ---
  const refereeGroup = new THREE.Group();
  refereeGroup.position.set(0, 2.15, 0);

  // 1. Thân áo sọc đen trắng chuẩn trọng tài quốc tế
  const stripeCanvas = document.createElement('canvas');
  stripeCanvas.width = 64;
  stripeCanvas.height = 64;
  const sctx = stripeCanvas.getContext('2d');
  sctx.fillStyle = '#ffffff';
  sctx.fillRect(0, 0, 64, 64);
  sctx.fillStyle = '#0f172a';
  for (let x = 0; x < 64; x += 16) {
    sctx.fillRect(x, 0, 8, 64);
  }
  const stripeTex = new THREE.CanvasTexture(stripeCanvas);
  stripeTex.wrapS = THREE.RepeatWrapping;
  stripeTex.wrapT = THREE.RepeatWrapping;

  const refBody = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 14, 14),
    new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.5 })
  );
  refBody.scale.set(0.9, 1.1, 0.85);
  refBody.position.y = 0.22;
  refereeGroup.add(refBody);

  // 2. Đầu trọng tài (Pivot để xoay nhìn theo bóng)
  const refHeadPivot = new THREE.Group();
  refHeadPivot.position.set(0, 0.48, 0);
  refereeGroup.add(refHeadPivot);

  const refHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.20, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.4 })
  );
  refHeadPivot.add(refHead);

  // Mũ lưỡi trai xanh đen của trọng tài
  const capMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.21, 14, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 })
  );
  capMesh.position.y = 0.05;
  refHeadPivot.add(capMesh);

  const visor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.03, 12, 1, false, 0, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 })
  );
  visor.position.set(0, 0.06, -0.12);
  visor.rotation.x = 0.2;
  refHeadPivot.add(visor);

  // Kính râm đen ngầu của trọng tài
  const glasses = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.06, 0.05),
    new THREE.MeshBasicMaterial({ color: 0x0f172a })
  );
  glasses.position.set(0, 0.02, -0.19);
  refHeadPivot.add(glasses);

  // Cánh tay cầm còi / cờ hiệu
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 8), refMat);
  armL.position.set(-0.22, 0.2, 0.05);
  armL.rotation.z = 0.4;
  refereeGroup.add(armL);

  const armRPivot = new THREE.Group();
  armRPivot.position.set(0.22, 0.26, 0.05);
  refereeGroup.add(armRPivot);

  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.20, 8), refMat);
  armR.position.y = -0.09;
  armRPivot.add(armR);

  // Cờ vàng trọng tài
  const flagMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.12), flagMat);
  flag.position.set(0.08, -0.18, 0);
  flag.rotation.y = Math.PI / 2;
  armRPivot.add(flag);

  refGroup.add(refereeGroup);

  refGroup.position.set(3.7, 0, 0);
  group.add(refGroup);

  // ==========================================================
  // 7. CHẬU CÂY CẢNH DỄ THƯƠNG (Cute Potted Plants)
  // ==========================================================
  function createPlant(x, z) {
    const plantGroup = new THREE.Group();

    // Chậu sứ trắng tròn
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.2, 0.4, 12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
    );
    pot.position.y = 0.2;
    plantGroup.add(pot);

    // Tán cây xanh tròn xoe
    const foliage = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6 })
    );
    foliage.position.y = 0.55;
    plantGroup.add(foliage);

    plantGroup.position.set(x, 0, z);
    return plantGroup;
  }

  group.add(createPlant(-6.5, -11.5));
  group.add(createPlant(-11.5, -6.5));
  group.add(createPlant(1.5, -11.8));

  // ==========================================================
  // 8. BẢNG QUẢNG CÁO COZY PASTEL (Small Sponsor Signs)
  // ==========================================================
  function createSponsorSign(text, subtext, x, z, rotY) {
    const signGroup = new THREE.Group();

    // Biển nền tím than/navy
    const signGeo = new THREE.BoxGeometry(2.2, 0.7, 0.08);
    const signMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.4 });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.y = 0.45;
    signGroup.add(sign);

    // Hai chân đỡ kim loại
    const legMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
    for (const lx of [-0.8, 0.8]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.04), legMat);
      leg.position.set(lx, 0.225, 0);
      signGroup.add(leg);
    }

    // Canvas chữ trên biển
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(0, 0, 512, 160);

    ctx.fillStyle = '#f472b6';
    ctx.font = '900 48px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, 256, 68);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 28px "Segoe UI", sans-serif';
    ctx.fillText(subtext, 256, 120);

    const tex = new THREE.CanvasTexture(canvas);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(2.1, 0.64),
      new THREE.MeshBasicMaterial({ map: tex })
    );
    face.position.set(0, 0.45, 0.045);
    signGroup.add(face);

    signGroup.position.set(x, 0, z);
    signGroup.rotation.y = rotY;
    return signGroup;
  }

  // Các biển quảng cáo cute đặt sau sân
  group.add(createSponsorSign('Light', 'official court sponsor', -2.8, -7.4, 0));
  group.add(createSponsorSign('Advertise here', 'SPONSOR THE COURTS', 0.8, -7.4, 0));
  group.add(createSponsorSign('Birdie Bash', 'COZY BADMINTON', 4.2, 0.2, -Math.PI / 2));

  // ==========================================================
  // 9. TIA NẮNG CHIẾU XUYÊN QUA CỬA SỔ (Warm Diagonal Sunbeam)
  // ==========================================================
  const sunbeamGeo = new THREE.CylinderGeometry(0.8, 4.2, 22, 16, 1, true);
  const sunbeamMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const sunbeam = new THREE.Mesh(sunbeamGeo, sunbeamMat);
  sunbeam.position.set(3, 7, -2);
  sunbeam.rotation.z = -0.55;
  sunbeam.rotation.y = 0.4;
  group.add(sunbeam);

  let cheerTimer = 0;
  let flagSignalTimer = 0;

  return {
    mesh: group,
    spectators,
    refHeadPivot,
    armRPivot,
    cheer: (intensity = 1.0) => {
      cheerTimer = 2.5 * intensity;
      flagSignalTimer = 1.8 * intensity;
    },
    update: (time, dt = 0.016, shuttlePos = null) => {
      if (cheerTimer > 0) cheerTimer -= dt;
      if (flagSignalTimer > 0) flagSignalTimer -= dt;

      // 1. Khán giả nhảy múa ăn mừng khi có cheerTimer
      const isCheering = cheerTimer > 0;
      for (const s of spectators) {
        const bounceAmp = isCheering ? 0.32 : 0.08;
        const spd = isCheering ? s.speed * 2.2 : s.speed;
        s.group.position.y = s.baseY + Math.abs(Math.sin(time * spd + s.phase)) * bounceAmp;
        if (isCheering) {
          s.group.rotation.y = Math.sin(time * 6 + s.phase) * 0.25;
        } else {
          s.group.rotation.y = 0;
        }
      }

      // 2. Trọng tài xoay đầu nhìn theo tọa độ quả cầu
      if (refHeadPivot && shuttlePos) {
        // Tọa độ tương đối của quả cầu đối với đầu trọng tài (x=3.7, y=2.63, z=0)
        const dx = shuttlePos.x - 3.7;
        const dy = shuttlePos.y - 2.63;
        const dz = shuttlePos.z;
        const angleY = Math.atan2(dz, -dx); // Xoay quanh trục Y
        const angleX = THREE.MathUtils.clamp(-dy * 0.25, -0.4, 0.4);
        refHeadPivot.rotation.y = THREE.MathUtils.lerp(refHeadPivot.rotation.y, angleY + Math.PI / 2, 0.15);
        refHeadPivot.rotation.x = THREE.MathUtils.lerp(refHeadPivot.rotation.x, angleX, 0.15);
      }

      // 3. Trọng tài giơ cờ khi có tín hiệu ghi điểm / bắt lỗi
      if (armRPivot) {
        const targetArmAngle = (flagSignalTimer > 0) ? -Math.PI * 0.75 : 0;
        armRPivot.rotation.z = THREE.MathUtils.lerp(armRPivot.rotation.z, targetArmAngle, 0.2);
      }
    }
  };
}
