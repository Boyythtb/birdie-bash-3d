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

  // TÊN NGƯỜI CHƠI TÙY CHỌN (LƯU LOCAL STORAGE)
  let playerName = localStorage.getItem('birdie_player_name') || 'Lê Tân';

  app.innerHTML = `
    <!-- 3D WebGL Canvas Container -->
    <div id="canvas-container"></div>

    <!-- 1. MÀN HÌNH TẢI GAME (SPLASH LOADING) -->
    <div id="loading-screen" class="loading-screen">
      <div class="loading-box">
        <span class="loading-birdie-bounce">🏸</span>
        <h2 class="loading-brand">BIRDIE BASH <span>3D</span></h2>
        <div class="loading-track">
          <div id="loading-bar-inner" class="loading-fill"></div>
        </div>
        <span id="loading-status-text" class="loading-txt">Đang chuẩn bị sân thi đấu...</span>
      </div>
    </div>

    <!-- 2. HUD TRONG TRẬN ĐẤU (COZY ESPORTS MATCH HUD) -->
    <div id="hud" class="hud-top-bar hidden">
      <div class="match-hud-pill">
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
      </div>

      <button id="btn-toggle-hints" class="hud-hint-btn" title="Phím tắt">⌨️ Phím</button>
      <button id="btn-pause-game" class="hud-hint-btn btn-exit" title="Thoát trận">✕ Rời trận</button>
    </div>

    <!-- POPUP THÔNG BÁO TIMING & GHI ĐIỂM -->
    <div id="banner-notice" class="banner-notice hidden">
      <h2 id="banner-title" class="banner-title">PERFECT! 🔥</h2>
      <p id="banner-sub" class="banner-sub">Nhịp đập hoàn hảo</p>
    </div>

    <!-- HƯỚNG DẪN TRÊN PC -->
    <div id="pc-hints" class="pc-hints-card hidden">
      <div class="hints-row">
        <span>🏸 <strong>[SPACE] / Click chuột:</strong> Tự động Smash / Drop / Dive thông minh</span>
        <button id="btn-close-hints" class="btn-close-x">✕</button>
      </div>
      <div class="hints-sub">WASD: Di chuyển đón cầu & bẻ hướng ngắm góc hiểm</div>
    </div>

    <!-- ĐIỀU KHIỂN CẢM ỨNG MOBILE PASTEL SPORT CONTROLS -->
    <div id="mobile-controls" class="mobile-controls">
      <div id="joystick-zone" class="joystick-zone">
        <div id="joystick-base" class="joystick-base">
          <div class="joystick-ring"></div>
          <div id="joystick-thumb" class="joystick-thumb"></div>
        </div>
      </div>

      <div class="action-buttons-pro">
        <button id="btn-dive" class="btn-action-pro btn-dive" aria-label="Dive">
          <span class="btn-act-icon">💨</span>
          <span class="btn-act-lbl">CỨU CẦU</span>
        </button>
        <button id="btn-drop" class="btn-action-pro btn-drop" aria-label="Drop">
          <span class="btn-act-icon">🪶</span>
          <span class="btn-act-lbl">BỎ NHỎ</span>
        </button>
        <button id="btn-smash" class="btn-action-pro btn-smash" aria-label="Smash">
          <span class="btn-act-icon">💥</span>
          <span class="btn-act-lbl">SMASH</span>
        </button>
        <button id="btn-hit" class="btn-action-pro btn-hit-main" aria-label="Hit">
          <span class="btn-act-icon-lg">🏸</span>
          <span class="btn-act-lbl-lg">ĐÁNH CẦU</span>
        </button>
      </div>
    </div>

    <!-- ===================================================
         3. GIAO DIỆN CHUẨN BIRDIE BASH (COZY AESTHETIC 1:1)
         ZERO SCROLLING - ĐỒNG BỘ 100% PHONG CÁCH GỐC
         =================================================== -->
    <div id="main-menu" class="birdie-bash-menu hidden">
      <!-- CỘT TRÁI: LOGO BUBBLY VÀ CÁC NÚT ĐIỀU HƯỚNG DẠNG THẺ PILL -->
      <div class="bb-left-column">
        <div class="bb-brand-box">
          <div class="bb-logo-group">
            <h1 class="bb-logo-birdie">Birdie</h1>
            <h1 class="bb-logo-bash">Bash</h1>
          </div>
          <div class="bb-sub-pill">Cozy badminton. Serious rallies.</div>
        </div>

        <div class="bb-menu-stack">
          <button id="btn-menu-bot" class="bb-pill-btn active">
            <span>Play vs bot</span>
          </button>
          <button id="btn-menu-online" class="bb-pill-btn">
            <span>Online match</span>
          </button>
          <button id="btn-menu-roster" class="bb-pill-btn">
            <span>Choose character</span>
          </button>
          <button id="btn-menu-help" class="bb-pill-btn">
            <span>How to play</span>
          </button>
          <button id="btn-menu-settings" class="bb-pill-btn">
            <span>Settings</span>
          </button>
        </div>
      </div>

      <!-- CỘT PHẢI: TOP UTILITY VÀ BẢNG TOP PLAYERS -->
      <div class="bb-right-column">
        <div class="bb-top-bar-right">
          <button class="bb-circle-btn pink" id="btn-bb-info" title="Thông tin">!</button>
          <button class="bb-circle-btn yellow" id="btn-bb-emoji" title="Biểu cảm & Nhân vật">😀</button>
          <button class="bb-signin-pill" id="btn-open-rename">
            <span id="txt-signin-name">${playerName}</span>
          </button>
        </div>

        <!-- BẢNG XẾP HẠNG TOP PLAYERS CHUẨN BIRDIE BASH -->
        <div class="bb-leaderboard-card">
          <div class="bb-lb-header">
            <span class="bb-lb-title">TOP PLAYERS</span>
            <button class="bb-lb-viewall" id="btn-lb-viewall">View all</button>
          </div>

          <div class="bb-lb-list">
            <div class="bb-lb-row">
              <div class="bb-lb-rank gold">
                <span class="bb-crown">👑</span>
                <span class="bb-rank-num">1</span>
              </div>
              <div class="bb-lb-avatar blue">🐵</div>
              <span class="bb-lb-name">Lê Tân</span>
              <div class="bb-lb-score">
                <span class="bb-score-num">297</span>
                <span class="bb-score-lbl">WINS</span>
              </div>
            </div>

            <div class="bb-lb-row">
              <div class="bb-lb-rank silver">
                <span class="bb-rank-num">2</span>
              </div>
              <div class="bb-lb-avatar yellow">🐻</div>
              <span class="bb-lb-name">Nguyễn Tân</span>
              <div class="bb-lb-score">
                <span class="bb-score-num">227</span>
                <span class="bb-score-lbl">WINS</span>
              </div>
            </div>

            <div class="bb-lb-row">
              <div class="bb-lb-rank bronze">
                <span class="bb-rank-num">3</span>
              </div>
              <div class="bb-lb-avatar pink">🐱</div>
              <span class="bb-lb-name">Nữ bơi vào đây</span>
              <div class="bb-lb-score">
                <span class="bb-score-num">134</span>
                <span class="bb-score-lbl">WINS</span>
              </div>
            </div>
          </div>

          <div class="bb-lb-footer" id="btn-lb-signin">
            Sign in to get on the board
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL CHỌN ĐỘ KHÓ KHI BẤM PLAY VS BOT -->
    <div id="modal-bot-diff" class="modal-overlay hidden">
      <div class="bb-modal-box">
        <div class="bb-modal-header">
          <h3>ĐẤU VỚI MÁY (BOT)</h3>
          <button id="btn-close-bot-modal" class="btn-close-x">✕</button>
        </div>
        <p class="bb-modal-sub">Chọn cấp độ thử thách của đối thủ AI:</p>
        <div class="bb-diff-stack">
          <button class="bb-diff-card" data-diff="rookie">
            <span class="bb-diff-icon">🌱</span>
            <div class="bb-diff-info">
              <strong>Rookie (Tập Sự)</strong>
              <span>Đánh bóng chậm, làm quen nhịp</span>
            </div>
          </button>
          <button class="bb-diff-card active" data-diff="pro">
            <span class="bb-diff-icon">⚡</span>
            <div class="bb-diff-info">
              <strong>Pro (Kỹ Thuật)</strong>
              <span>Phản xạ nhanh, biết smash & drop</span>
            </div>
          </button>
          <button class="bb-diff-card" data-diff="ace">
            <span class="bb-diff-icon">🔥</span>
            <div class="bb-diff-info">
              <strong>Ace (Cao Thủ)</strong>
              <span>Đập cắm góc hiểm, phản xạ đỉnh cao</span>
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
          <h3>CHỌN NHÂN VẬT THI ĐẤU</h3>
          <button id="btn-close-roster" class="btn-close-x">✕</button>
        </div>
        <p class="bb-modal-sub">Bấm chọn để đổi diện mạo chú chim của bạn ngay trên sân:</p>
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
              <span class="roster-type">Số 2 · Bỏ nhỏ sát lưới</span>
            </div>
            <button class="btn-select-roster">CHỌN</button>
          </div>
          <div class="roster-card" data-color="0x38bdf8" data-sec="0xf0f9ff" data-jersey="0x0284c7" data-avatar="🩵" data-name="Birdie Lam">
            <div class="roster-avatar-box ice">🩵</div>
            <div class="roster-info">
              <h4 class="roster-name">Birdie Lam</h4>
              <span class="roster-type">Số 7 · Tốc độ thần tốc</span>
            </div>
            <button class="btn-select-roster">CHỌN</button>
          </div>
          <div class="roster-card" data-color="0xfb7185" data-sec="0xfff1f2" data-jersey="0xbe123c" data-avatar="🌸" data-name="Birdie Hồng">
            <div class="roster-avatar-box pink">🌸</div>
            <div class="roster-info">
              <h4 class="roster-name">Birdie Hồng</h4>
              <span class="roster-type">Số 3 · Cứu cầu Dive</span>
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
              <span class="roster-type">Số 88 · Smash sấm sét</span>
            </div>
            <button class="btn-select-roster">CHỌN</button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL HOW TO PLAY -->
    <div id="modal-how-to-play" class="modal-overlay hidden">
      <div class="bb-modal-box">
        <div class="bb-modal-header">
          <h3>HƯỚNG DẪN CÁCH CHƠI</h3>
          <button id="btn-close-how" class="btn-close-x">✕</button>
        </div>
        <div class="how-to-list">
          <div class="how-item">
            <span class="how-icon">🏸</span>
            <div>
              <strong>[SPACE] hoặc Click chuột / Nút Đánh:</strong>
              <p>Đánh cầu qua lưới. Game tự động canh Smash khi cầu cao, Drop khi sát lưới, hoặc Dive khi cầu xa.</p>
            </div>
          </div>
          <div class="how-item">
            <span class="how-icon">🕹️</span>
            <div>
              <strong>Phím WASD / Cần gạt Joystick:</strong>
              <p>Di chuyển đón cầu và bẻ hướng ngắm vào các góc hiểm.</p>
            </div>
          </div>
          <div class="how-item">
            <span class="how-icon">⭕</span>
            <div>
              <strong>Vòng tròn Timing:</strong>
              <p>Bấm đúng lúc vòng tròn đỏ co vừa khít quả cầu để đạt PERFECT SMASH uy lực x1.5!</p>
            </div>
          </div>
        </div>
        <button id="btn-how-done" class="bb-btn-primary mt-3">ĐÃ HIỂU, CHIẾN THÔI!</button>
      </div>
    </div>

    <!-- MODAL SETTINGS -->
    <div id="modal-settings" class="modal-overlay hidden">
      <div class="bb-modal-box">
        <div class="bb-modal-header">
          <h3>CÀI ĐẶT GAME</h3>
          <button id="btn-close-settings" class="btn-close-x">✕</button>
        </div>
        <div class="settings-list">
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-title">🔊 Hiệu Ứng Âm Thanh</span>
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

    <!-- MODAL ĐỔI TÊN NGƯỜI CHƠI (RENAME MODAL) -->
    <div id="modal-rename" class="modal-overlay hidden">
      <div class="rename-modal-box">
        <div class="rename-icon-wrap">✏️</div>
        <h3 class="rename-title">ĐẶT BIỆT DANH THI ĐẤU</h3>
        <p class="rename-sub">Tên hiển thị trên bảng điểm và khi thi đấu Online</p>
        <input type="text" id="input-player-name" class="rename-input" maxlength="15" value="${playerName}" placeholder="Nhập tên của bạn..." />
        <div class="rename-actions">
          <button id="btn-save-name" class="btn-rename-save">LƯU BIỆT DANH</button>
          <button id="btn-cancel-name" class="btn-rename-cancel">HỦY</button>
        </div>
      </div>
    </div>

    <!-- MODAL PHÒNG CHỜ ONLINE CAO CẤP (VIP ROOM LOBBY) -->
    <div id="modal-online-room" class="modal-overlay hidden">
      <div class="online-room-box">
        <div class="room-vip-header">
          <div class="room-badge-gold">
            <span class="room-crown">👑</span>
            <div class="room-code-group">
              <span class="room-code-sub">MÃ PHÒNG THI ĐẤU</span>
              <span id="display-room-code" class="room-code-huge">----</span>
            </div>
          </div>
          <button id="btn-leave-room" class="btn-room-leave">✕ Rời phòng</button>
        </div>

        <!-- NÚT 1 CHẠM SAO CHÉP LINK MỜI BẠN BÈ -->
        <button id="btn-copy-invite-link" class="btn-copy-link-vip">
          <span class="copy-link-icon">🔗</span>
          <div class="copy-link-text">
            <span class="copy-link-main">SAO CHÉP LINK MỜI BẠN BÈ</span>
            <span class="copy-link-sub">Bạn bè chỉ cần bấm link là vào thẳng phòng!</span>
          </div>
          <span class="copy-link-tag">1-CHẠM 📋</span>
        </button>

        <div class="room-match-info">
          <span id="room-mode-tag" class="room-mode-tag">ONLINE 1v1 REALTIME</span>
          <p id="room-status-note" class="room-status-note">Đang chờ đối thủ vào phòng...</p>
        </div>

        <div class="room-players-slots" id="room-players-container">
          <div class="room-slot active">
            <span class="slot-avatar">🐥</span>
            <div class="slot-text">
              <span class="slot-name">${playerName} (Bạn)</span>
              <span class="slot-role host">🏠 Sân Nhà · Đội 1</span>
            </div>
            <span class="slot-badge ready">SẴN SÀNG</span>
          </div>
          <div class="room-slot empty" id="slot-opponent">
            <span class="slot-avatar">⏳</span>
            <div class="slot-text">
              <span class="slot-name">Đang chờ đối thủ...</span>
              <span class="slot-role">✈️ Sân Khách · Đội 2</span>
            </div>
            <span class="slot-badge wait">CHỜ</span>
          </div>
        </div>

        <div class="room-bottom-actions">
          <button id="btn-room-ready" class="bb-btn-primary btn-room-ready">
            <span id="txt-room-ready">SẴN SÀNG CHIẾN ĐẤU 🔥</span>
          </button>
          <button id="btn-host-start" class="bb-btn-primary btn-host-start pulse-start hidden">
            <span>BẮT ĐẦU TRẬN NGAY ➜</span>
          </button>
        </div>

        <!-- CÁC LỰA CHỌN PHỤ KHI VÀO PHÒNG ONLINE -->
        <div class="online-card-actions mt-3">
          <button id="btn-quick-match-1v1" class="btn-card-action primary">⚡ Ghép Nhanh 1v1</button>
          <button id="btn-create-room-1v1" class="btn-card-action secondary">➕ Tạo Phòng Mới</button>
        </div>
        <div class="room-action-row mt-2">
          <input type="text" id="room-code-input" class="room-input" placeholder="Nhập mã 4 chữ..." maxlength="4" />
          <button id="btn-join-room" class="btn-room-join">Vào Phòng</button>
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
          <button id="btn-back-to-lobby" class="btn-lobby-sub">VỀ SẢNH CHÍNH</button>
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
    if (loadP === 75 && loadingStatus) loadingStatus.innerText = 'Kết nối hệ thống Multiplayer...';
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
      localStorage.setItem('birdie_player_name', playerName);
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
  // QUẢN LÝ TRẠNG THÁI & MODALS BIRDIE BASH
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
  const modalOnline = document.getElementById('modal-online-room');

  const closeAllModals = () => {
    modalBotDiff.classList.add('hidden');
    modalRoster.classList.add('hidden');
    modalHow.classList.add('hidden');
    modalSettings.classList.add('hidden');
    modalRename.classList.add('hidden');
  };

  // Nút Play vs bot -> Mở modal chọn độ khó
  document.getElementById('btn-menu-bot').addEventListener('click', () => {
    closeAllModals();
    modalBotDiff.classList.remove('hidden');
  });

  // Nút Online match -> Mở modal phòng online
  document.getElementById('btn-menu-online').addEventListener('click', () => {
    closeAllModals();
    modalOnline.classList.remove('hidden');
    if (!network.currentRoom) {
      network.createRoom('1v1', playerName, selectedChar.avatar, selectedChar.color);
    }
  });

  // Nút Choose character
  document.getElementById('btn-menu-roster').addEventListener('click', () => {
    closeAllModals();
    modalRoster.classList.remove('hidden');
  });
  document.getElementById('btn-bb-emoji').addEventListener('click', () => {
    closeAllModals();
    modalRoster.classList.remove('hidden');
  });

  // Nút How to play
  document.getElementById('btn-menu-help').addEventListener('click', () => {
    closeAllModals();
    modalHow.classList.remove('hidden');
  });
  document.getElementById('btn-bb-info').addEventListener('click', () => {
    closeAllModals();
    modalHow.classList.remove('hidden');
  });

  // Nút Settings
  document.getElementById('btn-menu-settings').addEventListener('click', () => {
    closeAllModals();
    modalSettings.classList.remove('hidden');
  });

  // Nút đóng các modal
  document.getElementById('btn-close-bot-modal').addEventListener('click', closeAllModals);
  document.getElementById('btn-close-roster').addEventListener('click', closeAllModals);
  document.getElementById('btn-close-how').addEventListener('click', closeAllModals);
  document.getElementById('btn-how-done').addEventListener('click', closeAllModals);
  document.getElementById('btn-close-settings').addEventListener('click', closeAllModals);
  document.getElementById('btn-settings-done').addEventListener('click', closeAllModals);

  // Chọn độ khó trong modal Bot
  const diffCards = document.querySelectorAll('.bb-diff-card');
  diffCards.forEach((card) => {
    card.addEventListener('click', () => {
      diffCards.forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      selectedDiff = card.dataset.diff;
      document.getElementById('diff-tag').innerText = selectedDiff.toUpperCase();
    });
  });

  // Bắt đầu đánh bot
  document.getElementById('btn-start-bot-match').addEventListener('click', () => {
    closeAllModals();
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('hud-player-name').innerText = playerName.toUpperCase();
    document.getElementById('hud-avatar').innerText = selectedChar.avatar;

    if (!isTouchDevice) {
      document.getElementById('pc-hints').classList.remove('hidden');
      setTimeout(() => {
        document.getElementById('pc-hints').classList.add('hidden');
      }, 5000);
    }

    onStartGame(selectedDiff, selectedChar);
  });

  // Chọn nhân vật trong roster
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
  // XỬ LÝ PHÒNG ONLINE MULTIPLAYER (FIREBASE)
  // ==========================================
  const displayRoomCode = document.getElementById('display-room-code');
  const roomStatusNote = document.getElementById('room-status-note');
  const roomPlayersContainer = document.getElementById('room-players-container');
  const btnRoomReady = document.getElementById('btn-room-ready');
  const txtRoomReady = document.getElementById('txt-room-ready');
  const btnHostStart = document.getElementById('btn-host-start');

  network.on('roomUpdated', (room) => {
    modalOnline.classList.remove('hidden');
    displayRoomCode.innerText = room.id;
    document.getElementById('room-mode-tag').innerText = `ONLINE ${room.mode.toUpperCase()} REALTIME`;

    let html = '';
    const yourSlot = room.players.findIndex((p) => p.id === network.playerId);
    const isHost = yourSlot === 0;

    room.players.forEach((p, idx) => {
      const isYou = p.id === network.playerId;
      const isHostP = idx === 0;
      html += `
        <div class="room-slot ${p.ready ? 'ready' : ''}">
          <span class="slot-avatar">${p.avatar || '🐥'}</span>
          <div class="slot-text">
            <span class="slot-name">${p.name} ${isYou ? '(Bạn)' : ''}</span>
            <span class="slot-role ${isHostP ? 'host' : ''}">${isHostP ? '🏠 Chủ phòng · ' : '✈️ '}Đội ${p.team}</span>
          </div>
          <span class="slot-badge ${p.ready ? 'ready' : 'wait'}">${p.ready ? 'SẴN SÀNG' : 'CHƯA'}</span>
        </div>
      `;
    });

    for (let i = room.players.length; i < room.maxPlayers; i++) {
      html += `
        <div class="room-slot empty">
          <span class="slot-avatar">⏳</span>
          <div class="slot-text">
            <span class="slot-name">Đang chờ đối thủ vào phòng...</span>
            <span class="slot-role">✈️ Đội ${room.mode === '2v2' ? (i < 2 ? 1 : 2) : 2}</span>
          </div>
          <span class="slot-badge wait">CHỜ</span>
        </div>
      `;
    }
    roomPlayersContainer.innerHTML = html;

    const me = room.players[yourSlot];
    if (me) {
      txtRoomReady.innerText = me.ready ? 'HỦY SẴN SÀNG ✕' : 'SẴN SÀNG CHIẾN ĐẤU 🔥';
    }

    const allReady = room.players.length >= 2 && room.players.every((p) => p.ready);
    if (isHost && allReady) {
      btnHostStart.classList.remove('hidden');
      roomStatusNote.innerText = '🔥 Tất cả đã sẵn sàng! Bấm BẮT ĐẦU TRẬN NGAY!';
    } else {
      btnHostStart.classList.add('hidden');
      roomStatusNote.innerText = room.players.length < room.maxPlayers
        ? 'Đang chờ đối thủ vào phòng...'
        : 'Đang chờ tất cả người chơi nhấn SẴN SÀNG...';
    }
  });

  network.on('gameStart', (room) => {
    modalOnline.classList.add('hidden');
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');

    const yourSlot = room.players.findIndex((p) => p.id === network.playerId);
    const opponent = room.players.find((p) => p.id !== network.playerId);

    document.getElementById('hud-player-name').innerText = playerName.toUpperCase();
    document.getElementById('hud-avatar').innerText = selectedChar.avatar;
    if (opponent) {
      document.getElementById('hud-bot-name').innerText = opponent.name.toUpperCase();
      document.getElementById('hud-bot-avatar').innerText = opponent.avatar || '🪻';
    }

    gameManager.startGame('pro', room.mode, yourSlot);
  });

  // Nút 1-chạm sao chép link mời bạn bè
  document.getElementById('btn-copy-invite-link').addEventListener('click', () => {
    const code = displayRoomCode.innerText;
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${code}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      alert(`Đã sao chép link mời bạn:\n${inviteUrl}\n\nBạn bè chỉ cần bấm link là vào thẳng phòng!`);
    }).catch(() => {
      alert(`Mã phòng của bạn: ${code}`);
    });
  });

  // Tạo phòng mới 1v1
  document.getElementById('btn-create-room-1v1').addEventListener('click', () => {
    network.createRoom('1v1', playerName, selectedChar.avatar, selectedChar.color);
  });

  // Ghép nhanh 1v1
  document.getElementById('btn-quick-match-1v1').addEventListener('click', () => {
    network.quickMatch('1v1', playerName, selectedChar.avatar, selectedChar.color);
  });

  // Vào phòng bằng mã 4 ký tự
  document.getElementById('btn-join-room').addEventListener('click', () => {
    const code = document.getElementById('room-code-input').value.trim();
    if (code.length >= 3) {
      network.joinRoom(code.toUpperCase(), playerName, selectedChar.avatar, selectedChar.color);
    } else {
      alert('Vui lòng nhập mã phòng hợp lệ (4 ký tự)');
    }
  });

  // Sẵn sàng trong phòng online
  btnRoomReady.addEventListener('click', () => {
    network.toggleReady();
  });

  // Bắt đầu trận online (Host)
  btnHostStart.addEventListener('click', () => {
    network.startGame();
  });

  // Rời phòng online
  document.getElementById('btn-leave-room').addEventListener('click', () => {
    network.leaveRoom();
    modalOnline.classList.add('hidden');
  });

  // ==========================================
  // HUD VÀ NÚT ĐIỀU KHIỂN TRẬN ĐẤU
  // ==========================================
  document.getElementById('btn-toggle-hints').addEventListener('click', () => {
    const hints = document.getElementById('pc-hints');
    hints.classList.toggle('hidden');
  });
  document.getElementById('btn-close-hints').addEventListener('click', () => {
    document.getElementById('pc-hints').classList.add('hidden');
  });

  document.getElementById('btn-pause-game').addEventListener('click', () => {
    if (confirm('Bạn có chắc muốn thoát trận đấu để về màn hình chính?')) {
      gameManager.state = 'MENU';
      document.getElementById('hud').classList.add('hidden');
      document.getElementById('main-menu').classList.remove('hidden');
    }
  });

  document.getElementById('btn-play-again').addEventListener('click', () => {
    document.getElementById('game-over-modal').classList.add('hidden');
    gameManager.startGame(selectedDiff);
  });

  document.getElementById('btn-back-to-lobby').addEventListener('click', () => {
    document.getElementById('game-over-modal').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
  });

  // CẢM ỨNG MOBILE PRO (SPORT CONTROLS)
  if (isTouchDevice) {
    const btnHit = document.getElementById('btn-hit');
    const btnSmash = document.getElementById('btn-smash');
    const btnDrop = document.getElementById('btn-drop');
    const btnDive = document.getElementById('btn-dive');

    const bindTouchAction = (elem, actionFn) => {
      if (!elem) return;
      elem.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        elem.classList.add('btn-pressed');
        actionFn();
      }, { passive: false });

      elem.addEventListener('touchend', (e) => {
        e.preventDefault();
        elem.classList.remove('btn-pressed');
      }, { passive: false });
    };

    bindTouchAction(btnHit, () => gameManager.attemptSmartHit());
    bindTouchAction(btnSmash, () => gameManager.attemptPlayerHit('smash'));
    bindTouchAction(btnDrop, () => gameManager.attemptPlayerHit('drop'));
    bindTouchAction(btnDive, () => gameManager.attemptPlayerDive());

    setupVirtualJoystick(gameManager);
  }

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

        if (bannerTimer) clearTimeout(bannerTimer);
        bannerTimer = setTimeout(() => {
          bannerNotice.classList.add('hidden');
        }, 1500);
      }

      if (data.state === 'GAMEOVER') {
        setTimeout(() => {
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

function setupVirtualJoystick(gameManager) {
  const zone = document.getElementById('joystick-zone');
  const base = document.getElementById('joystick-base');
  const thumb = document.getElementById('joystick-thumb');
  if (!zone || !base || !thumb) return;

  let activeTouchId = null;
  let baseRect = null;
  const maxRadius = 45;

  const handleStart = (clientX, clientY, touchId) => {
    activeTouchId = touchId;
    baseRect = base.getBoundingClientRect();
    handleMove(clientX, clientY);
  };

  const handleMove = (clientX, clientY) => {
    if (!baseRect) return;
    const centerX = baseRect.left + baseRect.width / 2;
    const centerY = baseRect.top + baseRect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    const angle = Math.atan2(dy, dx);
    const clampedDist = Math.min(dist, maxRadius);

    const thumbX = Math.cos(angle) * clampedDist;
    const thumbY = Math.sin(angle) * clampedDist;

    thumb.style.transform = `translate(${thumbX}px, ${thumbY}px)`;

    const normDist = clampedDist / maxRadius;
    gameManager.joystickVector.x = (thumbX / maxRadius) * normDist;
    gameManager.joystickVector.z = (thumbY / maxRadius) * normDist;
  };

  const handleEnd = () => {
    activeTouchId = null;
    baseRect = null;
    thumb.style.transform = 'translate(0px, 0px)';
    gameManager.joystickVector.x = 0;
    gameManager.joystickVector.z = 0;
  };

  zone.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (activeTouchId === null) {
      const touch = e.changedTouches[0];
      handleStart(touch.clientX, touch.clientY, touch.identifier);
    }
  }, { passive: false });

  zone.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === activeTouchId) {
        handleMove(touch.clientX, touch.clientY);
        break;
      }
    }
  }, { passive: false });

  zone.addEventListener('touchend', (e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchId) {
        handleEnd();
        break;
      }
    }
  }, { passive: false });

  zone.addEventListener('touchcancel', (e) => {
    handleEnd();
  }, { passive: false });
}
