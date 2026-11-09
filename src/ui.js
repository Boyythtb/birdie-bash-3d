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
  let playerName = localStorage.getItem('birdie_player_name') || 'Tuyển Thủ Pro';

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

    <!-- 2. HUD TRONG TRẬN ĐẤU (CHAMPIONSHIP ESPORTS HUD) -->
    <div id="hud" class="hud-top-bar hidden">
      <div class="match-hud-pill">
        <div class="hud-player">
          <div class="hud-avatar-box">
            <span id="hud-avatar" class="hud-emoji">🐶</span>
            <span id="hud-serve-p1" class="hud-serve-badge" title="Đang giao cầu">🏸</span>
          </div>
          <div class="hud-name-col">
            <span id="hud-player-name" class="hud-label">${playerName.toUpperCase()}</span>
            <span class="hud-team-tag blue">ĐỘI 1</span>
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
            <span id="hud-bot-name" class="hud-label">BOT AI</span>
            <span class="hud-team-tag red">ĐỘI 2</span>
          </div>
          <div class="hud-avatar-box">
            <span id="hud-bot-avatar" class="hud-emoji">🤖</span>
            <span id="hud-serve-bot" class="hud-serve-badge hidden" title="Đang giao cầu">🏸</span>
          </div>
        </div>
      </div>

      <button id="btn-toggle-hints" class="hud-hint-btn" title="Phím tắt">
        ⌨️ Phím
      </button>
      <button id="btn-pause-game" class="hud-hint-btn btn-exit" title="Thoát trận">
        ✕ Rời trận
      </button>
    </div>

    <!-- POPUP THÔNG BÁO TIMING & GHI ĐIỂM -->
    <div id="banner-notice" class="banner-notice hidden">
      <h2 id="banner-title" class="banner-title">PERFECT! 🔥</h2>
      <p id="banner-sub" class="banner-sub">Nhịp đập hoàn hảo</p>
    </div>

    <!-- HƯỚNG DẪN TRÊN PC (TỰ TẮT) -->
    <div id="pc-hints" class="pc-hints-card hidden">
      <div class="hints-row">
        <span>🏸 <strong>[SPACE] / Click chuột:</strong> Tự động Smash / Drop / Dive thông minh</span>
        <button id="btn-close-hints" class="btn-close-x">✕</button>
      </div>
      <div class="hints-sub">WASD: Di chuyển đón cầu & bẻ hướng hồng tâm ngắm</div>
    </div>

    <!-- ĐIỀU KHIỂN CẢM ỨNG MOBILE CAO CẤP (SPORT CONTROLS) -->
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
         3. HỆ THỐNG SẢNH GAME CAO CẤP (SCALABLE GAME HUB)
         ZERO SCROLLING - 100% CỐ ĐỊNH TOÀN MÀN HÌNH
         =================================================== -->
    <div id="main-menu" class="lobby-hub hidden">
      <!-- TOP BAR: PROFILE & TRẠNG THÁI SERVER -->
      <header class="hub-top-bar">
        <div class="player-profile-badge" id="btn-open-rename" title="Bấm để đổi tên">
          <div class="profile-avatar-wrap">
            <span id="hub-player-avatar" class="profile-avatar">🐶</span>
            <span class="profile-level">Lv.1</span>
          </div>
          <div class="profile-text">
            <div class="profile-name-row">
              <span id="hub-player-name" class="profile-name">${playerName}</span>
              <span class="profile-edit-icon">✏️</span>
            </div>
            <span class="profile-rank">🏆 1,250 Cúp</span>
          </div>
        </div>

        <div class="hub-server-status" id="server-status-pill">
          <span class="server-dot"></span>
          <span class="server-txt" id="server-status-txt">Server Online</span>
        </div>
      </header>

      <!-- GÓC TRÁI TRÊN: LOGO GAME -->
      <div class="hub-hero-brand">
        <div class="hero-chip-badge">🏸 BIRDIE BASH ARENA</div>
        <h1 class="hero-title-txt">BIRDIE BASH <span>3D</span></h1>
      </div>

      <!-- ĐÁY MÀN HÌNH: THANH ĐIỀU HƯỚNG VÀ KHU VỰC BẮT ĐẦU -->
      <footer class="hub-bottom-dock">
        <!-- NÚT CHỌN CHẾ ĐỘ CHƠI (MODE SELECTION CARD) -->
        <div class="mode-select-card" id="btn-open-modes">
          <div class="mode-card-icon" id="mode-badge-icon">🤖</div>
          <div class="mode-card-info">
            <span class="mode-card-sub">CHẾ ĐỘ HIỆN TẠI</span>
            <span id="current-mode-name" class="mode-card-title">ĐẤU VỚI BOT (1v1)</span>
          </div>
          <button class="mode-card-change">ĐỔI CHẾ ĐỘ ▾</button>
        </div>

        <!-- NÚT BẮT ĐẦU TRANH TÀI (BIG PLAY BUTTON) -->
        <button id="btn-start" class="btn-hub-play">
          <span class="play-btn-icon">🏸</span>
          <div class="play-btn-text-group">
            <span class="play-btn-main">VÀO TRẬN ĐẤU</span>
            <span id="play-btn-sub" class="play-btn-sub">Cấp độ: Pro Bot</span>
          </div>
          <span class="play-btn-arrow">➜</span>
        </button>

        <!-- THANH ĐIỀU HƯỚNG TAB NHANH (NAVIGATION BAR) -->
        <nav class="hub-quick-nav">
          <button class="hub-nav-btn active" id="btn-nav-play" title="Sảnh chính">
            <span class="nav-icon">🏸</span>
            <span class="nav-label">Trận Đấu</span>
          </button>
          <button class="hub-nav-btn" id="btn-nav-roster" title="Phòng thay đồ & Đấu thủ">
            <span class="nav-icon">👕</span>
            <span class="nav-label">Đấu Thủ</span>
          </button>
          <button class="hub-nav-btn" id="btn-nav-online" title="Chơi Online">
            <span class="nav-icon">🌐</span>
            <span class="nav-label">Online</span>
          </button>
          <button class="hub-nav-btn" id="btn-nav-settings" title="Cài đặt">
            <span class="nav-icon">⚙️</span>
            <span class="nav-label">Cài Đặt</span>
          </button>
        </nav>
      </footer>

      <!-- ===================================================
           SUB-DRAWER 1: BẢNG CHỌN CHẾ ĐỘ THI ĐẤU HIỆN ĐẠI (MODES)
           =================================================== -->
      <div id="drawer-modes" class="hub-drawer hidden">
        <div class="drawer-header">
          <div class="drawer-title-group">
            <h3 class="drawer-title">CHỌN CHẾ ĐỘ THI ĐẤU</h3>
            <p class="drawer-sub">Tập luyện với AI hoặc tranh tài Online qua mạng</p>
          </div>
          <button class="drawer-close-btn" id="btn-close-modes">✕</button>
        </div>

        <div class="mode-grid">
          <!-- 1. ĐẤU VỚI BOT -->
          <div class="mode-option-card active" data-mode="bot" id="card-mode-bot">
            <div class="mode-option-top">
              <span class="mode-icon-lg">🤖</span>
              <span class="mode-badge-ready">SẴN SÀNG</span>
            </div>
            <h4 class="mode-option-name">Đấu Với Máy (Bot AI)</h4>
            <p class="mode-option-desc">Luyện kỹ thuật đón cầu, 3 cấp độ từ cơ bản đến đỉnh cao.</p>
            <div class="bot-diff-picker">
              <button class="diff-btn-chip" data-diff="rookie">🌱 Tập Sự</button>
              <button class="diff-btn-chip active" data-diff="pro">⚡ Bán Chuyên</button>
              <button class="diff-btn-chip" data-diff="ace">🔥 Huyền Thoại</button>
            </div>
            <button id="btn-quick-play-bot" class="btn-card-action primary mt-2">CHIẾN NGAY ➜</button>
          </div>

          <!-- 2. ĐẤU MẠNG ONLINE 1v1 -->
          <div class="mode-option-card" data-mode="online-1v1" id="card-mode-online">
            <div class="mode-option-top">
              <span class="mode-icon-lg">🌐</span>
              <span class="mode-badge-multi">ONLINE 1v1</span>
            </div>
            <h4 class="mode-option-name">Đấu Mạng 1v1 (Realtime)</h4>
            <p class="mode-option-desc">Tạo phòng riêng nhận link mời bạn bè hoặc ghép trận tức thì.</p>
            <div class="online-card-actions">
              <button id="btn-quick-match-1v1" class="btn-card-action primary">⚡ Ghép Nhanh 1v1</button>
              <button id="btn-create-room-1v1" class="btn-card-action secondary">➕ Tạo Phòng 1v1</button>
            </div>
            <div class="room-action-row">
              <input type="text" id="room-code-input" class="room-input" placeholder="Nhập mã 4 chữ..." maxlength="4" />
              <button id="btn-join-room" class="btn-room-join">Vào Phòng</button>
            </div>
          </div>

          <!-- 3. ĐÁNH ĐÔI 2v2 -->
          <div class="mode-option-card" data-mode="online-2v2" id="card-mode-2v2">
            <div class="mode-option-top">
              <span class="mode-icon-lg">👥</span>
              <span class="mode-badge-multi">ONLINE 2v2</span>
            </div>
            <h4 class="mode-option-name">Đánh Đôi 2v2 (Doubles)</h4>
            <p class="mode-option-desc">Phối hợp 2 người mỗi bên sân thi đấu trực tuyến cực đã.</p>
            <div class="online-card-actions">
              <button id="btn-quick-match-2v2" class="btn-card-action primary">⚡ Ghép Đôi 2v2</button>
              <button id="btn-create-room-2v2" class="btn-card-action secondary">➕ Tạo Phòng 2v2</button>
            </div>
          </div>

          <!-- 4. MÁY PHÁT CẦU TẬP LUYỆN -->
          <div class="mode-option-card locked">
            <div class="mode-option-top">
              <span class="mode-icon-lg">🎯</span>
              <span class="mode-badge-soon">SẮP RA MẮT</span>
            </div>
            <h4 class="mode-option-name">Máy Bắn Cầu (Practice)</h4>
            <p class="mode-option-desc">Luyện cú nhảy Smash và bỏ nhỏ sát lưới phản xạ nhanh.</p>
          </div>
        </div>
      </div>

      <!-- ===================================================
           SUB-DRAWER 2: PHÒNG THAY ĐỒ & 6 ĐẤU THỦ ĐA DẠNG (ROSTER)
           =================================================== -->
      <div id="drawer-roster" class="hub-drawer hidden">
        <div class="drawer-header">
          <div class="drawer-title-group">
            <h3 class="drawer-title">PHÒNG ĐẤU THỦ & TRANG PHỤC (6 ĐẤU THỦ)</h3>
            <p class="drawer-sub">Chọn nhân vật đại diện ra sân của bạn</p>
          </div>
          <button class="drawer-close-btn" id="btn-close-roster">✕</button>
        </div>

        <div class="roster-grid">
          <!-- 1. Shiba Dũng Cảm -->
          <div class="roster-card active" data-color="0xf59e0b" data-sec="0xffedd5" data-jersey="0x0284c7" data-avatar="🐶" data-name="Shiba Dũng Cảm">
            <div class="roster-avatar-box gold">🐶</div>
            <div class="roster-info">
              <h4 class="roster-name">Shiba Dũng Cảm</h4>
              <span class="roster-type">Số 7 · Toàn diện</span>
              <div class="roster-stat-bar">
                <span>Tốc độ:</span>
                <div class="stat-track"><div class="stat-fill" style="width: 88%"></div></div>
              </div>
            </div>
            <button class="btn-select-roster">ĐANG CHỌN</button>
          </div>

          <!-- 2. Kuro Neko (Mèo Đen Ninja) -->
          <div class="roster-card" data-color="0x1e293b" data-sec="0xffffff" data-jersey="0x7c3aed" data-avatar="🐱" data-name="Kuro Neko">
            <div class="roster-avatar-box dark">🐱</div>
            <div class="roster-info">
              <h4 class="roster-name">Kuro Neko (Ninja)</h4>
              <span class="roster-type">Số 11 · Kỹ thuật & Bỏ nhỏ</span>
              <div class="roster-stat-bar">
                <span>Bỏ nhỏ:</span>
                <div class="stat-track"><div class="stat-fill" style="width: 96%"></div></div>
              </div>
            </div>
            <button class="btn-select-roster">CHỌN</button>
          </div>

          <!-- 3. Gấu Bắc Cực (Polar Bear) -->
          <div class="roster-card" data-color="0xf8fafc" data-sec="0xe2e8f0" data-jersey="0xef4444" data-avatar="🐻" data-name="Gấu Bắc Cực">
            <div class="roster-avatar-box ice">🐻</div>
            <div class="roster-info">
              <h4 class="roster-name">Gấu Bắc Cực</h4>
              <span class="roster-type">Số 99 · Smash sấm sét</span>
              <div class="roster-stat-bar">
                <span>Smash:</span>
                <div class="stat-track"><div class="stat-fill" style="width: 98%"></div></div>
              </div>
            </div>
            <button class="btn-select-roster">CHỌN</button>
          </div>

          <!-- 4. Thỏ Trắng Tốc Độ (Speedy Bunny) -->
          <div class="roster-card" data-color="0xffffff" data-sec="0xfce7f3" data-jersey="0xec4899" data-avatar="🐰" data-name="Thỏ Trắng Tốc Độ">
            <div class="roster-avatar-box pink">🐰</div>
            <div class="roster-info">
              <h4 class="roster-name">Thỏ Trắng (Bunny)</h4>
              <span class="roster-type">Số 3 · Cứu cầu Dive</span>
              <div class="roster-stat-bar">
                <span>Cứu cầu:</span>
                <div class="stat-track"><div class="stat-fill" style="width: 95%"></div></div>
              </div>
            </div>
            <button class="btn-select-roster">CHỌN</button>
          </div>

          <!-- 5. Cáo Lửa Kyubi (Fire Fox) -->
          <div class="roster-card" data-color="0xea580c" data-sec="0xffedd5" data-jersey="0xf59e0b" data-avatar="🦊" data-name="Cáo Lửa Kyubi">
            <div class="roster-avatar-box orange">🦊</div>
            <div class="roster-info">
              <h4 class="roster-name">Cáo Lửa Kyubi</h4>
              <span class="roster-type">Số 9 · Xoáy lốc</span>
              <div class="roster-stat-bar">
                <span>Khéo léo:</span>
                <div class="stat-track"><div class="stat-fill" style="width: 92%"></div></div>
              </div>
            </div>
            <button class="btn-select-roster">CHỌN</button>
          </div>

          <!-- 6. Panda Bậc Thầy (Master Panda) -->
          <div class="roster-card" data-color="0x334155" data-sec="0xffffff" data-jersey="0x10b981" data-avatar="🐼" data-name="Panda Bậc Thầy">
            <div class="roster-avatar-box green">🐼</div>
            <div class="roster-info">
              <h4 class="roster-name">Panda Bậc Thầy</h4>
              <span class="roster-type">Số 88 · Phòng thủ thép</span>
              <div class="roster-stat-bar">
                <span>Bền bỉ:</span>
                <div class="stat-track"><div class="stat-fill" style="width: 95%"></div></div>
              </div>
            </div>
            <button class="btn-select-roster">CHỌN</button>
          </div>
        </div>
      </div>

      <!-- ===================================================
           SUB-DRAWER 3: CÀI ĐẶT (SETTINGS)
           =================================================== -->
      <div id="drawer-settings" class="hub-drawer hidden">
        <div class="drawer-header">
          <div class="drawer-title-group">
            <h3 class="drawer-title">CÀI ĐẶT GAME</h3>
            <p class="drawer-sub">Tùy chỉnh âm thanh và thao tác điều khiển</p>
          </div>
          <button class="drawer-close-btn" id="btn-close-settings">✕</button>
        </div>

        <div class="settings-list">
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-title">🔊 Hiệu Ứng Âm Thanh (SFX)</span>
              <span class="setting-desc">Tiếng đập cầu, tiếng vợt, reo hò khán giả</span>
            </div>
            <button id="toggle-sfx" class="btn-toggle active">BẬT</button>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-title">✨ Hỗ Trợ Đánh Thông Minh (Smart Assist)</span>
              <span class="setting-desc">Tự động chọn Smash, Drop, Dive chỉ với 1 nút</span>
            </div>
            <button id="toggle-assist" class="btn-toggle active">BẬT</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===================================================
         4. POPUP ĐỔI TÊN NGƯỜI CHƠI (RENAME MODAL)
         =================================================== -->
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

    <!-- ===================================================
         5. MODAL PHÒNG CHỜ ONLINE CAO CẤP (VIP ROOM LOBBY)
         =================================================== -->
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

        <!-- NÚT 1 CHẠM SAO CHÉP LINK MỜI BẠN BÈ SIÊU TIỆN LỢI -->
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

        <!-- DANH SÁCH ĐẤU THỦ TRONG PHÒNG -->
        <div class="room-players-slots" id="room-players-container">
          <!-- Đấu thủ 1 (Chủ phòng / Bạn) -->
          <div class="room-slot active">
            <span class="slot-avatar">🐶</span>
            <div class="slot-text">
              <span class="slot-name">${playerName} (Bạn)</span>
              <span class="slot-role host">🏠 Sân Nhà · Đội 1</span>
            </div>
            <span class="slot-badge ready">SẴN SÀNG</span>
          </div>

          <!-- Đấu thủ 2 (Đối thủ) -->
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
          <button id="btn-room-ready" class="btn-hub-play btn-room-ready">
            <span id="txt-room-ready">SẴN SÀNG CHIẾN ĐẤU 🔥</span>
          </button>
          <button id="btn-host-start" class="btn-hub-play btn-host-start pulse-start hidden">
            <span>BẮT ĐẦU TRẬN NGAY ➜</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 6. MODAL KẾT THÚC TRẬN -->
    <div id="game-over-modal" class="modal-overlay hidden">
      <div class="game-over-compact">
        <div id="result-trophy" class="result-trophy">🏆</div>
        <h2 id="result-title" class="result-title">CHIẾN THẮNG!</h2>
        <div class="score-summary">
          <span class="summary-lbl">Tỷ số:</span>
          <span id="final-score" class="summary-val">7 - 3</span>
        </div>
        <div class="game-over-btns">
          <button id="btn-replay" class="btn-hub-play btn-replay">
            <span>🔄 CHƠI LẠI</span>
          </button>
          <button id="btn-back-menu" class="btn-lobby-sub">
            VỀ SẢNH GAME 🏠
          </button>
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

            // Kiểm tra xem người dùng có mở link mời bạn bè qua URL ?room=XXXX không
            checkUrlInviteCode();
          }, 350);
        }
      }, 200);
    }
  }, 180);

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

  const savePlayerName = () => {
    const newName = inputPlayerName.value.trim();
    if (newName.length > 0) {
      playerName = newName;
      localStorage.setItem('birdie_player_name', playerName);
      document.getElementById('hub-player-name').innerText = playerName;
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
  // QUẢN LÝ TRẠNG THÁI SẢNH & SUB-DRAWERS
  // ==========================================
  let selectedMode = 'bot';
  let selectedDiff = 'pro';
  let selectedChar = {
    color: 0xf59e0b,
    secondaryColor: 0xffedd5,
    jerseyColor: 0x0284c7,
    avatar: '🐶',
    name: 'Shiba Dũng Cảm'
  };

  const drawerModes = document.getElementById('drawer-modes');
  const drawerRoster = document.getElementById('drawer-roster');
  const drawerSettings = document.getElementById('drawer-settings');

  const closeAllDrawers = () => {
    drawerModes.classList.add('hidden');
    drawerRoster.classList.add('hidden');
    drawerSettings.classList.add('hidden');
  };

  // Mở chọn chế độ
  document.getElementById('btn-open-modes').addEventListener('click', () => {
    closeAllDrawers();
    drawerModes.classList.remove('hidden');
  });
  document.getElementById('btn-close-modes').addEventListener('click', closeAllDrawers);

  // Mở chọn nhân vật
  document.getElementById('btn-nav-roster').addEventListener('click', () => {
    closeAllDrawers();
    drawerRoster.classList.remove('hidden');
  });
  document.getElementById('btn-close-roster').addEventListener('click', closeAllDrawers);

  // Mở Online
  document.getElementById('btn-nav-online').addEventListener('click', () => {
    closeAllDrawers();
    drawerModes.classList.remove('hidden');
    document.getElementById('card-mode-online').scrollIntoView({ behavior: 'smooth' });
  });

  // Mở Settings
  document.getElementById('btn-nav-settings').addEventListener('click', () => {
    closeAllDrawers();
    drawerSettings.classList.remove('hidden');
  });
  document.getElementById('btn-close-settings').addEventListener('click', closeAllDrawers);

  // Xử lý chọn độ khó trong chế độ Bot
  const diffChips = document.querySelectorAll('.diff-btn-chip');
  diffChips.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      diffChips.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      selectedDiff = btn.dataset.diff;
      botAI.setDifficulty(selectedDiff);
      document.getElementById('diff-tag').innerText = selectedDiff.toUpperCase();
      document.getElementById('play-btn-sub').innerText = `Cấp độ: ${selectedDiff.toUpperCase()} Bot`;
      selectedMode = 'bot';
      document.getElementById('current-mode-name').innerText = 'ĐẤU VỚI BOT (1v1)';
      document.getElementById('mode-badge-icon').innerText = '🤖';
    });
  });

  // Nút Chiến Ngay với Bot từ bảng chọn chế độ
  document.getElementById('btn-quick-play-bot').addEventListener('click', () => {
    closeAllDrawers();
    document.getElementById('btn-start').click();
  });

  // Xử lý chọn 6 nhân vật đa dạng (Đổi trực tiếp diện mạo trên sân 3D)
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
        color: parseInt(card.dataset.color),
        secondaryColor: parseInt(card.dataset.sec),
        jerseyColor: parseInt(card.dataset.jersey),
        avatar: card.dataset.avatar,
        name: card.dataset.name
      };
      document.getElementById('hub-player-avatar').innerText = selectedChar.avatar;
      document.getElementById('hud-avatar').innerText = selectedChar.avatar;
      if (onCharacterChange) onCharacterChange(selectedChar);
    });
  });

  // ==========================================
  // XỬ LÝ GIAI ĐOẠN 3: MULTIPLAYER FIREBASE REALTIME
  // ==========================================
  const modalOnlineRoom = document.getElementById('modal-online-room');
  const displayRoomCode = document.getElementById('display-room-code');
  const roomStatusNote = document.getElementById('room-status-note');
  const roomPlayersContainer = document.getElementById('room-players-container');
  const btnHostStart = document.getElementById('btn-host-start');
  const btnRoomReady = document.getElementById('btn-room-ready');
  const serverStatusTxt = document.getElementById('server-status-txt');
  const serverStatusPill = document.getElementById('server-status-pill');

  network.on('connected', (isConnected) => {
    if (isConnected) {
      serverStatusTxt.innerText = 'Firebase Realtime Online';
      serverStatusPill.classList.remove('offline');
    } else {
      serverStatusTxt.innerText = 'Đang kết nối lại...';
      serverStatusPill.classList.add('offline');
    }
  });

  // Cập nhật giao diện phòng khi có dữ liệu từ Firebase
  network.on('roomUpdated', ({ room, yourSlot, isHost }) => {
    modalOnlineRoom.classList.remove('hidden');
    displayRoomCode.innerText = room.code;
    document.getElementById('room-mode-tag').innerText = room.mode === '2v2' ? 'ONLINE 2v2 ĐÁNH ĐÔI' : 'ONLINE 1v1 REALTIME';

    let html = '';
    room.players.forEach((p, idx) => {
      const isYou = p.id === network.clientId;
      const isHostP = p.id === room.hostId;
      html += `
        <div class="room-slot active">
          <span class="slot-avatar">${p.avatar}</span>
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

  // Khi trận đấu Online bắt đầu
  network.on('matchStart', ({ room, yourSlot }) => {
    modalOnlineRoom.classList.add('hidden');
    closeAllDrawers();
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');

    const opponent = room.players.find((p) => p.slot !== yourSlot) || { name: 'ĐỐI THỦ', avatar: '🐱' };
    document.getElementById('hud-bot-name').innerText = opponent.name.toUpperCase();
    document.getElementById('hud-bot-avatar').innerText = opponent.avatar;
    document.getElementById('diff-tag').innerText = 'PVP';

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

  // Tạo phòng 1v1
  document.getElementById('btn-create-room-1v1').addEventListener('click', () => {
    closeAllDrawers();
    network.createRoom('1v1', playerName, selectedChar.avatar, selectedChar.color);
  });

  // Tạo phòng 2v2
  document.getElementById('btn-create-room-2v2').addEventListener('click', () => {
    closeAllDrawers();
    network.createRoom('2v2', playerName, selectedChar.avatar, selectedChar.color);
  });

  // Ghép nhanh 1v1
  document.getElementById('btn-quick-match-1v1').addEventListener('click', () => {
    closeAllDrawers();
    network.quickMatch('1v1', playerName, selectedChar.avatar, selectedChar.color);
  });

  // Ghép nhanh 2v2
  document.getElementById('btn-quick-match-2v2').addEventListener('click', () => {
    closeAllDrawers();
    network.quickMatch('2v2', playerName, selectedChar.avatar, selectedChar.color);
  });

  // Vào phòng bằng mã
  document.getElementById('btn-join-room').addEventListener('click', () => {
    const code = document.getElementById('room-code-input').value.trim();
    if (code.length >= 3) {
      closeAllDrawers();
      network.joinRoom(code, playerName, selectedChar.avatar, selectedChar.color);
    } else {
      alert('Vui lòng nhập mã phòng hợp lệ (4 ký tự)!');
    }
  });

  // Nút Sẵn sàng
  btnRoomReady.addEventListener('click', () => {
    network.toggleReady();
  });

  // Nút Chủ phòng Bắt đầu
  btnHostStart.addEventListener('click', () => {
    network.startMatch();
  });

  // Nút Rời phòng Online
  document.getElementById('btn-leave-room').addEventListener('click', () => {
    network.leaveRoom();
    modalOnlineRoom.classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
  });

  // ==========================================
  // XỬ LÝ NÚT PLAY SẢNH CHÍNH
  // ==========================================
  const startBtn = document.getElementById('btn-start');
  startBtn.addEventListener('click', () => {
    closeAllDrawers();
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');

    document.getElementById('hud-bot-name').innerText = 'BOT AI';
    document.getElementById('hud-bot-avatar').innerText = '🤖';

    if (!isTouchDevice) {
      const pcHints = document.getElementById('pc-hints');
      pcHints.classList.remove('hidden');
      setTimeout(() => { pcHints.classList.add('hidden'); }, 4500);
    }

    if (onStartGame) onStartGame(selectedDiff, selectedChar);
  });

  // Rời trận đấu về Hub
  document.getElementById('btn-pause-game').addEventListener('click', () => {
    if (gameManager.isMultiplayer) {
      network.leaveRoom();
    }
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('pc-hints').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
  });

  // Xử lý nút phím bấm
  const pcHints = document.getElementById('pc-hints');
  document.getElementById('btn-toggle-hints').addEventListener('click', () => {
    pcHints.classList.toggle('hidden');
  });
  document.getElementById('btn-close-hints').addEventListener('click', () => {
    pcHints.classList.add('hidden');
  });

  // Chơi lại
  document.getElementById('btn-replay').addEventListener('click', () => {
    document.getElementById('game-over-modal').classList.add('hidden');
    gameManager.startGame(selectedDiff);
  });

  // Về menu
  document.getElementById('btn-back-menu').addEventListener('click', () => {
    document.getElementById('game-over-modal').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
  });

  // ==========================================
  // CẢM ỨNG MOBILE PRO (SPORT CONTROLS)
  // ==========================================
  if (isTouchDevice) {
    const btnHit = document.getElementById('btn-hit');
    const btnSmash = document.getElementById('btn-smash');
    const btnDrop = document.getElementById('btn-drop');
    const btnDive = document.getElementById('btn-dive');

    const triggerHit = (type) => {
      if (gameManager.state === 'SERVE') {
        gameManager.playerServe();
      } else if (gameManager.state === 'RALLY') {
        if (type === 'smart') {
          gameManager.attemptSmartHit();
        } else if (type === 'dive') {
          gameManager.attemptPlayerDive();
        } else {
          gameManager.attemptPlayerHit(type);
        }
      }
    };

    btnHit.addEventListener('touchstart', (e) => { e.preventDefault(); triggerHit('smart'); });
    btnHit.addEventListener('click', () => triggerHit('smart'));

    btnSmash.addEventListener('touchstart', (e) => { e.preventDefault(); triggerHit('smash'); });
    btnSmash.addEventListener('click', () => triggerHit('smash'));

    btnDrop.addEventListener('touchstart', (e) => { e.preventDefault(); triggerHit('drop'); });
    btnDrop.addEventListener('click', () => triggerHit('drop'));

    btnDive.addEventListener('touchstart', (e) => { e.preventDefault(); triggerHit('dive'); });
    btnDive.addEventListener('click', () => triggerHit('dive'));

    setupVirtualJoystick(gameManager);
  }

  let bannerTimer = null;
  const bannerNotice = document.getElementById('banner-notice');
  const bannerTitle = document.getElementById('banner-title');
  const bannerSub = document.getElementById('banner-sub');

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

      // Hiển thị chỉ báo ai đang giao cầu
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

    gameManager.virtualJoystickDir = {
      x: clampedDist > 6 ? thumbX / maxRadius : 0,
      z: clampedDist > 6 ? thumbY / maxRadius : 0
    };
  };

  const handleEnd = () => {
    activeTouchId = null;
    thumb.style.transform = 'translate(0px, 0px)';
    gameManager.virtualJoystickDir = { x: 0, z: 0 };
  };

  zone.addEventListener('touchstart', (e) => {
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

  const onTouchEnd = (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchId) {
        handleEnd();
        break;
      }
    }
  };
  zone.addEventListener('touchend', onTouchEnd);
  zone.addEventListener('touchcancel', onTouchEnd);
}
