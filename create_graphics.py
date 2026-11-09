import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def draw_shuttlecock(draw, cx, cy, scale=1.0, angle=-25, has_fire=True):
    # Create high-res shuttlecock overlay
    size = int(400 * scale)
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    scx, scy = size // 2, size // 2

    # Fire glow/sparks if enabled
    if has_fire:
        for r, alpha, col in [
            (int(140 * scale), 40, (255, 69, 0)),
            (int(110 * scale), 60, (255, 140, 0)),
            (int(80 * scale), 90, (255, 215, 0)),
            (int(50 * scale), 140, (255, 255, 200))
        ]:
            d.ellipse([scx - r, scy - r + int(40 * scale), scx + r, scy + r + int(40 * scale)], fill=(*col, alpha))

        # Speed trail lines behind feathers
        for i in range(-3, 4):
            offset_x = i * int(18 * scale)
            d.line(
                [scx + offset_x, scy - int(30 * scale), scx + offset_x - int(70 * scale), scy - int(150 * scale)],
                fill=(255, 165, 0, 160),
                width=max(2, int(4 * scale))
            )

    # 1. Feathers (flared skirt)
    top_w = int(110 * scale)
    bot_w = int(46 * scale)
    skirt_h = int(120 * scale)
    skirt_top_y = scy - int(80 * scale)
    skirt_bot_y = skirt_top_y + skirt_h

    # Layered feather polygons
    # Shadow/backing
    d.polygon([
        (scx - top_w // 2, skirt_top_y),
        (scx + top_w // 2, skirt_top_y),
        (scx + bot_w // 2, skirt_bot_y),
        (scx - bot_w // 2, skirt_bot_y)
    ], fill=(235, 240, 248, 250), outline=(203, 213, 225, 255), width=max(1, int(2 * scale)))

    # Feather spines & overlap ribs
    num_ribs = 14
    for i in range(num_ribs + 1):
        t = i / num_ribs
        tx = scx - top_w // 2 + t * top_w
        bx = scx - bot_w // 2 + t * bot_w
        d.line([(tx, skirt_top_y), (bx, skirt_bot_y)], fill=(148, 163, 184, 180), width=max(1, int(1.5 * scale)))

    # Feather rib ties (2 horizontal thread lines)
    for tie_y in [skirt_top_y + int(45 * scale), skirt_top_y + int(85 * scale)]:
        frac = (tie_y - skirt_top_y) / skirt_h
        cur_w = (1 - frac) * top_w + frac * bot_w
        d.line([
            (scx - cur_w // 2, tie_y),
            (scx + cur_w // 2, tie_y)
        ], fill=(100, 116, 139, 210), width=max(1, int(2.5 * scale)))

    # 2. Colored Ribbon band (Electric Cyan / Royal Blue)
    band_h = int(16 * scale)
    band_w = int(46 * scale)
    band_y = skirt_bot_y - int(2 * scale)
    d.rounded_rectangle([
        scx - band_w // 2, band_y,
        scx + band_w // 2, band_y + band_h
    ], radius=max(2, int(4 * scale)), fill=(2, 132, 199, 255), outline=(14, 165, 233, 255), width=max(1, int(1.5 * scale)))

    # 3. Cork base (Natural White / Golden Cork Dome)
    cork_w = int(48 * scale)
    cork_h = int(44 * scale)
    cork_top_y = band_y + band_h - int(2 * scale)
    # Cork dome
    d.pieslice([
        scx - cork_w // 2, cork_top_y - cork_h // 2,
        scx + cork_w // 2, cork_top_y + cork_h * 3 // 2
    ], 0, 180, fill=(255, 255, 255, 255), outline=(226, 232, 240, 255), width=max(1, int(2 * scale)))

    # Subtle cork texture / shadow
    d.ellipse([
        scx - cork_w // 3, cork_top_y + int(12 * scale),
        scx + cork_w // 3, cork_top_y + int(28 * scale)
    ], fill=(241, 245, 249, 140))

    # Highlight glint
    d.ellipse([
        scx - int(12 * scale), cork_top_y + int(14 * scale),
        scx - int(4 * scale), cork_top_y + int(22 * scale)
    ], fill=(255, 255, 255, 240))

    # Rotate shuttlecock
    im_rot = im.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
    rx, ry = cx - im_rot.width // 2, cy - im_rot.height // 2
    draw._image.paste(im_rot, (rx, ry), im_rot)

def generate_og_image(out_path):
    width, height = 1200, 630
    img = Image.new('RGB', (width, height), (15, 23, 42)) # Deep slate navy #0f172a
    draw = ImageDraw.Draw(img)

    # 1. Background radial light glows (Stadium arena spotlights)
    # Magenta glow left-center
    for r in range(400, 0, -10):
        alpha = int(45 * (1 - r / 400))
        # Draw on temp RGBA image
        overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        d_ov = ImageDraw.Draw(overlay)
        d_ov.ellipse([800 - r, 300 - r, 800 + r, 300 + r], fill=(244, 63, 94, alpha)) # Pink/Rose glow
        d_ov.ellipse([950 - r // 2, 220 - r // 2, 950 + r // 2, 220 + r // 2], fill=(245, 158, 11, alpha // 2)) # Gold
        img.paste(Image.alpha_composite(img.convert('RGBA'), overlay).convert('RGB'))

    # Badminton court line accents in background
    d = ImageDraw.Draw(img)
    court_color = (30, 41, 59)
    court_line = (51, 65, 85)
    d.polygon([(650, 630), (1200, 630), (1200, 200), (900, 200)], fill=court_color)
    d.line([(650, 630), (900, 200)], fill=court_line, width=3)
    d.line([(925, 630), (1050, 200)], fill=court_line, width=2)
    d.line([(700, 500), (1200, 500)], fill=court_line, width=2)
    d.line([(770, 380), (1200, 380)], fill=court_line, width=2)

    # 2. Left Typography Section
    try:
        font_pill = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 20)
        font_title_3d = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 76)
        font_sub = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 28)
        font_badge = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 22)
        font_url = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 20)
    except:
        font_pill = ImageFont.load_default()
        font_title_3d = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        font_badge = ImageFont.load_default()
        font_url = ImageFont.load_default()

    # Top Brand Pill
    pill_text = "✨ TBOY STUDIO PRESENTS · 3D BADMINTON"
    d.rounded_rectangle([80, 65, 520, 105], radius=20, fill=(30, 41, 59), outline=(244, 63, 94), width=2)
    d.text((105, 74), pill_text, font=font_pill, fill=(254, 205, 211))

    # Main Title with 3D drop shadow
    title_x, title_y = 80, 130
    # Shadow layers
    for off in range(6, 0, -1):
        d.text((title_x + off, title_y + off), "Tboy Badminton 3D", font=font_title_3d, fill=(15, 23, 42))
    for off in range(3, 0, -1):
        d.text((title_x + off, title_y + off), "Tboy Badminton 3D", font=font_title_3d, fill=(190, 18, 60))
    d.text((title_x, title_y), "Tboy Badminton 3D", font=font_title_3d, fill=(255, 255, 255))

    # Subtitle
    d.text((82, 235), "Cầu Lông 3D Vui Nhộn · Tranh Tài Đỉnh Cao", font=font_sub, fill=(226, 232, 240))

    # 3 Feature Pills
    features = [
        ("🏸", "Chế Độ Đánh Đơn 1v1 & Đánh Đôi 2v2", (16, 185, 129)),
        ("🔥", "Tuyệt Chiêu Siêu Smash Tóe Lửa Cắm Sàn", (249, 115, 22)),
        ("🌐", "Đấu Mạng Realtime · Mã Phòng & Quét QR", (6, 182, 212))
    ]

    fy = 305
    for icon, text, col in features:
        # Icon box
        d.rounded_rectangle([80, fy, 130, fy + 48], radius=12, fill=(*col, 40), outline=col, width=2)
        d.text((95, fy + 8), icon, font=font_badge, fill=(255, 255, 255))
        # Text box
        d.rounded_rectangle([142, fy, 560, fy + 48], radius=12, fill=(30, 41, 59, 200), outline=(51, 65, 85), width=1)
        d.text((160, fy + 11), text, font=font_badge, fill=(241, 245, 249))
        fy += 64

    # Bottom footer / domain pill
    d.rounded_rectangle([80, 525, 360, 565], radius=12, fill=(15, 23, 42), outline=(100, 116, 139), width=1)
    d.text((100, 532), "👉 Chơi ngay: birdie-bash-3d.pages.dev", font=font_url, fill=(148, 163, 184))

    # 3. Dynamic Racket & Big Shuttlecock on Right Side
    # Draw Racket Head outline
    rcx, rcy = 1000, 440
    rw, rh = 170, 230
    d.ellipse([rcx - rw // 2, rcy - rh // 2, rcx + rw // 2, rcy + rh // 2], outline=(250, 204, 21), width=10) # Gold frame
    # Strings grid
    for sx in range(rcx - rw // 2 + 20, rcx + rw // 2, 20):
        d.line([(sx, rcy - rh // 2 + 15), (sx, rcy + rh // 2 - 15)], fill=(254, 240, 138, 90), width=1)
    for sy in range(rcy - rh // 2 + 20, rcy + rh // 2, 20):
        d.line([(rcx - rw // 2 + 15, sy), (rcx + rw // 2 - 15, sy)], fill=(254, 240, 138, 90), width=1)

    # Racket shaft & handle
    d.line([(rcx - 20, rcy + rh // 2), (rcx - 90, rcy + rh // 2 + 130)], fill=(202, 138, 4), width=12)
    d.line([(rcx - 90, rcy + rh // 2 + 130), (rcx - 130, rcy + rh // 2 + 200)], fill=(239, 68, 68), width=18) # Red grip

    # Giant flying 3D shuttlecock angled towards user
    draw_shuttlecock(draw, 870, 230, scale=1.45, angle=-32, has_fire=True)

    img.save(out_path, format='PNG', quality=95)
    print(f"Generated {out_path} ({width}x{height})")

def generate_square_icon(out_path, size=512):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded Squircle base (Smooth iOS/Android app icon shape)
    radius = int(size * 0.22)
    # Gradient background from bright coral rose to violet-indigo
    grad = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d_grad = ImageDraw.Draw(grad)

    for y in range(size):
        ratio = y / size
        # #f43f5e (244, 63, 94) to #8b5cf6 (139, 92, 246)
        r = int(244 * (1 - ratio) + 124 * ratio)
        g = int(63 * (1 - ratio) + 58 * ratio)
        b = int(94 * (1 - ratio) + 237 * ratio)
        d_grad.line([(0, y), (size, y)], fill=(r, g, b, 255))

    # Mask with rounded rect
    mask = Image.new('L', (size, size), 0)
    d_mask = ImageDraw.Draw(mask)
    d_mask.rounded_rectangle([0, 0, size, size], radius=radius, fill=255)
    img.paste(grad, (0, 0), mask)

    # Inner border shine
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([2, 2, size - 2, size - 2], radius=radius, outline=(255, 255, 255, 90), width=max(2, size // 90))

    # Center Shuttlecock
    sc_scale = size / 380.0
    draw_shuttlecock(draw, size // 2, int(size * 0.44), scale=sc_scale, angle=0, has_fire=True)

    # Bottom Pill "TBOY 3D"
    try:
        f_size = max(14, int(size * 0.11))
        font_logo = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', f_size)
    except:
        font_logo = ImageFont.load_default()

    pill_w = int(size * 0.72)
    pill_h = int(size * 0.18)
    pill_x1 = (size - pill_w) // 2
    pill_y1 = int(size * 0.75)
    pill_x2 = pill_x1 + pill_w
    pill_y2 = pill_y1 + pill_h

    # Glassmorphism pill
    draw.rounded_rectangle([pill_x1, pill_y1, pill_x2, pill_y2], radius=pill_h // 2, fill=(15, 23, 42, 220), outline=(255, 255, 255, 120), width=max(1, size // 150))
    text = "TBOY 3D"
    bbox = font_logo.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (size - tw) // 2
    ty = pill_y1 + (pill_h - th) // 2 - int(size * 0.015)
    draw.text((tx, ty), text, font=font_logo, fill=(255, 255, 255))

    img.save(out_path, format='PNG')
    print(f"Generated {out_path} ({size}x{size})")

if __name__ == '__main__':
    pub = os.path.join(os.path.dirname(__file__), 'public')
    os.makedirs(pub, exist_ok=True)
    generate_og_image(os.path.join(pub, 'og-image.png'))
    generate_square_icon(os.path.join(pub, 'icon-512.png'), 512)
    generate_square_icon(os.path.join(pub, 'icon-192.png'), 192)
    generate_square_icon(os.path.join(pub, 'apple-touch-icon.png'), 180)
    generate_square_icon(os.path.join(pub, 'favicon-32x32.png'), 32)
    generate_square_icon(os.path.join(pub, 'favicon-16x16.png'), 16)
