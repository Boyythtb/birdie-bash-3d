import os
import base64
from PIL import Image

img1_path = r'C:\Users\MSI PC\.gemini\antigravity\brain\8b5e701c-a91b-4c8e-ab04-ba489d463082\.user_uploaded\media_1794233217190_fde0210c.jpg'
img2_path = r'C:\Users\MSI PC\.gemini\antigravity\brain\8b5e701c-a91b-4c8e-ab04-ba489d463082\.user_uploaded\media_1794233237990_9e7e0d91.jpg'
pub_dir = r'd:\Code web\birdie-bash-3d\public'

# --- 1. PROCESS IMAGE 1 (HOME SCREEN ICONS) ---
im1 = Image.open(img1_path).convert('RGB')

# Crop content safely: x from 125 to 610, y from 0 to 630
crop1 = im1.crop((125, 0, 610, 630))
cw, ch = crop1.size

# Function to generate square icon of size S
def make_icon(size):
    bg = (246, 246, 246)
    canvas = Image.new('RGB', (size, size), bg)
    # Target height ~84% of size for safe squircle / circular mask margin
    th = int(size * 0.84)
    tw = int(cw * (th / ch))
    resized = crop1.resize((tw, th), Image.Resampling.LANCZOS)
    px = (size - tw) // 2
    py = (size - th) // 2
    canvas.paste(resized, (px, py))
    return canvas

# Generate 512, 192, 180 (apple-touch), 32, 16
icon_512 = make_icon(512)
icon_512.save(os.path.join(pub_dir, 'icon-512.png'), 'PNG', optimize=True)

icon_192 = make_icon(192)
icon_192.save(os.path.join(pub_dir, 'icon-192.png'), 'PNG', optimize=True)

icon_180 = make_icon(180)
icon_180.save(os.path.join(pub_dir, 'apple-touch-icon.png'), 'PNG', optimize=True)

icon_32 = make_icon(32)
icon_32.save(os.path.join(pub_dir, 'favicon-32x32.png'), 'PNG', optimize=True)

icon_16 = make_icon(16)
icon_16.save(os.path.join(pub_dir, 'favicon-16x16.png'), 'PNG', optimize=True)

# Generate favicon.svg with embedded base64 icon
with open(os.path.join(pub_dir, 'icon-192.png'), 'rb') as f:
    b64 = base64.b64encode(f.read()).decode('utf-8')

svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="44" fill="#f6f6f6"/>
  <image href="data:image/png;base64,{b64}" width="192" height="192"/>
</svg>'''

with open(os.path.join(pub_dir, 'favicon.svg'), 'w', encoding='utf-8') as f:
    f.write(svg_content)

print('Successfully generated Home Screen icons and favicons!')

# --- 2. PROCESS IMAGE 2 (SHARE IMAGE - OG-IMAGE.PNG) ---
im2 = Image.open(img2_path).convert('RGB')
# Crop logo content safely: x from 80 to 630, y from 100 to 365
crop2 = im2.crop((80, 100, 630, 365))
w2, h2 = crop2.size

W, H = 1200, 630
og_canvas = Image.new('RGB', (W, H), (255, 255, 255))

# Scale to fit nicely in 1200x630 (~76% height, ~480px high)
th2 = int(H * 0.76)
tw2 = int(w2 * (th2 / h2))
resized2 = crop2.resize((tw2, th2), Image.Resampling.LANCZOS)

px2 = (W - tw2) // 2
py2 = (H - th2) // 2
og_canvas.paste(resized2, (px2, py2))

og_canvas.save(os.path.join(pub_dir, 'og-image.png'), 'PNG', optimize=True)
print(f'Successfully generated og-image.png (1200x630, content: {tw2}x{th2} at ({px2}, {py2}))!')
