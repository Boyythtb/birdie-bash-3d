import * as THREE from 'three';
import './style.css';
import { createCourt } from './court.js';
import { Character } from './character.js';
import { Shuttlecock } from './shuttlecock.js';
import { ParticleSystem } from './particles.js';
import { BotAI } from './ai.js';
import { GameManager } from './game.js';
import { setupUI } from './ui.js';
import { sounds } from './audio.js';

// Khởi tạo Three.js Scene với nền Pastel Pink ấm áp chuẩn Birdie Bash
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfdf2f8);
scene.fog = new THREE.FogExp2(0xfdf2f8, 0.006);

// GÓC CAMERA ISOMETRIC 3/4 ĐẶC TRƯNG CHUẨN BIRDIE BASH (Màn hình chờ góc chéo)
const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(-7.2, 10.5, 13.2);
camera.lookAt(1.0, 0.4, -0.5);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

// 1. Hệ thống chiếu sáng ánh nắng tự nhiên ấm áp
const hemiLight = new THREE.HemisphereLight(0xfffbeb, 0xfce7f3, 1.25);
hemiLight.position.set(0, 24, 0);
scene.add(hemiLight);

const mainLight = new THREE.DirectionalLight(0xffedd5, 1.8);
mainLight.position.set(10, 18, 6);
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 2048;
mainLight.shadow.mapSize.height = 2048;
mainLight.shadow.camera.near = 1;
mainLight.shadow.camera.far = 40;
mainLight.shadow.camera.left = -14;
mainLight.shadow.camera.right = 14;
mainLight.shadow.camera.top = 20;
mainLight.shadow.camera.bottom = -20;
mainLight.shadow.bias = -0.0004;
scene.add(mainLight);

const fillLight = new THREE.DirectionalLight(0xbae6fd, 0.65);
fillLight.position.set(-8, 12, -8);
scene.add(fillLight);

// 2. Thêm sân cầu lông
const court = createCourt();
scene.add(court.mesh);

// 3. Khởi tạo Nhân vật Người chơi (Player ở Z > 0, chú chim vàng chibi đáng yêu)
const player = new Character({
  color: 0xfde047,
  secondaryColor: 0xffedd5,
  jerseyColor: 0x38bdf8,
  jerseyNumber: '1',
  name: 'Birdie Vàng',
  isPlayer: true,
  initialPos: new THREE.Vector3(0.5, 0, 4.2)
});
scene.add(player.group);

// 3b. Khởi tạo Đồng đội Đánh đôi (Teammate - Chibi Lam siêu tốc độ)
const teammate = new Character({
  color: 0x38bdf8,
  secondaryColor: 0xf0f9ff,
  jerseyColor: 0x0284c7,
  jerseyNumber: '9',
  name: 'Đồng Đội',
  isPlayer: true,
  initialPos: new THREE.Vector3(-1.2, 0, 3.2)
});
teammate.group.visible = false;
scene.add(teammate.group);

// 4. Khởi tạo Đối thủ Máy 1 (Bot 1 ở Z < 0, chú chim tím)
const bot = new Character({
  color: 0xc084fc,
  secondaryColor: 0xfdf4ff,
  jerseyColor: 0xf472b6,
  jerseyNumber: '2',
  name: 'Bot 1',
  isPlayer: false,
  initialPos: new THREE.Vector3(-0.8, 0, -4.2)
});
scene.add(bot.group);

// 4b. Khởi tạo Đối thủ Máy 2 (Bot 2 ở Z < 0, chú chim cam smash búa bổ)
const bot2 = new Character({
  color: 0xfb923c,
  secondaryColor: 0xffedd5,
  jerseyColor: 0xc2410c,
  jerseyNumber: '88',
  name: 'Bot 2',
  isPlayer: false,
  initialPos: new THREE.Vector3(1.0, 0, -3.2)
});
bot2.group.visible = false;
scene.add(bot2.group);

// 5. Khởi tạo Quả cầu lông (Shuttlecock)
const shuttlecock = new Shuttlecock();
scene.add(shuttlecock.group);
scene.add(shuttlecock.indicatorGroup);
scene.add(shuttlecock.trailLine);

// 6. Hệ thống hiệu ứng hạt (Particles)
const particles = new ParticleSystem(scene);

let uiHandler = null;

// 7. Khởi tạo Quản lý trận đấu (Game Manager)
const gameManager = new GameManager({
  scene,
  camera,
  player,
  teammate,
  bot,
  bot2,
  court,
  shuttlecock,
  particles,
  onUIUpdate: (data) => {
    if (uiHandler && uiHandler.updateHUD) {
      uiHandler.updateHUD(data);
    }
  }
});

// 8. Khởi tạo Trí tuệ nhân tạo (Bot AI 1v1) với hiệu ứng smash tóe lửa và âm thanh
const botAI = new BotAI(bot, shuttlecock, 'pro', {
  particles,
  sounds,
  onShot: (shotType, pos) => {
    gameManager.registerRallyHit('bot', shotType);
    if (shotType === 'smash') {
      gameManager.shakeIntensity = 0.52;
      gameManager.notifyUI('💥 ĐỐI THỦ SMASH TÓE LỬA! 🔥', `Rally: ${gameManager.rallyCount} chạm`, 'smash');
    }
  }
});

// 9. Khởi tạo Giao diện người dùng (UI)
uiHandler = setupUI(
  gameManager,
  botAI,
  (difficulty, selectedChar) => {
    if (player.updateAppearance) player.updateAppearance(selectedChar);
    botAI.setDifficulty(difficulty);
    gameManager.startGame(difficulty);
  },
  (selectedChar) => {
    // Đổi diện mạo & biểu diễn nhảy nhót khi người chơi bấm chọn nhân vật trực tiếp trên sân
    if (player.updateAppearance) player.updateAppearance(selectedChar);
    player.playAction('celebrate');
    setTimeout(() => {
      if (gameManager.state === 'MENU') player.state = 'idle';
    }, 700);
  }
);

// Gắn canvas vào DOM
const container = document.getElementById('canvas-container');
container.appendChild(renderer.domElement);

// Hàm cập nhật tỷ lệ camera theo màn hình (Tự động thích ứng nếu là điện thoại dọc)
function updateCameraAspect() {
  const isPortrait = window.innerWidth < window.innerHeight;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = isPortrait ? 56 : 46;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  if (isPortrait) {
    // Màn hình chờ & lúc hết game: Góc chéo 3/4 Isometric sinh động
    gameManager.lobbyCamPos.set(-5.8, 12.2, 14.8);
    gameManager.lobbyCamLookAt.set(1.0, 0.4, -0.4);
    // Trong lúc thi đấu (SERVE, RALLY, POINT): Camera thẳng từ sau lưng người chơi nhìn dọc sân
    gameManager.matchCamPos.set(0, 9.6, 14.2);
    gameManager.matchCamLookAt.set(0, 0.5, -0.6);
  } else {
    // Màn hình chờ & lúc hết game: Góc chéo 3/4 Isometric sinh động
    gameManager.lobbyCamPos.set(-7.2, 10.5, 13.2);
    gameManager.lobbyCamLookAt.set(1.0, 0.4, -0.5);
    // Trong lúc thi đấu (SERVE, RALLY, POINT): Camera thẳng từ sau lưng người chơi nhìn dọc sân
    gameManager.matchCamPos.set(0, 8.0, 13.4);
    gameManager.matchCamLookAt.set(0, 0.6, -0.8);
  }

  // Khởi tạo hoặc khi đang ở sảnh chờ: Đồng bộ ngay lập tức để góc nhìn chuẩn xác 100% không bị lệch
  if (gameManager.state === 'MENU') {
    gameManager.currentCamPos.copy(gameManager.lobbyCamPos);
    gameManager.currentCamLookAt.copy(gameManager.lobbyCamLookAt);
    camera.position.copy(gameManager.lobbyCamPos);
    camera.lookAt(gameManager.lobbyCamLookAt);
  }
}

updateCameraAspect();
window.addEventListener('resize', updateCameraAspect);

// 10. Game Loop (Vòng lặp đồ họa chính)
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  try {
    const dt = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.getElapsedTime();

    // Cập nhật hoạt cảnh khán giả & trọng tài (nhìn theo quả cầu)
    if (court.update) court.update(elapsed, dt, shuttlecock.position);

    // Cập nhật quả cầu lông & vệt sáng
    shuttlecock.update(dt);

    // Cập nhật hạt hiệu ứng (tia lửa, khói bụi, sóng xung kích)
    particles.update(dt);

    // Cập nhật animation các nhân vật
    if (!gameManager.isDoubles) {
      if (teammate.group.visible) teammate.update(dt);
      if (bot2.group.visible) bot2.update(dt);

      // Cập nhật Bot AI 1v1
      if (!gameManager.isMultiplayer && gameManager.state === 'RALLY') {
        botAI.update(dt, player.group.position);
      } else if (!gameManager.isMultiplayer && gameManager.state === 'SERVE') {
        bot.update(dt);
      }
    } else {
      // Trong chế độ đánh đôi 2v2:
      // Khi giao cầu hoặc ngoài sảnh menu: cập nhật idle animation cho các nhân vật
      if (gameManager.state === 'SERVE' || gameManager.state === 'MENU') {
        if (teammate.group.visible) teammate.update(dt);
        if (bot.group.visible) bot.update(dt);
        if (bot2.group.visible) bot2.update(dt);
      }
      // Khi đang RALLY trong 2v2: gameManager.updateDoubles(dt) tự điều phối chạy, đánh và bọc lót
    }

    // Cập nhật game manager
    gameManager.update(dt);

    // Render scene
    renderer.render(scene, camera);
  } catch (err) {
    console.error('Lỗi trong animation loop:', err);
  }
}

animate();
