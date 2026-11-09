
// ===================================================
// HỆ THỐNG THÔNG BÁO TOAST CAO CẤP (THAY THẾ TOÀN BỘ ALERT)
// ===================================================
export function showGameToast(message, type = 'info', duration = 2800) {
  let container = document.getElementById('game-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'game-toast-container';
    container.className = 'game-toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: '✅',
    warning: '⚠️',
    error: '❌',
    info: '🏸'
  };

  const toast = document.createElement('div');
  toast.className = `game-toast-pill toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || '✨'}</span>
    <span class="toast-text">${message}</span>
  `;

  container.appendChild(toast);

  // Hiệu ứng vào
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Tự động mờ và xóa sau duration
  setTimeout(() => {
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(() => {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, 300);
  }, duration);
}

import confetti from 'canvas-confetti';
import { network } from './network.js';

export function setupUI(gameManager, botAI, onStartGame, onCharacterChange) {
  const app = document.getElementById('app');

  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches;
  if (isTouchDevice) {
    document.body.classList.add('has-touch');
  } else {
    document.body.classList.add('is-desktop');
  }

  // TÊN NGƯỜI CHƠI TÙY CHỌN (MẶC ĐỊNH MÃ TỰ ĐỘNG, ĐỂ MỌI NGƯỜI TỰ ĐẶT TÊN)
  const randNum = Math.floor(1000 + Math.random() * 9000);
  let playerName = localStorage.getItem('tboy_player_name') || `Tay Vợt #${randNum}`;

  app.innerHTML = `
    <!-- 3D WebGL Canvas Container -->
    <div id="canvas-container"></div>

    <!-- 1. MÀN HÌNH TẢI GAME (SPLASH LOADING) -->
    <div id="loading-screen" class="loading-screen">
      <div class="loading-box">
        <span class="loading-birdie-bounce">🏸</span>
        <div class="tboy-loading-brand">
          <span class="tboy-studio-badge">TBOY STUDIO</span>
          <h2 class="loading-brand">Tboy <span>Badminton 3D</span></h2>
        </div>
        <div class="loading-track">
          <div id="loading-bar-inner" class="loading-fill"></div>
        </div>
        <span id="loading-status-text" class="loading-txt">Đang chuẩn bị sân thi đấu...</span>
      </div>
    </div>

    <!-- 2. HUD TRONG TRẬN ĐẤU (SCOREBOARD CÂN ĐỐI 100% - TÍCH HỢP ICON CỬA SỔ THOÁT RA LIỀN KHỐI) -->
    <div id="hud" class="hud-top-bar hidden">
      <!-- VIÊN THUỐC TỶ SỐ TRUNG TÂM (CHÍNH GIỮA TUYỆT ĐỐI) -->
      <div class="match-hud-pill">
        <!-- ĐỘI BẠN -->
        <div class="hud-player">
          <div class="hud-avatar-box">
            <span id="hud-avatar" class="hud-emoji">🐥</span>
            <span id="hud-serve-p1" class="hud-serve-badge" title="Đang giao cầu">🏸</span>
          </div>
          <div class="hud-name-col">
            <span id="hud-player-name" class="hud-label">${playerName.toUpperCase()}</span>
            <span class="hud-team-tag blue">BẠN</span>
          </div>
          <span id="player-score" class="hud-score hud-score-p1">0</span>
        </div>

        <!-- KHỐI GIỮA: VS & RALLY -->
        <div class="hud-center">
          <div class="hud-vs-row">
            <span class="hud-vs">VS</span>
            <span id="diff-tag" class="hud-diff">PRO</span>
          </div>
          <div id="rally-badge" class="hud-rally">
            <span class="hud-rally-icon">🔥</span>
            <span id="rally-text">RALLY 0</span>
          </div>
        </div>

        <!-- ĐỐI THỦ -->
        <div class="hud-bot">
          <span id="bot-score" class="hud-score hud-score-bot">0</span>
          <div class="hud-name-col align-right">
            <span id="hud-bot-name" class="hud-label">MÁY (BOT)</span>
            <span class="hud-team-tag red">ĐỐI THỦ</span>
          </div>
          <div class="hud-avatar-box">
            <span id="hud-bot-avatar" class="hud-emoji">🪻</span>
            <span id="hud-serve-bot" class="hud-serve-badge hidden" title="Đang giao cầu">🏸</span>
          </div>
        </div>

        <!-- ĐƯỜNG PHÂN CÁCH TINH TẾ -->
        <div class="hud-pill-divider"></div>

        <!-- ICON CỬA SỔ THOÁT RA NẰM NGAY TRÊN THANH -->
        <button id="btn-pause-game" class="hud-pill-exit-btn" title="Thoát về màn hình chính" aria-label="Thoát trận">
          <svg class="exit-window-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
            <polyline points="10 17 15 12 10 7"></polyline>
            <line x1="15" y1="12" x2="3" y2="12"></line>
          </svg>
        </button>
      </div>

      <!-- NÚT PHÍM TẮT (ẨN TRÊN MOBILE, CHỈ HIỆN TRÊN DESKTOP) -->
      <button id="btn-toggle-hints" class="hud-ctrl-btn hud-btn-hints" title="Hướng dẫn phím tắt">⌨️ Phím</button>
    </div>

    <!-- POPUP THÔNG BÁO TIMING & GHI ĐIỂM -->
    <div id="banner-notice" class="banner-notice hidden">
      <h2 id="banner-title" class="banner-title">HOÀN HẢO! 🔥</h2>
      <p id="banner-sub" class="banner-sub">Cú đập cực chuẩn</p>
    </div>

    <!-- HƯỚNG DẪN TRÊN MÀN HÌNH (TỰ ĐỘNG ẨN) -->
    <div id="pc-hints" class="pc-hints-card hidden">
      <div class="hints-row">
        <span>🏸 <strong>[SPACE] / Nút Đánh Cầu:</strong> Tự động Smash / Drop / Dive thông minh</span>
        <button id="btn-close-hints" class="btn-close-x">✕</button>
      </div>
      <div class="hints-sub">Joystick / Phím WASD: Di chuyển · K: Smash · L: Bỏ nhỏ · U: Cứu cầu</div>
    </div>

    <!-- ===================================================
         3. ĐIỀU KHIỂN TRONG TRẬN ĐẤU (IN-GAME CONTROLS)
         CHỈ HIỆN KHI ĐANG VÀO TRẬN - ẨN HOÀN TOÀN NGOÀI MENU CHỜ
         =================================================== -->
    <div id="in-game-controls" class="in-game-controls hidden">
      <!-- CẦN ĐIỀU KHIỂN JOYSTICK BÊN TRÁI (CHO ĐIỆN THOẠI & CẢM ỨNG) -->
      <div id="joystick-zone" class="joystick-zone" title="Kéo để di chuyển">
        <div id="joystick-base" class="joystick-base">
          <div class="joystick-ring"></div>
          <div id="joystick-thumb" class="joystick-thumb"></div>
        </div>
      </div>

      <!-- THANH ĐIỀU KHIỂN BÀN PHÍM TRÊN MÁY TÍNH (PC / DESKTOP CONTROLLER HUD - TỰ BIẾN MẤT KHI VÀO GAME) -->
      <div id="desktop-controls-hud" class="desktop-controls-hud faded">
        <button id="btn-close-desktop-hud" class="btn-close-desktop-hud" title="Ẩn hướng dẫn">✕</button>
        <div class="desktop-key-group">
          <div class="keycap-cluster-wasd">
            <span class="keycap key-w">W</span>
            <div class="keycap-row">
              <span class="keycap">A</span>
              <span class="keycap">S</span>
              <span class="keycap">D</span>
            </div>
          </div>
          <span class="key-group-desc">Di Chuyển</span>
        </div>

        <div class="desktop-key-divider"></div>

        <!-- 1 NÚT DUY NHẤT -->
        <div class="desktop-key-group main-one-button" id="desktop-one-btn" role="button" tabindex="0" title="Bấm SPACE hoặc Click Chuột để Đánh Cầu Thông Minh">
          <div class="keycap-hero-row">
            <span class="keycap keycap-space">SPACE</span>
            <span class="keycap-divider-or">HOẶC</span>
            <span class="keycap keycap-mouse">🖱️ CLICK CHUỘT</span>
          </div>
          <div class="one-btn-text">
            <span class="one-btn-badge">✨ 1 NÚT DUY NHẤT ✨</span>
            <span class="one-btn-sub">Tự động Smash trên cao · Bỏ nhỏ sát lưới · Cứu bóng trượt sàn</span>
          </div>
        </div>

        <div class="desktop-key-divider"></div>

        <div class="desktop-key-group skill-keys">
          <div class="skill-keys-row">
            <div class="skill-key-item">
              <span class="keycap">K</span>
              <span class="skill-label">Smash</span>
            </div>
            <div class="skill-key-item">
              <span class="keycap">L</span>
              <span class="skill-label">Bỏ nhỏ</span>
            </div>
            <div class="skill-key-item">
              <span class="keycap keycap-wide">Shift</span>
              <span class="skill-label">Cứu bóng</span>
            </div>
          </div>
          <span class="key-group-desc">Kỹ Năng Thủ Công</span>
        </div>
      </div>

      <!-- 4 NÚT HÀNH ĐỘNG BÊN PHẢI (KÈM PHÍM TẮT ĐẦY ĐỦ TRÊN MÁY TÍNH & ĐIỆN THOẠI) -->
      <div class="action-buttons-pro">
        <button id="btn-dive" class="btn-game-act btn-dive" aria-label="Cứu cầu">
          <span class="act-keycap">SHIFT / U</span>
          <span class="act-icon">💨</span>
          <span class="act-label">CỨU CẦU</span>
        </button>
        <button id="btn-smash" class="btn-game-act btn-smash" aria-label="Smash">
          <span class="act-keycap">K</span>
          <span class="act-icon">💥</span>
          <span class="act-label">SMASH</span>
        </button>
        <button id="btn-drop" class="btn-game-act btn-drop" aria-label="Bỏ nhỏ">
          <span class="act-keycap">L</span>
          <span class="act-icon">🪶</span>
          <span class="act-label">BỎ NHỎ</span>
        </button>
        <button id="btn-hit" class="btn-game-act btn-hit highlight-hit" aria-label="1 Chạm Thông Minh">
          <span class="act-keycap main-keycap">SPACE / Click</span>
          <span class="act-icon">🏸</span>
          <span class="act-label">1 CHẠM</span>
          <span class="act-subhint">THÔNG MINH</span>
        </button>
      </div>
    </div>

    <!-- ===================================================
         3. GIAO DIỆN CHÍNH TBOY BADMINTON (100% TIẾNG VIỆT)
         ZERO SCROLLING - ĐẲNG CẤP & SANG TRỌNG
         =================================================== -->
    <div id="main-menu" class="tboy-menu hidden">
      <!-- CỘT TRÁI: THƯƠNG HIỆU TBOY VÀ DANH SÁCH CHẾ ĐỘ THI ĐẤU -->
      <div class="bb-left-column">
        <div class="bb-brand-box">
          <div class="tboy-studio-badge">✨ TBOY STUDIO PRESENTS ✨</div>
          <div class="bb-logo-group">
            <h1 class="bb-logo-birdie">Tboy</h1>
            <h1 class="bb-logo-bash">Badminton</h1>
          </div>
          <div class="bb-sub-pill">Cầu lông vui nhộn · Tranh tài đỉnh cao</div>
        </div>

        <div class="bb-menu-stack">
          <button id="btn-menu-bot" class="bb-pill-btn active">
            <span>🏸 Đấu Với Máy</span>
          </button>
          <button id="btn-menu-online" class="bb-pill-btn">
            <span>🌐 Đấu Mạng Online</span>
          </button>
          <button id="btn-menu-roster" class="bb-pill-btn">
            <span>👕 Chọn Nhân Vật</span>
          </button>
          <button id="btn-menu-equip" class="bb-pill-btn">
            <span>⚡ Vợt & Vệt Sáng</span>
          </button>
          <button id="btn-menu-help" class="bb-pill-btn">
            <span>📖 Hướng Dẫn Chơi</span>
          </button>
          <button id="btn-menu-settings" class="bb-pill-btn">
            <span>⚙️ Cài Đặt Game</span>
          </button>
        </div>
      </div>

      <!-- CỘT PHẢI: TÊN NGƯỜI CHƠI GHIM CHẶT GÓC TRÊN BÊN PHẢI -->
      <div class="bb-top-bar-right">
        <button class="bb-circle-btn pink" id="btn-bb-info" title="Giới thiệu game">!</button>
        <button class="bb-signin-pill" id="btn-open-rename" title="Bấm để đổi tên">
          <span class="user-icon">👤</span>
          <span id="txt-signin-name">${playerName}</span>
          <span class="edit-badge">✏️</span>
        </button>
      </div>

      <!-- BẢNG XẾP HẠNG BÊN PHẢI (ẨN TRÊN MOBILE ĐỂ SÂN ĐẤU RỘNG RÃI) -->
      <div class="bb-right-column">
        <div class="bb-leaderboard-card">
          <div class="bb-lb-header">
            <span class="bb-lb-title">BẢNG XẾP HẠNG</span>
            <button class="bb-lb-viewall" id="btn-lb-viewall">Xem tất cả</button>
          </div>

          <div class="bb-lb-list">
            <div class="bb-lb-row">
              <div class="bb-lb-rank gold">
                <span class="bb-crown">👑</span>
                <span class="bb-rank-num">1</span>
              </div>
              <div class="bb-lb-avatar blue">🐵</div>
              <span class="bb-lb-name">Siêu Quậy Tboy</span>
              <div class="bb-lb-score">
                <span class="bb-score-num">297</span>
                <span class="bb-score-lbl">TRẬN THẮNG</span>
              </div>
            </div>

            <div class="bb-lb-row">
              <div class="bb-lb-rank silver">
                <span class="bb-rank-num">2</span>
              </div>
              <div class="bb-lb-avatar yellow">🐻</div>
              <span class="bb-lb-name">Vua Đập Cầu</span>
              <div class="bb-lb-score">
                <span class="bb-score-num">227</span>
                <span class="bb-score-lbl">TRẬN THẮNG</span>
              </div>
            </div>

            <div class="bb-lb-row">
              <div class="bb-lb-rank bronze">
                <span class="bb-rank-num">3</span>
              </div>
              <div class="bb-lb-avatar pink">🐱</div>
              <span class="bb-lb-name">Thỏ Tốc Độ</span>
              <div class="bb-lb-score">
                <span class="bb-score-num">134</span>
                <span class="bb-score-lbl">TRẬN THẮNG</span>
              </div>
            </div>
          </div>

          <div class="bb-lb-footer" id="btn-lb-signin">
            Bấm vào tên góc trên để đổi biệt danh của bạn
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL CHỌN ĐỘ KHÓ (ĐẤU VỚI MÁY) -->
    <div id="modal-bot-diff" class="modal-overlay hidden">
      <div class="bb-modal-box">
        <div class="bb-modal-header">
          <h3>CHỌN ĐỘ KHÓ ĐỐI THỦ</h3>
          <button id="btn-close-bot-modal" class="btn-close-x">✕</button>
        </div>
        <!-- CHỌN THỂ THỨC THI ĐẤU -->
        <div class="match-mode-selector">
          <button class="btn-match-mode-tab active" data-mode="1v1" id="tab-bot-1v1">🏸 ĐẤU ĐƠN 1v1</button>
          <button class="btn-match-mode-tab" data-mode="2v2" id="tab-bot-2v2">👥 ĐẤU ĐÔI 2v2</button>
        </div>
        <p class="bb-modal-sub">Chọn cấp độ thử thách của đối thủ:</p>
        <div class="bb-diff-stack">
          <button class="bb-diff-card" data-diff="rookie">
            <span class="bb-diff-icon">🌱</span>
            <div class="bb-diff-info">
              <strong>Tập Sự (Rookie)</strong>
              <span>Cầu bay chậm, thích hợp làm quen nhịp</span>
            </div>
          </button>
          <button class="bb-diff-card active" data-diff="pro">
            <span class="bb-diff-icon">⚡</span>
            <div class="bb-diff-info">
              <strong>Kỹ Thuật (Pro)</strong>
              <span>Phản xạ nhanh, biết Smash & Bỏ nhỏ sát lưới</span>
            </div>
          </button>
          <button class="bb-diff-card" data-diff="ace">
            <span class="bb-diff-icon">🔥</span>
            <div class="bb-diff-info">
              <strong>Cao Thủ (Ace)</strong>
              <span>Đập cắm góc hiểm, cứu cầu dive ngoạn mục</span>
            </div>
          </button>
        </div>
        <button id="btn-start-bot-match" class="bb-btn-primary mt-3">
          BẮT ĐẦU TRANH TÀI NGAY ➜
        </button>
      </div>
    </div>

    <!-- MODAL CHỌN NHÂN VẬT (CHOOSE CHARACTER) -->
    <div id="modal-roster" class="modal-overlay hidden">
      <div class="bb-modal-box wide">
        <div class="bb-modal-header">
          <h3>CHỌN ĐẤU THỦ RA SÂN</h3>
          <button id="btn-close-roster" class="btn-close-x">✕</button>
        </div>
        <p class="bb-modal-sub">Chọn chú chim yêu thích của bạn để thi đấu:</p>
        <div class="roster-grid">
          <div class="roster-card active" data-color="0xfde047" data-sec="0xffedd5" data-jersey="0x38bdf8" data-avatar="🐥" data-name="Birdie Vàng">
            <div class="roster-avatar-box gold">🐥</div>
            <div class="roster-info">
              <h4 class="roster-name">Birdie Vàng</h4>
              <span class="roster-type">Số 1 · Toàn diện</span>
            </div>
            <button class="btn-select-roster">ĐANG CHỌN</button>
          </div>
          <div class="roster-card" data-color="0xc084fc" data-sec="0xfdf4ff" data-jersey="0xf472b6" data-avatar="🪻" data-name="Birdie Tím">
            <div class="roster-avatar-box dark">🪻</div>
            <div class="roster-info">
              <h4 class="roster-name">Birdie Tím</h4>
              <span class="roster-type">Số 2 · Bỏ nhỏ tinh tế</span>
            </div>
            <button class="btn-select-roster">CHỌN</button>
          </div>
          <div class="roster-card" data-color="0x38bdf8" data-sec="0xf0f9ff" data-jersey="0x0284c7" data-avatar="🩵" data-name="Birdie Lam">
            <div class="roster-avatar-box ice">🩵</div>
            <div class="roster-info">
              <h4 class="roster-name">Birdie Lam</h4>
              <span class="roster-type">Số 7 · Tốc độ sấm sét</span>
            </div>
            <button class="btn-select-roster">CHỌN</button>
          </div>
          <div class="roster-card" data-color="0xfb7185" data-sec="0xfff1f2" data-jersey="0xbe123c" data-avatar="🌸" data-name="Birdie Hồng">
            <div class="roster-avatar-box pink">🌸</div>
            <div class="roster-info">
              <h4 class="roster-name">Birdie Hồng</h4>
              <span class="roster-type">Số 3 · Cứu cầu Dive đỉnh</span>
            </div>
            <button class="btn-select-roster">CHỌN</button>
          </div>
          <div class="roster-card" data-color="0x34d399" data-sec="0xf0fdf4" data-jersey="0x059669" data-avatar="🍃" data-name="Birdie Mint">
            <div class="roster-avatar-box green">🍃</div>
            <div class="roster-info">
              <h4 class="roster-name">Birdie Mint</h4>
              <span class="roster-type">Số 9 · Xoáy cầu hiểm</span>
            </div>
            <button class="btn-select-roster">CHỌN</button>
          </div>
          <div class="roster-card" data-color="0xfb923c" data-sec="0xffedd5" data-jersey="0xc2410c" data-avatar="🦊" data-name="Birdie Cam">
            <div class="roster-avatar-box orange">🦊</div>
            <div class="roster-info">
              <h4 class="roster-name">Birdie Cam</h4>
              <span class="roster-type">Số 88 · Smash búa bổ</span>
            </div>
            <button class="btn-select-roster">CHỌN</button>
          </div>
        </div>
      </div>
    </div>

    
    <!-- MODAL TRANG BỊ VỢT & VỆT SÁNG ĐUÔI CẦU (EQUIPMENT & VFX SHOP) -->
    <div id="modal-equipment" class="modal-overlay hidden">
      <div class="bb-modal-box equipment-modal-box">
        <div class="bb-modal-header">
          <div class="header-with-badge">
            <span class="modal-icon-badge">⚡</span>
            <div>
              <h3>TRANG BỊ & VỆT SÁNG</h3>
              <p class="bb-modal-sub">Tùy biến vợt thi đấu và vệt cầu phát sáng</p>
            </div>
          </div>
          <button id="btn-close-equip" class="btn-close-x">✕</button>
        </div>

        <!-- MỤC 1: SKIN VỢT THI ĐẤU -->
        <div class="equip-section">
          <h4 class="equip-sec-title">🏸 MÀU KHUNG VỢT THỂ THAO</h4>
          <div class="equip-grid" id="racket-skin-grid">
            <button class="equip-card active" data-racket="titan">
              <span class="equip-color-dot" style="background: linear-gradient(135deg, #fef08a, #ca8a04); border-color: #facc15;"></span>
              <strong>Vàng Titan</strong>
              <span class="equip-tag">MẠ VÀNG 9999</span>
            </button>
            <button class="equip-card" data-racket="laser">
              <span class="equip-color-dot" style="background: linear-gradient(135deg, #fca5a5, #dc2626); border-color: #ef4444;"></span>
              <strong>Đỏ Laser</strong>
              <span class="equip-tag">CHIẾN BINH</span>
            </button>
            <button class="equip-card" data-racket="cyan">
              <span class="equip-color-dot" style="background: linear-gradient(135deg, #67e8f9, #0891b2); border-color: #06b6d4;"></span>
              <strong>Cyan Neon</strong>
              <span class="equip-tag">CYBERPUNK</span>
            </button>
            <button class="equip-card" data-racket="sakura">
              <span class="equip-color-dot" style="background: linear-gradient(135deg, #fbcfe8, #db2777); border-color: #ec4899;"></span>
              <strong>Hồng Sakura</strong>
              <span class="equip-tag">PASTEL CUTE</span>
            </button>
            <button class="equip-card" data-racket="classic">
              <span class="equip-color-dot" style="background: linear-gradient(135deg, #93c5fd, #1d4ed8); border-color: #2563eb;"></span>
              <strong>Xanh Thể Thao</strong>
              <span class="equip-tag">TIÊU CHUẨN</span>
            </button>
          </div>
        </div>

        <!-- MỤC 2: VỆT SÁNG ĐUÔI CẦU -->
        <div class="equip-section">
          <h4 class="equip-sec-title">✨ HIỆU ỨNG VỆT SÁNG ĐUÔI CẦU</h4>
          <div class="equip-grid" id="trail-skin-grid">
            <button class="equip-card" data-trail="rainbow">
              <span class="equip-trail-preview rainbow-grad">🌈</span>
              <strong>Cầu Vồng</strong>
              <span class="equip-tag">7 SẮC QUANG PHỔ</span>
            </button>
            <button class="equip-card active" data-trail="neon">
              <span class="equip-trail-preview neon-grad">⚡</span>
              <strong>Cyber Neon</strong>
              <span class="equip-tag">CYAN & TÍM PHÁT SÁNG</span>
            </button>
            <button class="equip-card" data-trail="fire">
              <span class="equip-trail-preview fire-grad">🔥</span>
              <strong>Hỏa Long</strong>
              <span class="equip-tag">ĐỎ CAM BỐC LỬA</span>
            </button>
            <button class="equip-card" data-trail="classic">
              <span class="equip-trail-preview classic-grad">🏸</span>
              <strong>Trắng Bạc</strong>
              <span class="equip-tag">ÁNH KIM TRUYỀN THỐNG</span>
            </button>
          </div>
        </div>

        <button id="btn-equip-done" class="bb-btn-primary mt-3">LƯU TRANG BỊ NGAY ✓</button>
      </div>
    </div>

    <!-- MODAL HƯỚNG DẪN CÁCH CHƠI -->
    <div id="modal-how-to-play" class="modal-overlay hidden">
      <div class="bb-modal-box">
        <div class="bb-modal-header">
          <h3>🏸 HƯỚNG DẪN CÁCH CHƠI ĐẲNG CẤP</h3>
          <button id="btn-close-how" class="btn-close-x">✕</button>
        </div>
        <div class="how-to-list">
          <div class="how-item">
            <span class="how-icon">✨</span>
            <div>
              <strong>1. Cơ Chế "1 Nút Duy Nhất" (Contextual Hit):</strong>
              <p>Bấm duy nhất <strong>phím SPACE</strong> (hoặc <strong>Click chuột</strong> trên máy tính, hoặc nút <strong>ĐÁNH CẦU</strong> trên điện thoại):</p>
              <ul style="margin: 4px 0 0 16px; padding: 0; font-size: 11.5px; color: #475569; line-height: 1.5;">
                <li>💥 <strong>Cầu trên cao:</strong> Tự động bật nhảy đập cầu (Jump Smash) cắm sàn cực mạnh!</li>
                <li>🪶 <strong>Sát lưới & tầm thấp:</strong> Tự động chạm nhẹ vợt bỏ nhỏ (Drop shot) lỡ trớn đối thủ!</li>
                <li>💨 <strong>Rơi xa tầm chân:</strong> Tự động lao người trượt sàn (Dive) cứu bóng ngoạn mục!</li>
                <li>🏸 <strong>Vị trí thông thường:</strong> Tự động phông cầu bổng sâu an toàn qua lại!</li>
              </ul>
              <small style="color: #64748b; font-size: 10.5px;">(Nếu muốn ép chiêu thủ công: phím <strong>K</strong> = Smash, <strong>L</strong> = Bỏ nhỏ, <strong>Shift / U</strong> = Cứu cầu).</small>
            </div>
          </div>
          <div class="how-item">
            <span class="how-icon">🎯</span>
            <div>
              <strong>2. Tự Động Tìm Khoảng Trống (Smart Auto-Aiming):</strong>
              <p>Khi bạn không giữ phím hướng nào, AI tự động phân tích đối thủ: đối thủ lệch phải thì đánh chéo sang trái và ngược lại. Điểm ngắm luôn khóa an toàn trong sân, triệt tiêu 100% tình trạng cầu ra ngoài!</p>
            </div>
          </div>
          <div class="how-item">
            <span class="how-icon">🧲</span>
            <div>
              <strong>3. Nam Châm Hút Vị Trí (Magnetic Step Assist):</strong>
              <p>Chỉ cần chạy về hướng gần quả cầu. Khi cầu vào tầm, nhân vật tự động trượt nhẹ 1 bước thuận chân vào sát cầu. Không bao giờ lo chém gió hụt vì lệch vài cm!</p>
            </div>
          </div>
          <div class="how-item">
            <span class="how-icon">🔥</span>
            <div>
              <strong>4. Khen Thưởng Chuỗi Rally (Rally Streaks):</strong>
              <p>Cứ mỗi chuỗi 5 pha cầu giằng co (5x, 10x, 15x RALLY STREAK), khán giả sẽ bùng nổ tiếng reo hò kèm hiệu ứng danh hiệu rực lửa trên màn hình!</p>
            </div>
          </div>
        </div>
        <button id="btn-how-done" class="bb-btn-primary mt-3">ĐÃ HIỂU, TRANH TÀI NGAY!</button>
      </div>
    </div>

    <!-- MODAL CÀI ĐẶT GAME -->
    <div id="modal-settings" class="modal-overlay hidden">
      <div class="bb-modal-box">
        <div class="bb-modal-header">
          <h3>CÀI ĐẶT GAME</h3>
          <button id="btn-close-settings" class="btn-close-x">✕</button>
        </div>
        <div class="settings-list">
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-title">🔊 Hiệu Ứng Âm Thanh (SFX)</span>
              <span class="setting-desc">Tiếng đập cầu, còi trọng tài, tiếng vung vợt</span>
            </div>
            <button id="toggle-sfx" class="btn-toggle active">BẬT</button>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-title">⚡ Hỗ Trợ Đánh Thông Minh</span>
              <span class="setting-desc">Tự động nhận diện Smash / Drop theo tình huống</span>
            </div>
            <button id="toggle-assist" class="btn-toggle active">BẬT</button>
          </div>
        </div>
        <button id="btn-settings-done" class="bb-btn-primary mt-3">LƯU CÀI ĐẶT</button>
      </div>
    </div>

    <!-- MODAL ĐỔI BIỆT DANH NGƯỜI CHƠI -->
    <div id="modal-rename" class="modal-overlay hidden">
      <div class="rename-modal-box">
        <div class="rename-icon-wrap">✏️</div>
        <h3 class="rename-title">ĐẶT BIỆT DANH CỦA BẠN</h3>
        <p class="rename-sub">Tên hiển thị trên bảng điểm và khi đấu Online với bạn bè</p>
        <input type="text" id="input-player-name" class="rename-input" maxlength="15" value="${playerName}" placeholder="Nhập tên của bạn..." />
        <div class="rename-actions">
          <button id="btn-save-name" class="btn-rename-save">LƯU BIỆT DANH</button>
          <button id="btn-cancel-name" class="btn-rename-cancel">HỦY</button>
        </div>
      </div>
    </div>

    <!-- MODAL ĐẤU MẠNG ONLINE (CÓ PHÒNG CHỜ, MÃ PHÒNG TO, QR CODE QUÉT BẰNG CAMERA/ZALO) -->
    <div id="modal-online" class="modal-overlay hidden">
      <!-- VIEW 1: SẢNH CHỌN CHẾ ĐỘ -->
      <div id="online-view-lobby" class="bb-modal-box online-modal-box">
        <div class="bb-modal-header">
          <div class="header-with-badge">
            <span class="modal-icon-badge">🌐</span>
            <div>
              <h3>ĐẤU MẠNG ONLINE</h3>
              <p class="bb-modal-sub">Tranh tài thời gian thực cùng bạn bè</p>
            </div>
          </div>
          <button id="btn-close-online" class="btn-close-x">✕</button>
        </div>

        <!-- CHỌN THỂ THỨC ĐẤU ONLINE -->
        <div class="match-mode-selector online-mode-sel">
          <button class="btn-match-mode-tab active" data-onlinemode="1v1" id="tab-online-1v1">🏸 ĐƠN 1v1 (2 Người)</button>
          <button class="btn-match-mode-tab" data-onlinemode="2v2" id="tab-online-2v2">👥 ĐÔI 2v2 (4 Người)</button>
        </div>

        <div class="online-options-stack">
          <!-- CARD 1: GHÉP NHANH -->
          <div class="online-action-card" id="card-quick-match" role="button" tabindex="0">
            <div class="online-card-icon-box yellow">⚡</div>
            <div class="online-card-body">
              <div class="online-card-title-row">
                <h4 class="online-card-title">Ghép Trận Nhanh</h4>
                <span class="online-badge yellow">Tự động</span>
              </div>
              <p class="online-card-desc">Tự động tìm đối thủ online và vào sân ngay</p>
            </div>
            <button id="btn-opt-quick" class="online-card-btn yellow" aria-label="Ghép nhanh">
              <span>GHÉP</span>
              <span class="btn-arrow">➜</span>
            </button>
          </div>

          <!-- CARD 2: TẠO PHÒNG RIÊNG -->
          <div class="online-action-card" id="card-create-room" role="button" tabindex="0">
            <div class="online-card-icon-box pink">🏠</div>
            <div class="online-card-body">
              <div class="online-card-title-row">
                <h4 class="online-card-title">Tạo Phòng Thi Đấu</h4>
                <span class="online-badge pink">Phòng riêng</span>
              </div>
              <p class="online-card-desc">Có mã phòng 4 chữ, mã QR & link mời bạn bè</p>
            </div>
            <button id="btn-opt-create" class="online-card-btn pink" aria-label="Tạo phòng">
              <span>TẠO</span>
              <span class="btn-arrow">➜</span>
            </button>
          </div>

          <!-- CARD 3: VÀO BẰNG MÃ PHÒNG -->
          <div class="online-action-card join-code-card">
            <div class="join-header-row">
              <div class="online-card-icon-box blue">🔑</div>
              <div class="online-card-body">
                <div class="online-card-title-row">
                  <h4 class="online-card-title">Vào Bằng Mã Phòng</h4>
                  <span class="online-badge blue">Mã 4 ký tự</span>
                </div>
                <p class="online-card-desc">Nhập mã do bạn bè chia sẻ để tham gia</p>
              </div>
            </div>
            <div class="join-input-bar">
              <input type="text" id="room-code-input" class="room-code-input" placeholder="MÃ PHÒNG (VD: AB12)" maxlength="6" autocomplete="off" autocorrect="off" autocapitalize="characters" />
              <button id="btn-join-room" class="btn-join-action">VÀO ➜</button>
            </div>
          </div>
        </div>
      </div>

      <!-- VIEW 2: PHÒNG CHỜ VIP (HIỂN THỊ MÃ PHÒNG TO, QR CODE QUÉT BẰNG CAMERA & SLOTS ĐẤU THỦ) -->
      <div id="online-view-room" class="online-room-box hidden">
        <div class="room-vip-header">
          <div class="room-header-left">
            <span class="room-live-dot"></span>
            <span id="room-mode-tag" class="room-mode-tag">PHÒNG ĐẤU 1v1 REALTIME</span>
          </div>
          <button id="btn-leave-room" class="btn-room-leave">
            <span>Rời phòng</span>
            <span>✕</span>
          </button>
        </div>

        <!-- KHỐI MÃ PHÒNG & QR CODE QUÉT VÀO SÂN -->
        <div class="room-invite-card">
          <div class="room-code-badge-wrap">
            <span class="room-code-label">MÃ PHÒNG CỦA BẠN</span>
            <div class="room-code-display-row">
              <span id="display-room-code" class="room-code-huge">----</span>
              <button id="btn-copy-code-only" class="btn-mini-copy" title="Sao chép mã">📋 Chép mã</button>
            </div>
          </div>

          <!-- KHUNG MÃ QR CODE CHÍNH HÃNG -->
          <div class="room-qr-section">
            <div class="room-qr-frame">
              <img id="room-qr-img" class="room-qr-img" src="" alt="Mã QR Phòng Đấu" />
            </div>
            <div class="room-qr-text">
              <strong class="qr-title">📱 Quét QR để vào sân ngay</strong>
              <span class="qr-sub">Mở Camera iPhone / Android hoặc Zalo quét mã này</span>
            </div>
          </div>

          <!-- NÚT 1 CHẠM SAO CHÉP LINK MỜI BẠN BÈ -->
          <button id="btn-copy-invite-link" class="btn-copy-link-vip">
            <span class="copy-link-icon">🔗</span>
            <div class="copy-link-text">
              <span class="copy-link-main">SAO CHÉP LINK MỜI BẠN BÈ</span>
              <span class="copy-link-sub">Bấm để gửi qua Zalo, Messenger, SMS</span>
            </div>
            <span class="copy-link-tag">1-CHẠM 📋</span>
          </button>
        </div>

        <div class="room-status-bar">
          <span id="room-status-note" class="room-status-note">Đang chờ bạn bè quét QR hoặc nhập mã...</span>
        </div>

        <!-- 2 KHUNG TUYỂN THỦ -->
        <div class="room-players-slots" id="room-players-container">
          <!-- Render danh sách slot người chơi từ roomUpdated -->
        </div>

        <div class="room-bottom-actions">
          <button id="btn-room-ready" class="bb-btn-primary btn-room-ready">
            <span id="txt-room-ready">SẴN SÀNG CHIẾN ĐẤU 🔥</span>
          </button>
          <button id="btn-host-start" class="bb-btn-primary btn-host-start pulse-start hidden">
            <span>BẮT ĐẦU TRANH TÀI NGAY ➜</span>
          </button>
        </div>
      </div>
    </div>

    
    <!-- MODAL XÁC NHẬN RỜI TRẬN ĐẤU (THAY THẾ CONFIRM ALERT THÔ KỆCH) -->
    <div id="modal-confirm-exit" class="modal-overlay hidden">
      <div class="confirm-modal-box">
        <div class="confirm-icon-wrap">🚪</div>
        <h3 class="confirm-title">RỜI TRẬN ĐẤU?</h3>
        <p class="confirm-sub">Trận đấu hiện tại sẽ kết thúc và tỷ số sẽ không được lưu. Bạn có chắc muốn quay về sảnh?</p>
        <div class="confirm-actions">
          <button id="btn-cancel-exit" class="btn-confirm-stay">TIẾP TỤC ĐẤU 🏸</button>
          <button id="btn-confirm-exit" class="btn-confirm-leave">RỜI TRẬN</button>
        </div>
      </div>
    </div>

    <!-- MODAL KẾT THÚC TRẬN ĐẤU (GAME OVER) -->
    <div id="game-over-modal" class="modal-overlay hidden">
      <div class="game-over-box">
        <div id="result-trophy" class="result-trophy">🏆</div>
        <h2 id="result-title" class="result-title">CHIẾN THẮNG!</h2>
        <div class="score-summary">
          <span class="summary-lbl">TỶ SỐ CHUNG CUỘC</span>
          <span id="final-score" class="summary-val">5 - 3</span>
        </div>
        <div class="game-over-btns">
          <button id="btn-play-again" class="bb-btn-primary btn-replay">CHƠI TIẾP VÁN MỚI 🏸</button>
          <button id="btn-back-to-lobby" class="btn-lobby-sub">VỀ MÀN HÌNH CHÍNH</button>
        </div>
      </div>
    </div>
  `;

  // ==========================================
  // XỬ LÝ LOADING SCREEN
  // ==========================================
  const loadingScreen = document.getElementById('loading-screen');
  const loadingBar = document.getElementById('loading-bar-inner');
  const loadingStatus = document.getElementById('loading-status-text');

  let loadP = 0;
  const loadInterval = setInterval(() => {
    loadP += 25;
    if (loadingBar) loadingBar.style.width = `${loadP}%`;
    if (loadP === 50 && loadingStatus) loadingStatus.innerText = 'Tải sân thi đấu & Khán đài 3D...';
    if (loadP === 75 && loadingStatus) loadingStatus.innerText = 'Kết nối máy chủ Firebase...';
    if (loadP >= 100) {
      clearInterval(loadInterval);
      setTimeout(() => {
        if (loadingScreen) {
          loadingScreen.classList.add('fade-out');
          setTimeout(() => {
            loadingScreen.style.display = 'none';
            document.getElementById('main-menu').classList.remove('hidden');

            checkUrlInviteCode();
          }, 350);
        }
      }, 200);
    }
  }, 160);

  // ==========================================
  // XỬ LÝ URL INVITE LINK (?room=XXXX)
  // ==========================================
  function checkUrlInviteCode() {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteCode = urlParams.get('room');
    if (inviteCode && inviteCode.trim().length >= 3) {
      const cleanCode = inviteCode.toUpperCase().trim();
      setTimeout(() => {
        network.joinRoom(cleanCode, playerName, selectedChar.avatar, selectedChar.color);
      }, 500);
    }
  }

  // ==========================================
  // QUẢN LÝ TÊN NGƯỜI CHƠI (RENAME MODAL)
  // ==========================================
  const modalRename = document.getElementById('modal-rename');
  const inputPlayerName = document.getElementById('input-player-name');

  document.getElementById('btn-open-rename').addEventListener('click', () => {
    inputPlayerName.value = playerName;
    modalRename.classList.remove('hidden');
    inputPlayerName.focus();
  });

  document.getElementById('btn-lb-signin').addEventListener('click', () => {
    inputPlayerName.value = playerName;
    modalRename.classList.remove('hidden');
    inputPlayerName.focus();
  });

  const savePlayerName = () => {
    const newName = inputPlayerName.value.trim();
    if (newName.length > 0) {
      playerName = newName;
      localStorage.setItem('tboy_player_name', playerName);
      document.getElementById('txt-signin-name').innerText = playerName;
      document.getElementById('hud-player-name').innerText = playerName.toUpperCase();
    }
    modalRename.classList.add('hidden');
  };

  document.getElementById('btn-save-name').addEventListener('click', savePlayerName);
  document.getElementById('btn-cancel-name').addEventListener('click', () => {
    modalRename.classList.add('hidden');
  });
  inputPlayerName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') savePlayerName();
  });

  // ==========================================
  // QUẢN LÝ TRẠNG THÁI & MODALS
  // ==========================================
  let selectedDiff = 'pro';
  let selectedChar = {
    color: 0xfde047,
    secondaryColor: 0xffedd5,
    jerseyColor: 0x38bdf8,
    avatar: '🐥',
    name: 'Birdie Vàng'
  };

  const modalBotDiff = document.getElementById('modal-bot-diff');
  const modalRoster = document.getElementById('modal-roster');
  const modalHow = document.getElementById('modal-how-to-play');
  const modalSettings = document.getElementById('modal-settings');
  const modalOnline = document.getElementById('modal-online');
  const onlineViewLobby = document.getElementById('online-view-lobby');
  const onlineViewRoom = document.getElementById('online-view-room');

  const closeAllModals = () => {
    if (modalOnline) modalOnline.classList.add('hidden');
    if (modalEquipment) modalEquipment.classList.add('hidden');
    if (modalBotDiff) modalBotDiff.classList.add('hidden');
    if (modalRoster) modalRoster.classList.add('hidden');
    if (modalHow) modalHow.classList.add('hidden');
    if (modalSettings) modalSettings.classList.add('hidden');
    if (modalRename) modalRename.classList.add('hidden');
  };

  // Quản lý hiển thị thanh phím tắt Desktop HUD (Tự động biến mất khi vào game)
  const desktopHud = document.getElementById('desktop-controls-hud');
  let desktopHudTimer = null;
  let gameOverModalTimer = null;

  const showDesktopHud = (duration = 3000) => {
    if (!desktopHud) return;
    desktopHud.classList.remove('faded', 'hidden');
    if (desktopHudTimer) clearTimeout(desktopHudTimer);
    if (duration > 0) {
      desktopHudTimer = setTimeout(() => {
        desktopHud.classList.add('faded');
      }, duration);
    }
  };

  const hideDesktopHud = () => {
    if (!desktopHud) return;
    if (desktopHudTimer) clearTimeout(desktopHudTimer);
    desktopHud.classList.add('faded');
  };

  // Nút đóng thủ công ✕ trên thanh Desktop HUD
  const btnCloseDesktopHud = document.getElementById('btn-close-desktop-hud');
  if (btnCloseDesktopHud) {
    btnCloseDesktopHud.addEventListener('click', (e) => {
      e.stopPropagation();
      hideDesktopHud();
    });
  }

  // Tự động biến mất ngay lập tức khi người chơi bắt đầu bấm phím hoặc click chuột chơi game
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      if (gameManager.state === 'SERVE' || gameManager.state === 'RALLY' || gameManager.state === 'POINT') {
        const modalConfirmExit = document.getElementById('modal-confirm-exit');
        if (modalConfirmExit) {
          if (modalConfirmExit.classList.contains('hidden')) {
            modalConfirmExit.classList.remove('hidden');
          } else {
            modalConfirmExit.classList.add('hidden');
          }
        }
      } else {
        closeAllModals();
      }
      return;
    }

    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyJ', 'KeyK', 'KeyL', 'ShiftLeft', 'ShiftRight', 'KeyU'].includes(e.code)) {
      hideDesktopHud();
    }
  });

  window.addEventListener('mousedown', (e) => {
    if (e.target.closest('#desktop-controls-hud') || e.target.closest('#btn-toggle-hints')) return;
    hideDesktopHud();
  });

  // Đóng modal khi bấm ra ngoài vùng xám (backdrop click)
  [modalOnline, modalBotDiff, modalRoster, modalHow, modalSettings, modalRename].forEach((m) => {
    if (m) {
      m.addEventListener('click', (e) => {
        if (e.target === m) closeAllModals();
      });
    }
  });

  document.getElementById('btn-menu-bot').addEventListener('click', () => {
    closeAllModals();
    modalBotDiff.classList.remove('hidden');
  });

  document.getElementById('btn-menu-online').addEventListener('click', () => {
    closeAllModals();
    modalOnline.classList.remove('hidden');
    if (network.currentRoom) {
      if (onlineViewLobby) onlineViewLobby.classList.add('hidden');
      if (onlineViewRoom) onlineViewRoom.classList.remove('hidden');
    } else {
      if (onlineViewLobby) onlineViewLobby.classList.remove('hidden');
      if (onlineViewRoom) onlineViewRoom.classList.add('hidden');
    }
  });

    const btnCloseOnline = document.getElementById('btn-close-online');
  if (btnCloseOnline) {
    btnCloseOnline.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllModals();
    });
  }

  document.getElementById('btn-menu-roster').addEventListener('click', () => {
    closeAllModals();
    modalRoster.classList.remove('hidden');
  });

  document.getElementById('btn-menu-help').addEventListener('click', () => {
    closeAllModals();
    modalHow.classList.remove('hidden');
  });
  document.getElementById('btn-bb-info').addEventListener('click', () => {
    closeAllModals();
    modalHow.classList.remove('hidden');
  });

  document.getElementById('btn-menu-settings').addEventListener('click', () => {
    closeAllModals();
    modalSettings.classList.remove('hidden');
  });

  document.getElementById('btn-close-bot-modal').addEventListener('click', closeAllModals);
  document.getElementById('btn-close-roster').addEventListener('click', closeAllModals);
  document.getElementById('btn-close-how').addEventListener('click', closeAllModals);
  document.getElementById('btn-how-done').addEventListener('click', closeAllModals);
  document.getElementById('btn-close-settings').addEventListener('click', closeAllModals);
  document.getElementById('btn-settings-done').addEventListener('click', closeAllModals);

  // Chọn độ khó bot
  const diffCards = document.querySelectorAll('.bb-diff-card');
  diffCards.forEach((card) => {
    card.addEventListener('click', () => {
      diffCards.forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      selectedDiff = card.dataset.diff;
      document.getElementById('diff-tag').innerText = selectedDiff.toUpperCase();
    });
  });

  // Bắt đầu vào trận
  document.getElementById('btn-start-bot-match').addEventListener('click', () => {
    closeAllModals();
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    const inGameControls = document.getElementById('in-game-controls');
    if (inGameControls) inGameControls.classList.remove('hidden');
    document.getElementById('hud-player-name').innerText = playerName.toUpperCase();
    document.getElementById('hud-avatar').innerText = selectedChar.avatar;

    // Hiển thị thanh phím tắt thoáng qua 3s khi chờ phát cầu rồi tự biến mất không che nhân vật
    showDesktopHud(3000);

    gameManager.startGame(selectedDiff, currentMatchMode === '2v2' ? 'bot-2v2' : 'bot');
  });

  // Chọn nhân vật
  const rosterCards = document.querySelectorAll('.roster-card');
  rosterCards.forEach((card) => {
    card.addEventListener('click', () => {
      rosterCards.forEach((c) => {
        c.classList.remove('active');
        c.querySelector('.btn-select-roster').innerText = 'CHỌN';
      });
      card.classList.add('active');
      card.querySelector('.btn-select-roster').innerText = 'ĐANG CHỌN';

      selectedChar = {
        color: parseInt(card.dataset.color, 16),
        secondaryColor: parseInt(card.dataset.sec, 16),
        jerseyColor: parseInt(card.dataset.jersey, 16),
        avatar: card.dataset.avatar,
        name: card.dataset.name
      };

      document.getElementById('hud-avatar').innerText = selectedChar.avatar;
      if (onCharacterChange) onCharacterChange(selectedChar);
    });
  });

  // ==========================================
  // XỬ LÝ PHÒNG MULTIPLAYER
  // ==========================================
  const displayRoomCode = document.getElementById('display-room-code');
  const roomStatusNote = document.getElementById('room-status-note');
  const roomPlayersContainer = document.getElementById('room-players-container');
  const btnRoomReady = document.getElementById('btn-room-ready');
  const txtRoomReady = document.getElementById('txt-room-ready');
  const btnHostStart = document.getElementById('btn-host-start');

  network.on('roomUpdated', (room) => {
    modalOnline.classList.remove('hidden');
    if (onlineViewLobby) onlineViewLobby.classList.add('hidden');
    if (onlineViewRoom) onlineViewRoom.classList.remove('hidden');

    const roomCode = room.code || room.id || '----';
    displayRoomCode.innerText = roomCode;

    // Sinh mã QR Code trực tiếp theo URL phòng
    const qrImg = document.getElementById('room-qr-img');
    if (qrImg && roomCode !== '----') {
      const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(inviteUrl)}&color=0f172a&bgcolor=ffffff`;
    }

    const modeStr = (room.mode || '1v1').toUpperCase();
    const modeTag = document.getElementById('room-mode-tag');
    if (modeTag) modeTag.innerText = `PHÒNG ĐẤU ${modeStr} REALTIME`;

    const playersList = Array.isArray(room.players) ? room.players : Object.values(room.players || {});
    const maxPlayers = room.maxPlayers || 2;

    let html = '';
    const myId = network.playerId || network.clientId;
    const yourSlot = playersList.findIndex((p) => p && p.id === myId);
    const isHost = yourSlot === 0;

    playersList.forEach((p, idx) => {
      if (!p) return;
      const isYou = p.id === myId;
      const isHostP = idx === 0;
      html += `
        <div class="room-slot ${p.ready ? 'ready' : ''}">
          <span class="slot-avatar">${p.avatar || '🐥'}</span>
          <div class="slot-text">
            <span class="slot-name">${p.name || 'Người chơi'} ${isYou ? '(Bạn)' : ''}</span>
            <span class="slot-role ${isHostP ? 'host' : ''}">${isHostP ? '👑 Chủ phòng' : '⚡ Đối thủ'} · Đội ${p.team || (idx + 1)}</span>
          </div>
          <span class="slot-badge ${p.ready ? 'ready' : 'wait'}">${p.ready ? 'SẴN SÀNG ✅' : 'CHƯA'}</span>
        </div>
      `;
    });

    for (let i = playersList.length; i < maxPlayers; i++) {
      html += `
        <div class="room-slot empty">
          <span class="slot-avatar">⏳</span>
          <div class="slot-text">
            <span class="slot-name">Đang chờ bạn bè quét QR / vào phòng...</span>
            <span class="slot-role">📱 Quét mã QR hoặc nhập mã ${roomCode}</span>
          </div>
          <span class="slot-badge wait">ĐANG CHỜ</span>
        </div>
      `;
    }
    roomPlayersContainer.innerHTML = html;

    const me = playersList[yourSlot];
    if (me && txtRoomReady) {
      txtRoomReady.innerText = me.ready ? 'HỦY SẴN SÀNG ✕' : 'SẴN SÀNG CHIẾN ĐẤU 🔥';
    }

    const allReady = playersList.length >= 2 && playersList.every((p) => p && p.ready);
    if (isHost && allReady) {
      btnHostStart.classList.remove('hidden');
      roomStatusNote.innerText = '🔥 Cả 2 đã sẵn sàng! Bấm BẮT ĐẦU TRANH TÀI NGAY!';
    } else {
      btnHostStart.classList.add('hidden');
      roomStatusNote.innerText = playersList.length < maxPlayers
        ? '📱 Mời bạn bè quét mã QR trên màn hình hoặc gửi link để vào đấu!'
        : 'Đang chờ tất cả người chơi bấm SẴN SÀNG...';
    }
  });

  network.on('matchStart', (room) => {
    modalOnline.classList.add('hidden');
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    const inGameControls = document.getElementById('in-game-controls');
    if (inGameControls) inGameControls.classList.remove('hidden');
    showDesktopHud(3000);
    const mode = (room && room.mode === '2v2') ? 'online-2v2' : 'online-1v1';
    gameManager.startGame('pro', mode, network.yourSlot || 0);
  });

  // Nút sao chép riêng mã phòng
  const btnCopyCodeOnly = document.getElementById('btn-copy-code-only');
  if (btnCopyCodeOnly) {
    btnCopyCodeOnly.addEventListener('click', () => {
      const code = displayRoomCode.innerText.trim();
      if (!code || code === '----') return;
      navigator.clipboard.writeText(code).then(() => {
        showGameToast(`Đã sao chép mã phòng: ${code}`, 'success');
      }).catch(() => {
        showGameToast(`Mã phòng: ${code}`, 'info');
      });
    });
  }

  const btnCopyInvite = document.getElementById('btn-copy-invite-link');
  if (btnCopyInvite) {
    btnCopyInvite.addEventListener('click', (e) => {
      e.stopPropagation();
      const code = displayRoomCode ? displayRoomCode.innerText.trim() : '';
      if (!code || code === '----') return;
      const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${code}`;
      navigator.clipboard.writeText(inviteUrl).then(() => {
        showGameToast('Đã sao chép link mời bạn bè vào bộ nhớ tạm!', 'success');
      }).catch(() => {
        showGameToast('Đã sao chép link mời!', 'success');
      });
    });
  }


  // ==========================================
  // XỬ LÝ CHỌN CHẾ ĐỘ 1v1 / 2v2 VÀ TRANG BỊ VỢT / VỆT SÁNG
  // ==========================================
  let currentMatchMode = '1v1'; // '1v1' hoặc '2v2'
  let currentOnlineMode = '1v1';

  // Chuyển tab 1v1 / 2v2 trong Modal Đấu với máy
  const tabBot1v1 = document.getElementById('tab-bot-1v1');
  const tabBot2v2 = document.getElementById('tab-bot-2v2');
  if (tabBot1v1 && tabBot2v2) {
    tabBot1v1.addEventListener('click', () => {
      currentMatchMode = '1v1';
      tabBot1v1.classList.add('active');
      tabBot2v2.classList.remove('active');
    });
    tabBot2v2.addEventListener('click', () => {
      currentMatchMode = '2v2';
      tabBot2v2.classList.add('active');
      tabBot1v1.classList.remove('active');
    });
  }

  // Chuyển tab 1v1 / 2v2 trong Modal Online
  const tabOnline1v1 = document.getElementById('tab-online-1v1');
  const tabOnline2v2 = document.getElementById('tab-online-2v2');
  if (tabOnline1v1 && tabOnline2v2) {
    tabOnline1v1.addEventListener('click', () => {
      currentOnlineMode = '1v1';
      tabOnline1v1.classList.add('active');
      tabOnline2v2.classList.remove('active');
    });
    tabOnline2v2.addEventListener('click', () => {
      currentOnlineMode = '2v2';
      tabOnline2v2.classList.add('active');
      tabOnline1v1.classList.remove('active');
    });
  }

  // Modal Trang Bị & Vệt Sáng
  const modalEquipment = document.getElementById('modal-equipment');
  const btnMenuEquip = document.getElementById('btn-menu-equip');
  if (btnMenuEquip) {
    btnMenuEquip.addEventListener('click', () => {
      closeAllModals();
      if (modalEquipment) modalEquipment.classList.remove('hidden');
    });
  }

  const btnCloseEquip = document.getElementById('btn-close-equip');
  if (btnCloseEquip) {
    btnCloseEquip.addEventListener('click', () => {
      if (modalEquipment) modalEquipment.classList.add('hidden');
    });
  }
  const btnEquipDone = document.getElementById('btn-equip-done');
  if (btnEquipDone) {
    btnEquipDone.addEventListener('click', () => {
      if (modalEquipment) modalEquipment.classList.add('hidden');
      showGameToast('Đã lưu trang bị vợt & hiệu ứng vệt sáng!', 'success');
    });
  }

  // Chọn Skin Vợt
  const racketCards = document.querySelectorAll('#racket-skin-grid .equip-card');
  const savedRacket = localStorage.getItem('tboy_racket_skin') || 'titan';
  racketCards.forEach((card) => {
    if (card.dataset.racket === savedRacket) card.classList.add('active');
    else card.classList.remove('active');

    card.addEventListener('click', () => {
      racketCards.forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      const rSkin = card.dataset.racket;
      if (gameManager.player && gameManager.player.setRacketSkin) {
        gameManager.player.setRacketSkin(rSkin);
      }
      showGameToast(`Đã chọn màu vợt: ${card.querySelector('strong').innerText}`, 'info');
    });
  });

  // Chọn Skin Đuôi Cầu
  const trailCards = document.querySelectorAll('#trail-skin-grid .equip-card');
  const savedTrail = localStorage.getItem('tboy_trail_skin') || 'neon';
  trailCards.forEach((card) => {
    if (card.dataset.trail === savedTrail) card.classList.add('active');
    else card.classList.remove('active');

    card.addEventListener('click', () => {
      trailCards.forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      const tSkin = card.dataset.trail;
      if (gameManager.shuttlecock && gameManager.shuttlecock.setTrailSkin) {
        gameManager.shuttlecock.setTrailSkin(tSkin);
      }
      showGameToast(`Đã kích hoạt vệt sáng: ${card.querySelector('strong').innerText}`, 'success');
    });
  });

  // 3 LỰA CHỌN TRONG SẢNH ĐẤU MẠNG ONLINE (GHÉP NHANH / TẠO PHÒNG / NHẬP MÃ)
  const btnOptQuick = document.getElementById('btn-opt-quick');
  if (btnOptQuick) {
    btnOptQuick.addEventListener('click', (e) => {
      e.stopPropagation();
      if (displayRoomCode) displayRoomCode.innerText = 'TÌM PHÒNG...';
      if (roomStatusNote) roomStatusNote.innerText = 'Đang tìm đối thủ trực tuyến trên Firebase...';
      if (onlineViewLobby) onlineViewLobby.classList.add('hidden');
      if (onlineViewRoom) onlineViewRoom.classList.remove('hidden');
      network.quickMatch(currentOnlineMode, playerName, selectedChar.avatar, selectedChar.color);
    });
  }

  const btnOptCreate = document.getElementById('btn-opt-create');
  if (btnOptCreate) {
    btnOptCreate.addEventListener('click', (e) => {
      e.stopPropagation();
      if (displayRoomCode) displayRoomCode.innerText = 'TẠO MÃ...';
      if (roomStatusNote) roomStatusNote.innerText = 'Đang tạo phòng thi đấu trên Firebase...';
      if (onlineViewLobby) onlineViewLobby.classList.add('hidden');
      if (onlineViewRoom) onlineViewRoom.classList.remove('hidden');
      network.createRoom(currentOnlineMode, playerName, selectedChar.avatar, selectedChar.color);
    });
  }

  // Click vào bất kỳ đâu trên card cũng kích hoạt hành động tương ứng
  const cardQuick = document.getElementById('card-quick-match');
  if (cardQuick) {
    cardQuick.addEventListener('click', () => {
      if (btnOptQuick) btnOptQuick.click();
    });
  }
  const cardCreate = document.getElementById('card-create-room');
  if (cardCreate) {
    cardCreate.addEventListener('click', () => {
      if (btnOptCreate) btnOptCreate.click();
    });
  }

  const btnJoinRoom = document.getElementById('btn-join-room');
  if (btnJoinRoom) {
    btnJoinRoom.addEventListener('click', () => {
      const code = document.getElementById('room-code-input').value.trim();
      if (code.length >= 3) {
        if (displayRoomCode) displayRoomCode.innerText = code.toUpperCase();
        if (roomStatusNote) roomStatusNote.innerText = 'Đang vào phòng thi đấu...';
        if (onlineViewLobby) onlineViewLobby.classList.add('hidden');
        if (onlineViewRoom) onlineViewRoom.classList.remove('hidden');
        network.joinRoom(code.toUpperCase(), playerName, selectedChar.avatar, selectedChar.color);
      } else {
        showGameToast('Vui lòng nhập mã phòng hợp lệ (4 ký tự)', 'warning');
      }
    });
  }

  btnRoomReady.addEventListener('click', () => {
    network.toggleReady();
  });

  btnHostStart.addEventListener('click', () => {
    network.startGame();
  });

  document.getElementById('btn-leave-room').addEventListener('click', () => {
    network.leaveRoom();
    if (gameManager.state !== 'MENU') {
      gameManager.returnToMenu();
    }
    if (onlineViewRoom) onlineViewRoom.classList.add('hidden');
    if (onlineViewLobby) onlineViewLobby.classList.remove('hidden');
  });

  network.on('roomClosed', () => {
    if (gameManager.state !== 'MENU') {
      if (gameOverModalTimer) clearTimeout(gameOverModalTimer);
      document.getElementById('game-over-modal').classList.add('hidden');
      document.getElementById('hud').classList.add('hidden');
      document.getElementById('main-menu').classList.remove('hidden');
      const inGameControls = document.getElementById('in-game-controls');
      if (inGameControls) inGameControls.classList.add('hidden');
      hideDesktopHud();
      gameManager.returnToMenu();
      showGameToast('Chủ phòng đã thoát hoặc phòng đã đóng!', 'warning');
    }
  });

  // ==========================================
  // HUD VÀ NÚT ĐIỀU KHIỂN
  // ==========================================
  const btnToggleHints = document.getElementById('btn-toggle-hints');
  if (btnToggleHints) {
    btnToggleHints.addEventListener('click', (e) => {
      e.stopPropagation();
      if (desktopHud && !desktopHud.classList.contains('faded') && !desktopHud.classList.contains('hidden')) {
        hideDesktopHud();
      } else {
        showDesktopHud(4000);
      }
    });
  }

  const modalConfirmExit = document.getElementById('modal-confirm-exit');
  const btnPauseGame = document.getElementById('btn-pause-game');
  if (btnPauseGame) {
    btnPauseGame.addEventListener('click', () => {
      if (modalConfirmExit) modalConfirmExit.classList.remove('hidden');
    });
  }

  const btnCancelExit = document.getElementById('btn-cancel-exit');
  if (btnCancelExit) {
    btnCancelExit.addEventListener('click', () => {
      if (modalConfirmExit) modalConfirmExit.classList.add('hidden');
    });
  }

  const btnConfirmExit = document.getElementById('btn-confirm-exit');
  if (btnConfirmExit) {
    btnConfirmExit.addEventListener('click', () => {
      if (modalConfirmExit) modalConfirmExit.classList.add('hidden');
      if (gameOverModalTimer) clearTimeout(gameOverModalTimer);
      document.getElementById('game-over-modal').classList.add('hidden');
      document.getElementById('hud').classList.add('hidden');
      document.getElementById('main-menu').classList.remove('hidden');
      const inGameControls = document.getElementById('in-game-controls');
      if (inGameControls) inGameControls.classList.add('hidden');
      hideDesktopHud();
      gameManager.returnToMenu();
      showGameToast('Đã quay về sảnh chính', 'info');
    });
  }

  document.getElementById('btn-play-again').addEventListener('click', () => {
    document.getElementById('game-over-modal').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    const inGameControls = document.getElementById('in-game-controls');
    if (inGameControls) inGameControls.classList.remove('hidden');
    showDesktopHud(3000);
    const mode = gameManager.isDoubles ? 'bot-2v2' : (gameManager.isMultiplayer ? gameManager.gameMode : 'bot');
    gameManager.startGame(selectedDiff, mode, gameManager.multiplayerSlot || 0);
  });

  document.getElementById('btn-back-to-lobby').addEventListener('click', () => {
    if (gameOverModalTimer) clearTimeout(gameOverModalTimer);
    document.getElementById('game-over-modal').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
    const inGameControls = document.getElementById('in-game-controls');
    if (inGameControls) inGameControls.classList.add('hidden');
    hideDesktopHud();
    gameManager.returnToMenu();
  });

  // ==========================================
  // HỆ THỐNG ĐIỀU KHIỂN TRONG TRẬN ĐẤU (JOYSTICK & 4 NÚT HÀNH ĐỘNG MÀN 2)
  // ==========================================
  const joystickZone = document.getElementById('joystick-zone');
  const joystickThumb = document.getElementById('joystick-thumb');

  let activeTouchId = null;
  let baseRect = null;
  const maxRadius = 40;

  const handleJoystickMove = (clientX, clientY) => {
    if (!baseRect) return;
    const centerX = baseRect.left + baseRect.width / 2;
    const centerY = baseRect.top + baseRect.height / 2;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    if (joystickThumb) joystickThumb.style.transform = `translate(${dx}px, ${dy}px)`;

    const normDist = Math.min(dist / maxRadius, 1);
    gameManager.virtualJoystickDir.x = (dx / maxRadius) * normDist;
    gameManager.virtualJoystickDir.z = (dy / maxRadius) * normDist;
    gameManager.joystickVector.x = gameManager.virtualJoystickDir.x;
    gameManager.joystickVector.z = gameManager.virtualJoystickDir.z;
  };

  const resetJoystick = () => {
    activeTouchId = null;
    baseRect = null;
    if (joystickThumb) joystickThumb.style.transform = 'translate(0px, 0px)';
    gameManager.virtualJoystickDir.x = 0;
    gameManager.virtualJoystickDir.z = 0;
    gameManager.joystickVector.x = 0;
    gameManager.joystickVector.z = 0;
  };

  if (joystickZone) {
    joystickZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (activeTouchId === null) {
        const t = e.changedTouches[0];
        activeTouchId = t.identifier;
        baseRect = joystickZone.getBoundingClientRect();
        handleJoystickMove(t.clientX, t.clientY);
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (activeTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId) {
          handleJoystickMove(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
          break;
        }
      }
    }, { passive: true });

    const onTouchEnd = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId) {
          resetJoystick();
          break;
        }
      }
    };
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });

    // Hỗ trợ chuột kéo cần Joystick trên PC
    let isMouseDown = false;
    joystickZone.addEventListener('mousedown', (e) => {
      isMouseDown = true;
      baseRect = joystickZone.getBoundingClientRect();
      handleJoystickMove(e.clientX, e.clientY);
    });
    window.addEventListener('mousemove', (e) => {
      if (isMouseDown) handleJoystickMove(e.clientX, e.clientY);
    });
    window.addEventListener('mouseup', () => {
      if (isMouseDown) {
        isMouseDown = false;
        resetJoystick();
      }
    });
  }

  // GẮN SỰ KIỆN 4 NÚT HÀNH ĐỘNG
  const bindAction = (id, fn) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const trigger = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      btn.classList.add('pressed');
      setTimeout(() => btn.classList.remove('pressed'), 120);
      fn();
    };
    btn.addEventListener('touchstart', trigger, { passive: false });
    btn.addEventListener('click', trigger);
  };

  // 1 Nút Duy Nhất & Các phím chức năng
  bindAction('btn-hit', () => gameManager.attemptSmartHit());
  bindAction('desktop-one-btn', () => gameManager.attemptSmartHit());
  bindAction('btn-smash', () => gameManager.handlePlayerAction('smash'));
  bindAction('btn-drop', () => gameManager.handlePlayerAction('drop'));
  bindAction('btn-dive', () => gameManager.handlePlayerAction('dive'));

  // Chạm trực tiếp vào sân đấu để phát cầu hoặc đánh nhanh nếu không dùng nút
  window.addEventListener('touchstart', (e) => {
    if (gameManager.state === 'MENU' || e.target.closest('#main-menu') || e.target.closest('.modal-overlay') || e.target.closest('#in-game-controls') || e.target.closest('.hud-top-bar')) {
      return;
    }
    if (gameManager.state === 'SERVE' && gameManager.currentServer === 'player') {
      gameManager.playerServe();
    } else if (gameManager.state === 'RALLY') {
      gameManager.attemptSmartHit();
    }
  }, { passive: true });

  // Tùy chọn SFX & Smart Assist
  let sfxEnabled = true;
  document.getElementById('toggle-sfx').addEventListener('click', (e) => {
    sfxEnabled = !sfxEnabled;
    e.target.innerText = sfxEnabled ? 'BẬT' : 'TẮT';
    e.target.className = `btn-toggle ${sfxEnabled ? 'active' : ''}`;
  });

  let smartAssistEnabled = true;
  document.getElementById('toggle-assist').addEventListener('click', (e) => {
    smartAssistEnabled = !smartAssistEnabled;
    e.target.innerText = smartAssistEnabled ? 'BẬT' : 'TẮT';
    e.target.className = `btn-toggle ${smartAssistEnabled ? 'active' : ''}`;
  });

  const bannerNotice = document.getElementById('banner-notice');
  const bannerTitle = document.getElementById('banner-title');
  const bannerSub = document.getElementById('banner-sub');
  let bannerTimer = null;

  return {
    updateHUD: (data) => {
      const pScoreElem = document.getElementById('player-score');
      const bScoreElem = document.getElementById('bot-score');
      if (pScoreElem && pScoreElem.innerText !== String(data.playerScore)) {
        pScoreElem.innerText = data.playerScore;
        pScoreElem.classList.add('score-pop');
        setTimeout(() => pScoreElem.classList.remove('score-pop'), 450);
      }
      if (bScoreElem && bScoreElem.innerText !== String(data.botScore)) {
        bScoreElem.innerText = data.botScore;
        bScoreElem.classList.add('score-pop');
        setTimeout(() => bScoreElem.classList.remove('score-pop'), 450);
      }

      const rallyText = document.getElementById('rally-text');
      if (rallyText) rallyText.innerText = `RALLY ${data.rallyCount}`;

      const inGameControls = document.getElementById('in-game-controls');
      if (inGameControls) {
        if (data.state === 'MENU') {
          inGameControls.classList.add('hidden');
          hideDesktopHud();
        } else if (data.state === 'SERVE' || data.state === 'RALLY' || data.state === 'POINT') {
          inGameControls.classList.remove('hidden');
          if (data.state === 'RALLY') {
            hideDesktopHud();
          }
        }
      }

      const sP1 = document.getElementById('hud-serve-p1');
      const sBot = document.getElementById('hud-serve-bot');
      if (sP1 && sBot) {
        if (data.currentServer === 'player') {
          sP1.classList.remove('hidden');
          sBot.classList.add('hidden');
        } else {
          sP1.classList.add('hidden');
          sBot.classList.remove('hidden');
        }
      }

      if (data.title) {
        bannerTitle.innerText = data.title;
        bannerSub.innerText = data.subtitle || '';
        bannerNotice.className = `banner-notice ${data.type || ''}`;
        bannerNotice.classList.remove('hidden');

        if (data.type === 'streak') {
          const hudPill = document.getElementById('hud-pill');
          const rallyText = document.getElementById('rally-text');
          if (hudPill) {
            hudPill.classList.add('rally-streak-fire');
            setTimeout(() => hudPill.classList.remove('rally-streak-fire'), 2800);
          }
          if (rallyText) {
            rallyText.classList.add('rally-text-fire');
            setTimeout(() => rallyText.classList.remove('rally-text-fire'), 2800);
          }
        }

        if (bannerTimer) clearTimeout(bannerTimer);
        bannerTimer = setTimeout(() => {
          bannerNotice.classList.add('hidden');
        }, data.type === 'streak' ? 2400 : 1500);
      }

      if (data.state === 'GAMEOVER') {
        if (gameOverModalTimer) clearTimeout(gameOverModalTimer);
        gameOverModalTimer = setTimeout(() => {
          if (gameManager.state === 'MENU') return;
          document.getElementById('final-score').innerText = `${data.playerScore} - ${data.botScore}`;
          const isWin = data.playerScore > data.botScore;
          document.getElementById('result-trophy').innerText = isWin ? '🏆' : '💔';
          document.getElementById('result-title').innerText = isWin ? 'CHIẾN THẮNG!' : 'ĐỐI THỦ THẮNG!';
          document.getElementById('game-over-modal').classList.remove('hidden');

          if (isWin) {
            confetti({
              particleCount: 120,
              spread: 70,
              origin: { y: 0.6 }
            });
          }
        }, 800);
      }
    }
  };
}
