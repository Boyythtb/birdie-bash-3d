import * as THREE from 'three';
import './style.css';
import { createCourt } from './court.js';
import { Character } from './character.js';
import { Shuttlecock } from './shuttlecock.js';
import { ParticleSystem } from './particles.js';
import { BotAI } from './ai.js';
import { GameManager } from './game.js';
import { setupUI } from './ui.js';

// Khởi tạo Three.js Scene với nền nhà thi đấu sáng sủa, rực rỡ
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf1f5f9);
scene.fog = new THREE.FogExp2(0xf1f5f9, 0.01);

// GÓC CAMERA TRUYỀN HÌNH BAO QUÁT TOÀN DIỆN (Full Court Broadcast Cam)
// Vị trí camera cao và lùi xa về sau để nhìn thấy toàn bộ vạch cuối sân của người chơi
const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 7.8, 14.0);
camera.lookAt(0, 0.4, 0.4);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

// 1. Hệ thống chiếu sáng ban ngày rực rỡ
const hemiLight = new THREE.HemisphereLight(0xffffff, 0xfde68a, 1.1);
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 1.6);
mainLight.position.set(5, 16, 7);
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 2048;
mainLight.shadow.mapSize.height = 2048;
mainLight.shadow.camera.near = 1;
mainLight.shadow.camera.far = 40;
mainLight.shadow.camera.left = -12;
mainLight.shadow.camera.right = 12;
mainLight.shadow.camera.top = 18;
mainLight.shadow.camera.bottom = -18;
mainLight.shadow.bias = -0.0004;
scene.add(mainLight);

const fillLight = new THREE.DirectionalLight(0xbae6fd, 0.65);
fillLight.position.set(-6, 12, -8);
scene.add(fillLight);

// 2. Thêm sân cầu lông
const court = createCourt();
scene.add(court.mesh);

// 3. Khởi tạo Nhân vật Người chơi (Player ở Z > 0, nhìn đối diện về phía lưới)
const player = new Character({
  color: 0xf59e0b,
  secondaryColor: 0xffedd5,
  name: 'Player',
  isPlayer: true,
  initialPos: new THREE.Vector3(0, 0, 4.5)
});
scene.add(player.group);

// 4. Khởi tạo Đối thủ Máy (Bot ở Z < 0, nhìn đối diện về phía người chơi)
const bot = new Character({
  color: 0x334155,
  secondaryColor: 0xffffff,
  name: 'Bot',
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
    player.bodyMesh.material.color.setHex(selectedChar.color);
    player.headMesh.material.color.setHex(selectedChar.color);
    botAI.setDifficulty(difficulty);
    gameManager.startGame(difficulty);
  },
  (selectedChar) => {
    // Đổi màu & biểu diễn nhảy nhót khi người chơi bấm chọn nhân vật trực tiếp trên sân
    player.bodyMesh.material.color.setHex(selectedChar.color);
    player.headMesh.material.color.setHex(selectedChar.color);
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
    gameManager.defaultCamPos.set(0, 9.0, 16.0);
    gameManager.defaultCamLookAt.set(0, 0.4, 0.5);
  } else {
    gameManager.defaultCamPos.set(0, 7.8, 14.0);
    gameManager.defaultCamLookAt.set(0, 0.4, 0.4);
  }
}

updateCameraAspect();
window.addEventListener('resize', updateCameraAspect);

// Vòng lặp chính của Game (Main 60fps Game Loop)
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsedTime = clock.getElapsedTime();

  // 1. Cập nhật khán giả nhấp nhô vui nhộn
  court.update(elapsedTime);

  // 2. Cập nhật hạt hiệu ứng (Hit sparks & Dust)
  particles.update(dt);

  // 3. Cập nhật vật lý quả cầu lông
  shuttlecock.update(dt);

  // 4. Cập nhật Bot AI
  if (gameManager.state === 'RALLY') {
    botAI.update(dt, player.group.position);
  } else {
    bot.update(dt);
  }

  // 5. Cập nhật Game Manager & Player input
  gameManager.update(dt);

  // 6. Render khung hình
  renderer.render(scene, camera);
}

animate();
