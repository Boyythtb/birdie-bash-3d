import * as THREE from 'three';
import './style.css';
import { createCourt } from './court.js';
import { Character } from './character.js';
import { Shuttlecock } from './shuttlecock.js';
import { ParticleSystem } from './particles.js';
import { BotAI } from './ai.js';
import { GameManager } from './game.js';
import { setupUI } from './ui.js';

// Khởi tạo Three.js Scene với nền nhà thi đấu BWF World Tour rực rỡ, độ tương phản cao
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f1d);
scene.fog = new THREE.FogExp2(0x0a0f1d, 0.007);

// GÓC CAMERA TRUYỀN HÌNH BAO QUÁT TOÀN DIỆN (Full Court Broadcast Cam)
const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 7.8, 14.0);
camera.lookAt(0, 0.4, 0.4);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;

// 1. Hệ thống chiếu sáng nhà thi đấu Olympic rực rỡ
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 1.25);
hemiLight.position.set(0, 24, 0);
scene.add(hemiLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 2.1);
mainLight.position.set(6, 20, 8);
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

const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
fillLight.position.set(-8, 14, -8);
scene.add(fillLight);

// 2. Thêm sân cầu lông
const court = createCourt();
scene.add(court.mesh);

// 3. Khởi tạo Nhân vật Người chơi (Player ở Z > 0, nhìn đối diện về phía lưới)
const player = new Character({
  color: 0xf59e0b,
  secondaryColor: 0xffedd5,
  jerseyColor: 0x0284c7,
  jerseyNumber: '7',
  name: 'Shiba Dũng Cảm',
  isPlayer: true,
  initialPos: new THREE.Vector3(0, 0, 4.5)
});
scene.add(player.group);

// 4. Khởi tạo Đối thủ Máy (Bot ở Z < 0, nhìn đối diện về phía người chơi)
const bot = new Character({
  color: 0x1e293b,
  secondaryColor: 0xffffff,
  jerseyColor: 0xef4444,
  jerseyNumber: '10',
  name: 'Kuro Neko',
  isPlayer: false,
  initialPos: new THREE.Vector3(0, 0, -4.5)
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
  camera.fov = isPortrait ? 58 : 48;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  if (isPortrait) {
    gameManager.defaultCamPos.set(0, 9.2, 16.5);
    gameManager.defaultCamLookAt.set(0, 0.4, 0.5);
  } else {
    gameManager.defaultCamPos.set(0, 7.8, 14.0);
    gameManager.defaultCamLookAt.set(0, 0.4, 0.4);
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
