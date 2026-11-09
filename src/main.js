import * as THREE from 'three';
import './style.css';
import { createCourt } from './court.js';
import { Character } from './character.js';
import { Shuttlecock } from './shuttlecock.js';
import { ParticleSystem } from './particles.js';
import { BotAI } from './ai.js';
import { GameManager } from './game.js';
import { setupUI } from './ui.js';

// Khởi tạo Three.js Scene với nền Pastel Pink ấm áp chuẩn Birdie Bash
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfdf2f8);
scene.fog = new THREE.FogExp2(0xfdf2f8, 0.006);

// GÓC CAMERA ISOMETRIC 3/4 ĐẶC TRƯNG CHUẨN BIRDIE BASH
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

// 4. Khởi tạo Đối thủ Máy (Bot ở Z < 0, chú chim tím pastel)
const bot = new Character({
  color: 0xc084fc,
  secondaryColor: 0xfdf4ff,
  jerseyColor: 0xf472b6,
  jerseyNumber: '2',
  name: 'Birdie Tím',
  isPlayer: false,
  initialPos: new THREE.Vector3(-0.8, 0, -4.2)
});
scene.add(bot.group);

// 5. Khởi tạo Quả cầu lông (Shuttlecock)
const shuttlecock = new Shuttlecock();
scene.add(shuttlecock.group);
scene.add(shuttlecock.indicatorGroup);
scene.add(shuttlecock.trailLine);

// 6. Hệ thống hiệu ứng hạt (Particles)
const particles = new ParticleSystem(scene);

// 7. Khởi tạo Trí tuệ nhân tạo (Bot AI)
const botAI = new BotAI(bot, shuttlecock, 'pro');

let uiHandler = null;

// 8. Khởi tạo Quản lý trận đấu (Game Manager)
const gameManager = new GameManager({
  scene,
  camera,
  player,
  bot,
  shuttlecock,
  particles,
  onUIUpdate: (data) => {
    if (uiHandler && uiHandler.updateHUD) {
      uiHandler.updateHUD(data);
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
    gameManager.defaultCamPos.set(-5.8, 12.2, 14.8);
    gameManager.defaultCamLookAt.set(1.0, 0.4, -0.4);
  } else {
    gameManager.defaultCamPos.set(-7.2, 10.5, 13.2);
    gameManager.defaultCamLookAt.set(1.0, 0.4, -0.5);
  }
}

updateCameraAspect();
window.addEventListener('resize', updateCameraAspect);

// 10. Game Loop (Vòng lặp đồ họa chính)
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.getElapsedTime();

  // Cập nhật hoạt cảnh khán giả
  if (court.update) court.update(elapsed);

  // Cập nhật quả cầu lông
  shuttlecock.update(dt);

  // Cập nhật hạt hiệu ứng
  particles.update(dt);

  // Nếu đang đánh với bot ở trạng thái RALLY
  if (!gameManager.isMultiplayer && gameManager.state === 'RALLY') {
    botAI.update(dt);
  } else if (!gameManager.isMultiplayer && gameManager.state === 'SERVE') {
    bot.update(dt);
  }

  // Cập nhật game manager
  gameManager.update(dt);

  // Render scene
  renderer.render(scene, camera);
}

animate();
