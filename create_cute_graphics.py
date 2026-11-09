import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def draw_chibi_mascot(img, cx, cy, scale=1.0, is_player=True, arm_swing=False):
    """Vẽ nhân vật Chibi siêu đáng yêu: đầu to tròn, tai thú, băng đô, mắt to long lanh, má hồng kawaii"""
    size = int(320 * scale)
    char_im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(char_im)
    ccx, ccy = size // 2, int(size * 0.48)

    # Màu sắc nhân vật
    # Player: Vàng mật ong ấm áp (#fbbf24 / #f59e0b), Áo xanh cyan / đỏ
    # Bot: Tím pastel hoa cà (#c084fc / #a855f7), Áo hồng dâu (#f472b6)
    main_col = (251, 191, 36) if is_player else (192, 132, 252)
    dark_col = (217, 119, 6) if is_player else (147, 51, 234)
    jersey_col = (2, 132, 199) if is_player else (244, 114, 182) # Xanh biển / Hồng
    inner_ear_col = (253, 164, 175) # Hồng phấn
    blush_col = (251, 113, 133, 210) # Má hồng đậm xinh xắn

    # 1. Bàn chân nhỏ (Feet)
    foot_w = int(28 * scale)
    foot_h = int(20 * scale)
    foot_y = ccy + int(96 * scale)
    for fx in [ccx - int(24 * scale), ccx + int(24 * scale)]:
        d.ellipse([fx - foot_w // 2, foot_y - foot_h // 2, fx + foot_w // 2, foot_y + foot_h // 2], fill=(255, 255, 255), outline=(203, 213, 225), width=max(1, int(2 * scale)))

    # 2. Thân tròn mũm mĩm & Áo thể thao (Body & Jersey)
    body_w = int(74 * scale)
    body_h = int(68 * scale)
    body_y = ccy + int(56 * scale)
    # Thân
    d.ellipse([ccx - body_w // 2, body_y - body_h // 2, ccx + body_w // 2, body_y + body_h // 2], fill=main_col, outline=dark_col, width=max(1, int(2 * scale)))
    # Áo thể thao
    jersey_h = int(46 * scale)
    d.rounded_rectangle([ccx - body_w // 2 + int(4 * scale), body_y - int(12 * scale), ccx + body_w // 2 - int(4 * scale), body_y + jersey_h], radius=int(14 * scale), fill=jersey_col, outline=(255, 255, 255), width=max(1, int(2 * scale)))
    
    # Số áo thi đấu (7 hoặc 2)
    try:
        f_num = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', max(10, int(22 * scale)))
    except:
        f_num = ImageFont.load_default()
    num_txt = "7" if is_player else "2"
    bbox_n = f_num.getbbox(num_txt)
    d.text((ccx - (bbox_n[2] - bbox_n[0]) // 2, body_y + int(3 * scale)), num_txt, font=f_num, fill=(255, 255, 255))

    # 3. Tay cầm vợt (Hands & Racket)
    hand_r = int(14 * scale)
    # Tay trái
    d.ellipse([ccx - int(44 * scale) - hand_r, body_y + int(8 * scale) - hand_r, ccx - int(44 * scale) + hand_r, body_y + int(8 * scale) + hand_r], fill=main_col, outline=dark_col, width=max(1, int(1.5 * scale)))
    # Tay phải giơ vợt lên
    hand_rx = ccx + int(48 * scale)
    hand_ry = body_y - int(10 * scale) if arm_swing else body_y + int(6 * scale)
    d.ellipse([hand_rx - hand_r, hand_ry - hand_r, hand_rx + hand_r, hand_ry + hand_r], fill=main_col, outline=dark_col, width=max(1, int(1.5 * scale)))

    # Vợt cầu lông cầm trên tay
    racket_angle = -35 if arm_swing else 25
    r_size = int(100 * scale)
    r_im = Image.new('RGBA', (r_size, r_size), (0, 0, 0, 0))
    rd = ImageDraw.Draw(r_im)
    rcx, rcy = r_size // 2, int(r_size * 0.35)
    rw, rh = int(36 * scale), int(46 * scale)
    # Khung vợt vàng kim / xanh
    racket_frame_col = (250, 204, 21) if is_player else (239, 68, 68)
    rd.ellipse([rcx - rw // 2, rcy - rh // 2, rcx + rw // 2, rcy + rh // 2], outline=racket_frame_col, width=max(2, int(4 * scale)))
    # Lưới cước
    for gx in range(rcx - rw // 2 + 6, rcx + rw // 2, max(4, int(7 * scale))):
        rd.line([(gx, rcy - rh // 2 + 4), (gx, rcy + rh // 2 - 4)], fill=(254, 240, 138, 140), width=1)
    for gy in range(rcy - rh // 2 + 6, rcy + rh // 2, max(4, int(7 * scale))):
        rd.line([(rcx - rw // 2 + 4, gy), (rcx + rw // 2 - 4, gy)], fill=(254, 240, 138, 140), width=1)
    # Cán vợt & quấn cán
    rd.line([(rcx, rcy + rh // 2), (rcx, rcy + rh // 2 + int(36 * scale))], fill=(100, 116, 139), width=max(2, int(3 * scale)))
    rd.line([(rcx, rcy + rh // 2 + int(24 * scale)), (rcx, rcy + rh // 2 + int(42 * scale))], fill=(244, 63, 94), width=max(3, int(5 * scale)))

    r_rot = r_im.rotate(racket_angle, resample=Image.Resampling.BICUBIC, expand=True)
    char_im.paste(r_rot, (hand_rx - r_rot.width // 2 + int(12 * scale), hand_ry - r_rot.height // 2 - int(24 * scale)), r_rot)

    # 4. Tai thú dễ thương (Ears)
    ear_w = int(28 * scale)
    ear_h = int(42 * scale)
    ear_y = ccy - int(72 * scale)
    # Tai trái
    d.polygon([(ccx - int(54 * scale), ear_y + ear_h), (ccx - int(38 * scale), ear_y), (ccx - int(22 * scale), ear_y + ear_h)], fill=main_col, outline=dark_col, width=max(1, int(2 * scale)))
    d.polygon([(ccx - int(48 * scale), ear_y + ear_h - int(4 * scale)), (ccx - int(38 * scale), ear_y + int(8 * scale)), (ccx - int(28 * scale), ear_y + ear_h - int(4 * scale))], fill=inner_ear_col)
    # Tai phải
    d.polygon([(ccx + int(22 * scale), ear_y + ear_h), (ccx + int(38 * scale), ear_y), (ccx + int(54 * scale), ear_y + ear_h)], fill=main_col, outline=dark_col, width=max(1, int(2 * scale)))
    d.polygon([(ccx + int(28 * scale), ear_y + ear_h - int(4 * scale)), (ccx + int(38 * scale), ear_y + int(8 * scale)), (ccx + int(48 * scale), ear_y + ear_h - int(4 * scale))], fill=inner_ear_col)

    # 5. Đầu to tròn Chibi (Head)
    head_w = int(120 * scale)
    head_h = int(108 * scale)
    head_y = ccy - int(10 * scale)
    d.ellipse([ccx - head_w // 2, head_y - head_h // 2, ccx + head_w // 2, head_y + head_h // 2], fill=main_col, outline=dark_col, width=max(1, int(2 * scale)))

    # 6. Băng đô thể thao trên trán (Headband with stripe)
    band_h = int(18 * scale)
    band_y = head_y - int(24 * scale)
    d.rounded_rectangle([ccx - head_w // 2 + int(2 * scale), band_y, ccx + head_w // 2 - int(2 * scale), band_y + band_h], radius=int(8 * scale), fill=(255, 255, 255), outline=(226, 232, 240), width=1)
    stripe_col = (239, 68, 68) if is_player else (2, 132, 199)
    d.rectangle([ccx - head_w // 2 + int(4 * scale), band_y + int(6 * scale), ccx + head_w // 2 - int(4 * scale), band_y + int(11 * scale)], fill=stripe_col)

    # 7. Má hồng Kawaii đáng yêu (Cute Blush Cheeks)
    blush_w = int(22 * scale)
    blush_h = int(13 * scale)
    blush_y = head_y + int(14 * scale)
    d.ellipse([ccx - int(42 * scale) - blush_w // 2, blush_y - blush_h // 2, ccx - int(42 * scale) + blush_w // 2, blush_y + blush_h // 2], fill=blush_col)
    d.ellipse([ccx + int(42 * scale) - blush_w // 2, blush_y - blush_h // 2, ccx + int(42 * scale) + blush_w // 2, blush_y + blush_h // 2], fill=blush_col)

    # 8. Đôi mắt to tròn long lanh (Big sparkling anime eyes)
    eye_r = int(13 * scale)
    eye_y = head_y + int(6 * scale)
    for ex in [ccx - int(24 * scale), ccx + int(24 * scale)]:
        # Tròng đen
        d.ellipse([ex - eye_r, eye_y - eye_r, ex + eye_r, eye_y + eye_r], fill=(15, 23, 42))
        # Điểm sáng lớn long lanh
        d.ellipse([ex - int(4 * scale), eye_y - int(7 * scale), ex + int(5 * scale), eye_y + int(2 * scale)], fill=(255, 255, 255))
        # Điểm sáng phụ nhỏ
        d.ellipse([ex + int(2 * scale), eye_y + int(3 * scale), ex + int(6 * scale), eye_y + int(7 * scale)], fill=(255, 255, 255))

    # 9. Mũi nhỏ & Miệng cười chúm chím (Snout & Happy Cat Smile :3)
    # Mũi đen nhỏ xinh
    d.ellipse([ccx - int(4 * scale), head_y + int(14 * scale), ccx + int(4 * scale), head_y + int(20 * scale)], fill=(15, 23, 42))
    # Miệng cười chúm chím dễ thương (w shape)
    my = head_y + int(22 * scale)
    d.arc([ccx - int(12 * scale), my, ccx, my + int(10 * scale)], 0, 180, fill=(15, 23, 42), width=max(1, int(2 * scale)))
    d.arc([ccx, my, ccx + int(12 * scale), my + int(10 * scale)], 0, 180, fill=(15, 23, 42), width=max(1, int(2 * scale)))

    # Dán vào ảnh chính
    rx = cx - char_im.width // 2
    ry = cy - char_im.height // 2
    img.paste(char_im, (rx, ry), char_im)

def draw_kawaii_shuttlecock(img, cx, cy, scale=1.0, angle=-20):
    """Quả cầu lông Chibi mặt cười đáng yêu (Kawaii smiling birdie)"""
    size = int(240 * scale)
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    scx, scy = size // 2, size // 2

    # Vệt cầu vồng / sao bay lấp lánh (Rainbow speed trail)
    trail_colors = [(255, 107, 107, 160), (255, 224, 102, 180), (77, 171, 247, 160), (218, 119, 242, 160)]
    for i, col in enumerate(trail_colors):
        off = (i - 1.5) * int(10 * scale)
        d.line([scx + off, scy - int(10 * scale), scx + off - int(60 * scale), scy - int(100 * scale)], fill=col, width=max(2, int(4 * scale)))

    # Váy lông vũ trắng bồng bềnh
    tw = int(68 * scale)
    bw = int(32 * scale)
    sh = int(72 * scale)
    sty = scy - int(50 * scale)
    sby = sty + sh

    d.polygon([(scx - tw // 2, sty), (scx + tw // 2, sty), (scx + bw // 2, sby), (scx - bw // 2, sby)], fill=(255, 255, 255, 255), outline=(226, 232, 240, 255), width=max(1, int(2 * scale)))
    # Gân lông vũ
    for i in range(7):
        t = i / 6
        tx = scx - tw // 2 + t * tw
        bx = scx - bw // 2 + t * bw
        d.line([(tx, sty), (bx, sby)], fill=(203, 213, 225, 220), width=1)
    # Dây buộc hồng / xanh
    d.line([(scx - int(26 * scale), sty + int(28 * scale)), (scx + int(26 * scale), sty + int(28 * scale))], fill=(244, 114, 182), width=max(1, int(2 * scale)))
    d.line([(scx - int(20 * scale), sty + int(50 * scale)), (scx + int(20 * scale), sty + int(50 * scale))], fill=(244, 114, 182), width=max(1, int(2 * scale)))

    # Dải ruy băng xanh ngọc
    band_y = sby - int(2 * scale)
    band_h = int(10 * scale)
    band_w = int(32 * scale)
    d.rounded_rectangle([scx - band_w // 2, band_y, scx + band_w // 2, band_y + band_h], radius=int(3 * scale), fill=(6, 182, 212), outline=(14, 165, 233), width=1)

    # Đế bần mặt cười Kawaii
    cork_w = int(36 * scale)
    cork_h = int(32 * scale)
    cork_top_y = band_y + band_h - int(1 * scale)
    d.pieslice([scx - cork_w // 2, cork_top_y - cork_h // 2, scx + cork_w // 2, cork_top_y + cork_h * 3 // 2], 0, 180, fill=(255, 255, 255), outline=(226, 232, 240), width=max(1, int(1.5 * scale)))

    # Mặt cười kawaii trên đế bần: mắt hí ( ^ . ^ )
    ey = cork_top_y + int(10 * scale)
    d.arc([scx - int(10 * scale), ey, scx - int(4 * scale), ey + int(6 * scale)], 180, 360, fill=(15, 23, 42), width=max(1, int(1.5 * scale)))
    d.arc([scx + int(4 * scale), ey, scx + int(10 * scale), ey + int(6 * scale)], 180, 360, fill=(15, 23, 42), width=max(1, int(1.5 * scale)))
    # Má hồng quả cầu
    d.ellipse([scx - int(13 * scale), ey + int(4 * scale), scx - int(7 * scale), ey + int(8 * scale)], fill=(251, 113, 133, 200))
    d.ellipse([scx + int(7 * scale), ey + int(4 * scale), scx + int(13 * scale), ey + int(8 * scale)], fill=(251, 113, 133, 200))
    # Miệng cười
    d.arc([scx - int(4 * scale), ey + int(4 * scale), scx + int(4 * scale), ey + int(10 * scale)], 0, 180, fill=(244, 63, 94), width=max(1, int(1.5 * scale)))

    im_rot = im.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
    rx, ry = cx - im_rot.width // 2, cy - im_rot.height // 2
    img.paste(im_rot, (rx, ry), im_rot)

def generate_cute_og_image(out_path):
    width, height = 1200, 630
    img = Image.new('RGB', (width, height), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    # 1. Background gradient ngọt ngào: Hồng kẹo mút (#fff1f2 -> #fce7f3) chuyển sang Vàng nhạt (#fef9c3) & Xanh mint (#dcfce7)
    for y in range(height):
        ratio = y / height
        # Gradient dọc từ hồng phấn sang vàng kem
        r = int(255 * (1 - ratio) + 254 * ratio)
        g = int(241 * (1 - ratio) + 249 * ratio)
        b = int(245 * (1 - ratio) + 215 * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # Mặt sân cầu lông màu xanh mint pastel ở nửa dưới
    court_poly = [(0, 480), (width, 480), (width, height), (0, height)]
    draw.polygon(court_poly, fill=(209, 250, 229)) # #d1fae5
    draw.line([(0, 480), (width, 480)], fill=(110, 231, 183), width=4) # Vạch biên
    draw.line([(width // 2, 480), (width // 2, height)], fill=(255, 255, 255), width=3)
    draw.line([(180, 480), (180, height)], fill=(255, 255, 255), width=3)
    draw.line([(width - 180, 480), (width - 180, height)], fill=(255, 255, 255), width=3)

    # Ngôi sao lấp lánh trang trí nền (Sparkles & Stars)
    def draw_star(dx, dy, s, col):
        draw.polygon([(dx, dy - s), (dx + s // 3, dy - s // 3), (dx + s, dy), (dx + s // 3, dy + s // 3), (dx, dy + s), (dx - s // 3, dy + s // 3), (dx - s, dy), (dx - s // 3, dy - s // 3)], fill=col)

    draw_star(160, 130, 16, (251, 191, 36))
    draw_star(480, 90, 12, (244, 114, 182))
    draw_star(620, 170, 20, (251, 146, 60))
    draw_star(1080, 100, 15, (56, 189, 248))
    draw_star(1140, 240, 12, (244, 114, 182))
    draw_star(90, 360, 14, (251, 191, 36))

    # 2. Typography đáng yêu, tròn trịa
    try:
        font_pill = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 20)
        font_title_3d = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 72)
        font_sub = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 26)
        font_badge = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 21)
        font_url = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 20)
    except:
        font_pill = ImageFont.load_default()
        font_title_3d = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        font_badge = ImageFont.load_default()
        font_url = ImageFont.load_default()

    # Top Brand Pill ngọt ngào
    draw.rounded_rectangle([75, 45, 520, 88], radius=22, fill=(255, 255, 255), outline=(244, 114, 182), width=2)
    draw.text((98, 54), "🌸 TBOY STUDIO · GAME CẦU LÔNG SIÊU CƯNG 🌸", font=font_pill, fill=(225, 29, 72))

    # Title: Tboy Badminton 3D với hiệu ứng viền kẹo ngọt 3D
    title_x, title_y = 75, 105
    # Shadow kẹo ngọt hồng đậm
    for off in range(6, 0, -1):
        draw.text((title_x + off, title_y + off), "Tboy Badminton 3D", font=font_title_3d, fill=(244, 63, 94))
    # Viền trắng
    for ox, oy in [(-2, 0), (2, 0), (0, -2), (0, 2), (-2, -2), (2, 2)]:
        draw.text((title_x + ox, title_y + oy), "Tboy Badminton 3D", font=font_title_3d, fill=(255, 255, 255))
    # Mặt chữ gradient vàng chanh / hồng
    draw.text((title_x, title_y), "Tboy Badminton 3D", font=font_title_3d, fill=(255, 255, 255))

    # Subtitle trong khung bo tròn
    draw.rounded_rectangle([75, 205, 580, 248], radius=15, fill=(255, 255, 255, 220), outline=(251, 146, 60), width=1)
    draw.text((95, 212), "🏸 Đập Cầu Chibi Siêu Dễ Thương · Vui Nhộn Bất Tận! 💖", font=font_sub, fill=(194, 65, 12))

    # 3 Badges tính năng dễ thương
    cute_badges = [
        ("🐥", "Bé Gấu & Mèo Chibi Thi Đấu Siêu Đáng Yêu", (251, 191, 36), (254, 243, 199)),
        ("🔥", "Tuyệt Chiêu Smash Tóe Lửa Đơn 1v1 & Đôi 2v2", (244, 63, 94), (255, 228, 230)),
        ("🌐", "Quét Mã QR Chơi Realtime Cùng Bạn Bè Cực Dễ", (6, 182, 212), (207, 250, 254))
    ]

    by = 270
    for icon, text, border_col, bg_col in cute_badges:
        draw.rounded_rectangle([75, by, 580, by + 46], radius=14, fill=bg_col, outline=border_col, width=2)
        draw.text((92, by + 8), icon, font=font_badge, fill=(255, 255, 255))
        draw.text((130, by + 10), text, font=font_badge, fill=(15, 23, 42))
        by += 58

    # CTA Pill góc dưới
    draw.rounded_rectangle([75, 460, 480, 508], radius=24, fill=(244, 63, 94), outline=(255, 255, 255), width=2)
    draw.text((105, 472), "👉 Chơi Miễn Phí Ngay: birdie-bash-3d.pages.dev", font=font_url, fill=(255, 255, 255))

    # 3. Vẽ 2 nhân vật Chibi và Quả cầu Kawaii tương tác cực sống động
    # Nhân vật 1: Bé Gấu Vàng (Player) cầm vợt vui sướng
    draw_chibi_mascot(img, 760, 390, scale=1.35, is_player=True, arm_swing=True)

    # Nhân vật 2: Bé Mèo Tím (Đối thủ/Đồng đội) nhảy nhót
    draw_chibi_mascot(img, 1070, 420, scale=1.18, is_player=False, arm_swing=False)

    # Quả cầu lông mặt cười bay giữa 2 bé
    draw_kawaii_shuttlecock(img, 915, 210, scale=1.3, angle=-18)

    # Trái tim và nốt nhạc bay lơ lửng
    def draw_heart(hx, hy, s, col):
        r = s // 2
        draw.pieslice([hx - s, hy - r, hx, hy + r], 180, 360, fill=col)
        draw.pieslice([hx, hy - r, hx + s, hy + r], 180, 360, fill=col)
        draw.polygon([(hx - s, hy), (hx + s, hy), (hx, hy + s)], fill=col)

    draw_heart(880, 140, 14, (244, 63, 94))
    draw_heart(700, 260, 11, (251, 113, 133))
    draw_heart(1130, 290, 13, (244, 63, 94))

    img.save(out_path, format='PNG', quality=95)
    print(f"Generated Cute OG Image: {out_path} (1200x630)")

def generate_cute_app_icon(out_path, size=512):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded Squircle base ngọt ngào (Hồng đào gradient sáng tươi)
    radius = int(size * 0.22)
    grad = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d_grad = ImageDraw.Draw(grad)

    for y in range(size):
        ratio = y / size
        # #f472b6 (hồng phấn) sang #fb7185 (hồng đào) và #fde047 (vàng nắng pastel)
        r = int(244 * (1 - ratio) + 251 * ratio)
        g = int(114 * (1 - ratio) + 160 * ratio)
        b = int(182 * (1 - ratio) + 120 * ratio)
        d_grad.line([(0, y), (size, y)], fill=(r, g, b, 255))

    mask = Image.new('L', (size, size), 0)
    d_mask = ImageDraw.Draw(mask)
    d_mask.rounded_rectangle([0, 0, size, size], radius=radius, fill=255)
    img.paste(grad, (0, 0), mask)

    # Viền sáng bóng bẩy kiểu Apple Glass
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([2, 2, size - 2, size - 2], radius=radius, outline=(255, 255, 255, 160), width=max(2, size // 70))

    # Vẽ Bé Gấu Chibi to chiếm trung tâm icon
    char_scale = size / 240.0
    draw_chibi_mascot(img, int(size * 0.46), int(size * 0.46), scale=char_scale, is_player=True, arm_swing=True)

    # Mini Quả cầu Kawaii góc phải trên
    sc_scale = size / 480.0
    draw_kawaii_shuttlecock(img, int(size * 0.78), int(size * 0.26), scale=sc_scale, angle=25)

    # Bottom Pill "TBOY 3D" kẹo ngọt
    try:
        f_size = max(13, int(size * 0.105))
        font_logo = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', f_size)
    except:
        font_logo = ImageFont.load_default()

    pill_w = int(size * 0.74)
    pill_h = int(size * 0.17)
    pill_x1 = (size - pill_w) // 2
    pill_y1 = int(size * 0.77)
    pill_x2 = pill_x1 + pill_w
    pill_y2 = pill_y1 + pill_h

    draw.rounded_rectangle([pill_x1, pill_y1, pill_x2, pill_y2], radius=pill_h // 2, fill=(255, 255, 255, 240), outline=(244, 63, 94), width=max(1, size // 100))
    text = "TBOY 3D 🏸"
    bbox = font_logo.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (size - tw) // 2
    ty = pill_y1 + (pill_h - th) // 2 - int(size * 0.012)
    draw.text((tx, ty), text, font=font_logo, fill=(225, 29, 72))

    img.save(out_path, format='PNG')
    print(f"Generated Cute App Icon: {out_path} ({size}x{size})")

if __name__ == '__main__':
    pub = os.path.join(os.path.dirname(__file__), 'public')
    os.makedirs(pub, exist_ok=True)
    generate_cute_og_image(os.path.join(pub, 'og-image.png'))
    generate_cute_app_icon(os.path.join(pub, 'icon-512.png'), 512)
    generate_cute_app_icon(os.path.join(pub, 'icon-192.png'), 192)
    generate_cute_app_icon(os.path.join(pub, 'apple-touch-icon.png'), 180)
    generate_cute_app_icon(os.path.join(pub, 'favicon-32x32.png'), 32)
    generate_cute_app_icon(os.path.join(pub, 'favicon-16x16.png'), 16)
