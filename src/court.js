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
  // 1. SÀN ĐẤU GỖ MAPLE CAO CẤP (Tournament Hardwood Floor)
  // ==========================================================
  const woodGeo = new THREE.PlaneGeometry(42, 52);
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    roughness: 0.22,
    metalness: 0.06
  });
  const woodFloor = new THREE.Mesh(woodGeo, woodMat);
  woodFloor.rotation.x = -Math.PI / 2;
  woodFloor.position.y = -0.01;
  woodFloor.receiveShadow = true;
  group.add(woodFloor);

  // Tạo hoa văn vân gỗ thể thao bóng bẩy
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 512;
  woodCanvas.height = 512;
  const wctx = woodCanvas.getContext('2d');
  wctx.fillStyle = '#fef3c7';
  wctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 512; i += 32) {
    wctx.fillStyle = i % 64 === 0 ? 'rgba(217, 119, 6, 0.06)' : 'rgba(180, 83, 9, 0.04)';
    wctx.fillRect(0, i, 512, 30);
    wctx.strokeStyle = 'rgba(146, 64, 14, 0.12)';
    wctx.lineWidth = 1;
    wctx.strokeRect(0, i, 512, 32);
  }
  const woodTex = new THREE.CanvasTexture(woodCanvas);
  woodTex.wrapS = THREE.RepeatWrapping;
  woodTex.wrapT = THREE.RepeatWrapping;
  woodTex.repeat.set(12, 16);
  woodMat.map = woodTex;
  woodMat.needsUpdate = true;

  // ==========================================================
  // 2. VÙNG THẢM BAO SÂN NGOẠI VI (Olympic Blue & Green Runner)
  // ==========================================================
  const runnerGeo = new THREE.PlaneGeometry(COURT.WIDTH + 4.2, COURT.LENGTH + 4.8);
  const runnerMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7, // Xanh Olympic rực rỡ
    roughness: 0.38,
    metalness: 0.04
  });
  const runner = new THREE.Mesh(runnerGeo, runnerMat);
  runner.rotation.x = -Math.PI / 2;
  runner.position.y = 0.001;
  runner.receiveShadow = true;
  group.add(runner);

  // Thảm đệm xanh ngọc lục sẫm sát mép sân
  const apronGeo = new THREE.PlaneGeometry(COURT.WIDTH + 1.8, COURT.LENGTH + 2.2);
  const apronMat = new THREE.MeshStandardMaterial({
    color: 0x065f46,
    roughness: 0.42,
    metalness: 0.03
  });
  const apron = new THREE.Mesh(apronGeo, apronMat);
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = 0.002;
  apron.receiveShadow = true;
  group.add(apron);

  // ==========================================================
  // 3. THẢM THI ĐẤU CHÍNH CHUẨN BWF (BWF Emerald Green Mat)
  // ==========================================================
  const matGeo = new THREE.PlaneGeometry(COURT.WIDTH, COURT.LENGTH);
  const matMaterial = new THREE.MeshStandardMaterial({
    color: 0x15803d, // Xanh ngọc lục bảo BWF chuẩn
    roughness: 0.35,
    metalness: 0.02
  });
  const courtMat = new THREE.Mesh(matGeo, matMaterial);
  courtMat.rotation.x = -Math.PI / 2;
  courtMat.position.y = 0.003;
  courtMat.receiveShadow = true;
  group.add(courtMat);

  // ==========================================================
  // 4. VẠCH KẺ SÂN TIÊU CHUẨN TRẮNG SÁNG (BWF White Lines)
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

  // Hai đường biên dọc đôi (X = ±3.05)
  addLine(lw, COURT.LENGTH, -COURT.HALF_WIDTH + lw / 2, 0);
  addLine(lw, COURT.LENGTH, COURT.HALF_WIDTH - lw / 2, 0);

  // Hai đường biên dọc đơn (X = ±2.59)
  addLine(lw, COURT.LENGTH, -COURT.HALF_SINGLES_WIDTH + lw / 2, 0);
  addLine(lw, COURT.LENGTH, COURT.HALF_SINGLES_WIDTH - lw / 2, 0);

  // Hai đường biên ngang cuối sân (Z = ±6.7)
  addLine(COURT.WIDTH, lw, 0, -COURT.HALF_LENGTH + lw / 2);
  addLine(COURT.WIDTH, lw, 0, COURT.HALF_LENGTH - lw / 2);

  // Hai đường giao cầu dài đánh đôi (Z = ±5.94)
  addLine(COURT.WIDTH, lw, 0, -COURT.DOUBLES_LONG_SERVICE_Z);
  addLine(COURT.WIDTH, lw, 0, COURT.DOUBLES_LONG_SERVICE_Z);

  // Hai đường giao cầu ngắn (Z = ±1.98)
  addLine(COURT.WIDTH, lw, 0, -COURT.SHORT_SERVICE_Z);
  addLine(COURT.WIDTH, lw, 0, COURT.SHORT_SERVICE_Z);

  // Đường trung tâm chia ô giao cầu (X = 0)
  const serviceCenterLen = COURT.HALF_LENGTH - COURT.SHORT_SERVICE_Z;
  addLine(lw, serviceCenterLen, 0, -(COURT.SHORT_SERVICE_Z + serviceCenterLen / 2));
  addLine(lw, serviceCenterLen, 0, COURT.SHORT_SERVICE_Z + serviceCenterLen / 2);

  group.add(linesGroup);

  // ==========================================================
  // 5. LƯỚI THI ĐẤU & TRỤ CỘT LƯỚI (Tournament Net System)
  // ==========================================================
  const netGroup = new THREE.Group();

  // Hai cột lưới kim loại
  const postGeo = new THREE.CylinderGeometry(0.04, 0.04, COURT.NET_HEIGHT, 16);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8, roughness: 0.2 });
  const postL = new THREE.Mesh(postGeo, postMat);
  postL.position.set(-COURT.HALF_WIDTH - 0.08, COURT.NET_HEIGHT / 2, 0);
  postL.castShadow = true;
  netGroup.add(postL);

  const postR = new THREE.Mesh(postGeo, postMat);
  postR.position.set(COURT.HALF_WIDTH + 0.08, COURT.NET_HEIGHT / 2, 0);
  postR.castShadow = true;
  netGroup.add(postR);

  // Thân lưới
  const netHeight = 0.76;
  const netTopY = COURT.NET_HEIGHT;
  const netBottomY = netTopY - netHeight;
  const netMeshGeo = new THREE.PlaneGeometry(COURT.WIDTH + 0.16, netHeight);

  // Canvas kẻ lưới mắt cáo siêu thực
  const netCanvas = document.createElement('canvas');
  netCanvas.width = 256;
  netCanvas.height = 128;
  const nctx = netCanvas.getContext('2d');
  nctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
  nctx.fillRect(0, 0, 256, 128);
  nctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  nctx.lineWidth = 1.2;
  for (let x = 0; x < 256; x += 8) {
    nctx.beginPath();
    nctx.moveTo(x, 0);
    nctx.lineTo(x, 128);
    nctx.stroke();
  }
  for (let y = 0; y < 128; y += 8) {
    nctx.beginPath();
    nctx.moveTo(0, y);
    nctx.lineTo(256, y);
    nctx.stroke();
  }

  const netTex = new THREE.CanvasTexture(netCanvas);
  netTex.wrapS = THREE.RepeatWrapping;
  netTex.wrapT = THREE.RepeatWrapping;
  netTex.repeat.set(24, 8);

  const netMeshMat = new THREE.MeshStandardMaterial({
    map: netTex,
    transparent: true,
    opacity: 0.88,
    roughness: 0.4,
    side: THREE.DoubleSide
  });
  const netMesh = new THREE.Mesh(netMeshGeo, netMeshMat);
  netMesh.position.set(0, netBottomY + netHeight / 2, 0);
  netGroup.add(netMesh);

  // Dải băng viền trắng trên đỉnh lưới
  const topTapeGeo = new THREE.BoxGeometry(COURT.WIDTH + 0.16, 0.075, 0.038);
  const topTapeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15 });
  const topTape = new THREE.Mesh(topTapeGeo, topTapeMat);
  topTape.position.set(0, netTopY - 0.035, 0);
  topTape.castShadow = true;
  netGroup.add(topTape);

  group.add(netGroup);

  // ==========================================================
  // 6. GHẾ TRỌNG TÀI CHÍNH & TRỌNG TÀI 3D (Umpire High Chair)
  // ==========================================================
  const chairGroup = new THREE.Group();
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.2 });

  const legGeo = new THREE.CylinderGeometry(0.022, 0.022, 2.1);
  for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.35, 0.35], [0.35, 0.35]]) {
    const leg = new THREE.Mesh(legGeo, metalMat);
    leg.position.set(x, 1.05, z);
    chairGroup.add(leg);
  }
  for (let y = 0.45; y < 1.9; y += 0.35) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.03, 0.1), metalMat);
    step.position.set(0, y, 0);
    chairGroup.add(step);
  }
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.5), chairMat);
  seat.position.set(0, 1.9, 0);
  chairGroup.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.42, 0.06), chairMat);
  back.position.set(0, 2.12, -0.22);
  chairGroup.add(back);

  // Mô hình Trọng tài 3D ngồi điều hành trận đấu
  const umpireModel = new THREE.Group();
  const uBody = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.18, 0.3, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.4 }) // Áo blazer xanh đậm
  );
  uBody.position.set(0, 2.2, 0.05);
  umpireModel.add(uBody);

  const uHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffedd5, roughness: 0.5 })
  );
  uHead.position.set(0, 2.52, 0.05);
  umpireModel.add(uHead);

  // Bảng tính điểm cầm tay của trọng tài
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.02, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 })
  );
  pad.position.set(0, 2.18, 0.24);
  umpireModel.add(pad);

  chairGroup.add(umpireModel);
  chairGroup.position.set(COURT.HALF_WIDTH + 1.35, 0, 0);
  chairGroup.rotation.y = -Math.PI / 2;
  group.add(chairGroup);

  // Thùng đựng quả cầu lông dự phòng (Shuttlecock Caddy)
  const caddyGroup = new THREE.Group();
  const caddyTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.5, 12),
    new THREE.MeshStandardMaterial({ color: 0x16a34a, metalness: 0.2, roughness: 0.3 })
  );
  caddyTube.position.set(COURT.HALF_WIDTH + 1.2, 0.25, 0.8);
  caddyGroup.add(caddyTube);
  group.add(caddyGroup);

  // ==========================================================
  // 7. GHẾ TRỌNG TÀI BIÊN (Line Judges at 4 Corners)
  // ==========================================================
  function createLineJudge(x, z, rotY) {
    const ljGroup = new THREE.Group();
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), chairMat);
    st.position.y = 0.225;
    ljGroup.add(st);

    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.24, 4, 8), new THREE.MeshStandardMaterial({ color: 0x334155 }));
    b.position.y = 0.65;
    ljGroup.add(b);

    const h = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffedd5 }));
    h.position.y = 0.92;
    ljGroup.add(h);

    ljGroup.position.set(x, 0, z);
    ljGroup.rotation.y = rotY;
    return ljGroup;
  }

  group.add(createLineJudge(-COURT.HALF_WIDTH - 0.9, -COURT.HALF_LENGTH - 0.8, 0.8));
  group.add(createLineJudge(COURT.HALF_WIDTH + 0.9, -COURT.HALF_LENGTH - 0.8, -0.8));
  group.add(createLineJudge(-COURT.HALF_WIDTH - 0.9, COURT.HALF_LENGTH + 0.8, 2.3));
  group.add(createLineJudge(COURT.HALF_WIDTH + 0.9, COURT.HALF_LENGTH + 0.8, -2.3));

  // ==========================================================
  // 8. BĂNG GHẾ VẬN ĐỘNG VIÊN & TÚI ĐỰNG ĐỒ (Players Bench)
  // ==========================================================
  const benchGroup = new THREE.Group();
  const pBench = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.45, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
  );
  pBench.position.set(-COURT.HALF_WIDTH - 1.4, 0.225, 0);
  benchGroup.add(pBench);

  // Túi vợt cầu lông
  const bagGeo = new THREE.CapsuleGeometry(0.18, 0.6, 6, 8);
  const bagMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
  const bag = new THREE.Mesh(bagGeo, bagMat);
  bag.rotation.x = Math.PI / 2;
  bag.position.set(-COURT.HALF_WIDTH - 1.4, 0.58, -0.4);
  benchGroup.add(bag);

  // Chai nước thể thao
  const bottle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.22, 8),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2 })
  );
  bottle.position.set(-COURT.HALF_WIDTH - 1.4, 0.56, 0.5);
  benchGroup.add(bottle);

  group.add(benchGroup);

  // ==========================================================
  // 9. CỘT ĐÈN CHIẾU SÂN VẬN ĐỘNG 3D (Stadium Floodlights)
  // ==========================================================
  function createFloodlight(x, z, rotY) {
    const pGroup = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.12, 10.5, 12),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.25 })
    );
    pole.position.y = 5.25;
    pGroup.add(pole);

    const lampBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.8, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 })
    );
    lampBox.position.set(0, 10.2, 0.25);
    lampBox.rotation.x = 0.4;
    pGroup.add(lampBox);

    const bulb = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 0.7),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    bulb.position.set(0, 10.2, 0.51);
    bulb.rotation.x = 0.4;
    pGroup.add(bulb);

    pGroup.position.set(x, 0, z);
    pGroup.rotation.y = rotY;
    return pGroup;
  }

  group.add(createFloodlight(-11.0, -11.0, 0.6));
  group.add(createFloodlight(11.0, -11.0, -0.6));
  group.add(createFloodlight(-11.0, 11.0, 2.5));
  group.add(createFloodlight(11.0, 11.0, -2.5));

  // ==========================================================
  // 10. BẢNG QUẢNG CÁO LED THỂ THAO TOURNAMENT (LED Banners)
  // ==========================================================
  const arenaGroup = new THREE.Group();

  function createLedBanner(text, w, h, x, z, rotY, bgColor = '#0284c7', fgColor = '#ffffff') {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 1024, 0);
    grad.addColorStop(0, bgColor);
    grad.addColorStop(0.5, '#0284c7');
    grad.addColorStop(1, bgColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 128);

    ctx.fillStyle = fgColor;
    ctx.font = '900 48px "Outfit", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 512, 64);

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 1016, 120);

    const tex = new THREE.CanvasTexture(canvas);
    const bannerGeo = new THREE.BoxGeometry(w, h, 0.14);
    const bannerMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.2,
      emissive: new THREE.Color(0x0284c7),
      emissiveIntensity: 0.25
    });
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(x, h / 2, z);
    banner.rotation.y = rotY;
    banner.castShadow = true;
    return banner;
  }

  // 2 Banner dọc hai bên sân đấu
  arenaGroup.add(createLedBanner('⚡ BIRDIE BASH 3D · BWF WORLD TOUR SUPER 1000 ⚡', 32, 1.0, -7.4, 0, Math.PI / 2, '#0369a1', '#fef08a'));
  arenaGroup.add(createLedBanner('🏸 C-FIBER WORLD BADMINTON ARENA · CHAMPIONSHIP 🏸', 32, 1.0, 7.4, 0, -Math.PI / 2, '#047857', '#ffffff'));

  // Banner phía sau sân đối thủ (Z = -10.5m)
  arenaGroup.add(createLedBanner('🔥 POWER SMASH TOURNAMENT 2026 🔥', 14.8, 1.0, 0, -10.5, 0, '#be123c', '#ffffff'));

  // ==========================================================
  // 11. MÀN HÌNH LED KHỔNG LỒ TREO TRẦN (Giant 3D Arena Jumbotron)
  // ==========================================================
  const jumbotronGroup = new THREE.Group();
  jumbotronGroup.position.set(0, 10.8, -14.8);

  const jFrame = new THREE.Mesh(
    new THREE.BoxGeometry(11.5, 4.6, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.8, roughness: 0.3 })
  );
  jumbotronGroup.add(jFrame);

  const jCanvas = document.createElement('canvas');
  jCanvas.width = 1024;
  jCanvas.height = 512;
  const jctx = jCanvas.getContext('2d');

  jctx.fillStyle = '#020617';
  jctx.fillRect(0, 0, 1024, 512);

  jctx.strokeStyle = '#38bdf8';
  jctx.lineWidth = 10;
  jctx.strokeRect(10, 10, 1004, 492);

  jctx.fillStyle = '#facc15';
  jctx.font = '900 42px "Outfit", sans-serif';
  jctx.textAlign = 'center';
  jctx.fillText('🏆 BWF WORLD CHAMPIONSHIP 2026 🏆', 512, 70);

  jctx.fillStyle = '#ffffff';
  jctx.font = '800 64px "Outfit", sans-serif';
  jctx.fillText('BIRDIE BASH 3D ARENA', 512, 160);

  jctx.fillStyle = '#38bdf8';
  jctx.font = '900 52px "Outfit", sans-serif';
  jctx.fillText('⚡ GRAND FINALS ⚡', 512, 240);

  jctx.fillStyle = '#a78bfa';
  jctx.font = '700 36px "Inter", sans-serif';
  jctx.fillText('LIVE BROADCAST · SMASH / DROP / DIVE REALTIME', 512, 330);

  jctx.fillStyle = '#10b981';
  jctx.font = '800 40px "Outfit", sans-serif';
  jctx.fillText('● POWERED BY C-FIBER & FIREBASE REALTIME', 512, 420);

  const jTex = new THREE.CanvasTexture(jCanvas);
  const jScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(10.8, 4.1),
    new THREE.MeshBasicMaterial({ map: jTex })
  );
  jScreen.position.set(0, 0, 0.31);
  jumbotronGroup.add(jScreen);

  const cableGeo = new THREE.CylinderGeometry(0.02, 0.02, 5.5);
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.1 });
  for (const cx of [-4.5, 4.5]) {
    const cable = new THREE.Mesh(cableGeo, cableMat);
    cable.position.set(cx, 4.5, 0);
    jumbotronGroup.add(cable);
  }

  arenaGroup.add(jumbotronGroup);

  // ==========================================================
  // 12. VÒM MÁI VÀ DÀN GIÁP THÉP TRẦN NHÀ THI ĐẤU (Arena Steel Trusses)
  // ==========================================================
  const trussMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.25 });
  for (let tz = -16; tz <= 16; tz += 8) {
    const archGeo = new THREE.CylinderGeometry(0.12, 0.12, 38);
    const arch = new THREE.Mesh(archGeo, trussMat);
    arch.rotation.z = Math.PI / 2;
    arch.position.set(0, 15.5, tz);
    arenaGroup.add(arch);

    for (let tx = -14; tx <= 14; tx += 7) {
      const barGeo = new THREE.CylinderGeometry(0.06, 0.06, 8);
      const bar = new THREE.Mesh(barGeo, trussMat);
      bar.rotation.x = Math.PI / 2;
      bar.position.set(tx, 15.5, tz);
      arenaGroup.add(bar);
    }
  }

  // ==========================================================
  // 13. KHÁN ĐÀI BỀ THẾ 3 PHÍA & ĐOÀN CỔ ĐỘNG VIÊN CHIBI SỐNG ĐỘNG
  // ==========================================================
  const spectators = [];
  const spectatorColors = [0xef4444, 0x06b6d4, 0x10b981, 0xf59e0b, 0x8b5cf6, 0xec4899, 0x3b82f6, 0xf97316];

  // Khán đài chính phía sau sân đối thủ (Z < 0)
  for (let row = 0; row < 5; row++) {
    const stepZ = -11.8 - row * 1.1;
    const stepY = row * 0.72 + 0.35;

    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(24, 0.55, 1.0),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4 })
    );
    bench.position.set(0, stepY - 0.25, stepZ);
    arenaGroup.add(bench);

    for (let col = -10.5; col <= 10.5; col += 1.35) {
      const specGroup = new THREE.Group();
      const colRand = spectatorColors[Math.floor(Math.random() * spectatorColors.length)];

      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.2, 0.3, 4, 8),
        new THREE.MeshStandardMaterial({ color: colRand, roughness: 0.35 })
      );
      body.position.y = 0.34;
      specGroup.add(body);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.17, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffedd5, roughness: 0.5 })
      );
      head.position.y = 0.68;
      specGroup.add(head);

      if (Math.random() > 0.4) {
        const band = new THREE.Mesh(
          new THREE.CylinderGeometry(0.175, 0.175, 0.05, 12),
          new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        band.position.y = 0.72;
        specGroup.add(band);
      }

      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.38, 6),
        new THREE.MeshBasicMaterial({ color: colRand })
      );
      stick.position.set(0.24, 0.48, 0.16);
      stick.rotation.z = -0.4;
      specGroup.add(stick);

      specGroup.position.set(col + (Math.random() - 0.5) * 0.2, stepY, stepZ);
      arenaGroup.add(specGroup);

      spectators.push({
        group: specGroup,
        baseY: stepY,
        phase: Math.random() * Math.PI * 2,
        speed: 2.8 + Math.random() * 3.5
      });
    }
  }

  // Khán đài cánh trái
  for (let row = 0; row < 3; row++) {
    const stepX = -12.5 - row * 1.1;
    const stepY = row * 0.75 + 0.5;
    for (let z = -8; z <= 8; z += 1.8) {
      const specGroup = new THREE.Group();
      const colRand = spectatorColors[Math.floor(Math.random() * spectatorColors.length)];

      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.2, 0.3, 4, 8),
        new THREE.MeshStandardMaterial({ color: colRand })
      );
      body.position.y = 0.34;
      specGroup.add(body);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.17, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffedd5 })
      );
      head.position.y = 0.68;
      specGroup.add(head);

      specGroup.position.set(stepX, stepY, z);
      specGroup.rotation.y = Math.PI / 2;
      arenaGroup.add(specGroup);

      spectators.push({
        group: specGroup,
        baseY: stepY,
        phase: Math.random() * Math.PI * 2,
        speed: 2.5 + Math.random() * 3
      });
    }
  }

  // Khán đài cánh phải
  for (let row = 0; row < 3; row++) {
    const stepX = 12.5 + row * 1.1;
    const stepY = row * 0.75 + 0.5;
    for (let z = -8; z <= 8; z += 1.8) {
      const specGroup = new THREE.Group();
      const colRand = spectatorColors[Math.floor(Math.random() * spectatorColors.length)];

      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.2, 0.3, 4, 8),
        new THREE.MeshStandardMaterial({ color: colRand })
      );
      body.position.y = 0.34;
      specGroup.add(body);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.17, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffedd5 })
      );
      head.position.y = 0.68;
      specGroup.add(head);

      specGroup.position.set(stepX, stepY, z);
      specGroup.rotation.y = -Math.PI / 2;
      arenaGroup.add(specGroup);

      spectators.push({
        group: specGroup,
        baseY: stepY,
        phase: Math.random() * Math.PI * 2,
        speed: 2.5 + Math.random() * 3
      });
    }
  }

  // Tường nhà thi đấu màu xám xanh đậm hiện đại
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(42, 18, 0.5), wallMat);
  backWall.position.set(0, 9, -18);
  arenaGroup.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 18, 52), wallMat);
  leftWall.position.set(-18, 9, 0);
  arenaGroup.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 18, 52), wallMat);
  rightWall.position.set(18, 9, 0);
  arenaGroup.add(rightWall);

  group.add(arenaGroup);

  return {
    mesh: group,
    spectators,
    update: (time) => {
      for (const s of spectators) {
        s.group.position.y = s.baseY + Math.sin(time * s.speed + s.phase) * 0.12;
      }
    }
  };
}
