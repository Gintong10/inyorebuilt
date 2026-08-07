#!/usr/bin/env python3
"""Compose before/after pairs, write PDF report, and refresh the canvas."""

from __future__ import annotations

import base64
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas as pdfcanvas

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "shots"
EMBED = ROOT / "canvas-embeds"
PDF = ROOT / "Inyo-Before-After-Edits.pdf"
CANVAS = Path(
    "/Users/jintong/.cursor/projects/Users-jintong-Projects-inyorebuilt/canvases/before-after-edits.canvas.tsx"
)

OUT.mkdir(parents=True, exist_ok=True)
EMBED.mkdir(parents=True, exist_ok=True)

try:
    FONT = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 16)
except Exception:
    FONT = ImageFont.load_default()


def side(b: Path, a: Path, dest: Path, blabel: str, alabel: str, caption: str = "") -> Path:
    imb = Image.open(b).convert("RGBA")
    ima = Image.open(a).convert("RGBA")
    band = 64
    h = max(imb.height, ima.height)
    w = imb.width + ima.width + 24
    canvas = Image.new("RGBA", (w, h + band), (244, 241, 234, 255))
    d = ImageDraw.Draw(canvas)
    d.text((20, 12), blabel, fill=(40, 40, 40), font=FONT)
    d.text((imb.width + 44, 12), alabel, fill=(40, 40, 40), font=FONT)
    if caption:
        d.text((20, 36), caption, fill=(100, 100, 100), font=FONT)
    canvas.paste(imb, (0, band))
    canvas.paste(ima, (imb.width + 24, band))
    d.rectangle(
        [imb.width + 10, band, imb.width + 14, h + band], fill=(200, 196, 188, 255)
    )
    canvas.convert("RGB").save(dest, "PNG")
    return dest


def zoom_logo(src: Path, dest: Path) -> Path:
    im = Image.open(src)
    w, h = im.size
    im.crop((w // 2 - 200, 0, w // 2 + 200, 240)).save(dest)
    return dest


def crop_chat(src: Path, dest: Path, *, ref: Path | None = None) -> Path:
    """Crop phone chat header. Prefer yellow-avatar location from `ref` (after shot)."""
    im = Image.open(src).convert("RGB")
    probe = Image.open(ref).convert("RGB") if ref else im
    w, h = probe.size
    hits = []
    for y in range(int(h * 0.15), int(h * 0.55), 2):
        for x in range(int(w * 0.35), int(w * 0.65), 2):
            r, g, b = probe.getpixel((x, y))
            if r > 200 and g > 220 and b < 180 and (r + g) > 2.2 * b:
                hits.append((x, y))
    if hits:
        cx = sum(p[0] for p in hits) // len(hits)
        cy = sum(p[1] for p in hits) // len(hits)
    else:
        cx, cy = w // 2, int(h * 0.35)
    box = (max(0, cx - 380), max(0, cy - 50), min(w, cx + 380), min(h, cy + 130))
    im.crop(box).save(dest)
    return dest


# Favicon board
size = 200
imgs = []
for name in ("favicon-before.png", "favicon-after.png", "avatar-after.png"):
    imgs.append(
        Image.open(OUT / name)
        .convert("RGBA")
        .resize((size, size), Image.Resampling.LANCZOS)
    )
pad, gap, band = 36, 40, 70
board = Image.new(
    "RGB", (pad * 2 + size * 3 + gap * 2, band + size + pad), (244, 241, 234)
)
d = ImageDraw.Draw(board)
for i, lab in enumerate(("BEFORE favicon", "AFTER favicon", "AFTER chat avatar")):
    x = pad + i * (size + gap)
    d.text((x, 22), lab, fill=(40, 40, 40), font=FONT)
    board.paste(imgs[i], (x, band), imgs[i])
board.save(OUT / "compare-favicon-assets.png")

# Privacy title board
title = Image.new("RGB", (1100, 240), (244, 241, 234))
d = ImageDraw.Draw(title)
d.text((30, 18), "BEFORE — document <title>", fill=(80, 80, 80), font=FONT)
d.text((580, 18), "AFTER — document <title>", fill=(80, 80, 80), font=FONT)


def tab(x, y, w, h, t):
    d.rounded_rectangle(
        [x, y, x + w, y + h], radius=10, fill=(255, 255, 255), outline=(210, 205, 195)
    )
    d.ellipse([x + 12, y + 14, x + 36, y + 38], fill=(245, 255, 102))
    d.text((x + 46, y + 16), t, fill=(30, 30, 30), font=FONT)


tab(30, 60, 500, 52, "{{Title}} — inyo")
tab(580, 60, 500, 52, "Privacy Policy — inyo")
d.text(
    (30, 150),
    "original/legal  ·  same fix for Terms & Conditions",
    fill=(110, 110, 110),
    font=FONT,
)
title.save(OUT / "compare-privacy-title.png")

pairs = [
    ("01-hero", "compare-hero.png", "BEFORE (original)", "AFTER (changed)", "Hero / home"),
    (
        "02-slide-lock",
        "compare-slide-lock.png",
        "BEFORE — logo stays opaque",
        "AFTER — logo fades on slide lock",
        "Slide-locked section",
    ),
    (
        "03-chat",
        "compare-chat-full.png",
        "BEFORE (original)",
        "AFTER (changed)",
        "Chat simulation",
    ),
    (
        "04-web-logic",
        "compare-web-logic.png",
        "BEFORE — free scroll",
        "AFTER — sticky scroll-lock",
        "Web Logic section",
    ),
]

for key, dest, bl, al, cap in pairs:
    side(OUT / f"before-{key}.png", OUT / f"after-{key}.png", OUT / dest, bl, al, cap)

# Prefer element-clipped logo zooms from recapture_headers.mjs when present
if not (OUT / "before-logo-zoom.png").exists() or not (OUT / "after-logo-zoom.png").exists():
    zoom_logo(OUT / "before-02-slide-lock.png", OUT / "before-logo-zoom.png")
    zoom_logo(OUT / "after-02-slide-lock.png", OUT / "after-logo-zoom.png")
side(
    OUT / "before-logo-zoom.png",
    OUT / "after-logo-zoom.png",
    OUT / "compare-logo-fade-zoom.png",
    "BEFORE — logo opaque",
    "AFTER — logo hidden on slide lock (0%)",
    "Header logo on locked slide",
)

# Prefer element screenshots of Chat Header (actual top-left PFP)
chat_before = OUT / "before-chat-header.png"
chat_after = OUT / "after-chat-header.png"
if not chat_before.exists() or not chat_after.exists():
    chat_before = OUT / "before-chat-phone-top.png"
    chat_after = OUT / "after-chat-phone-top.png"
if not chat_before.exists() or not chat_after.exists():
    ref_chat = OUT / "after-03-chat.png"
    crop_chat(OUT / "before-03-chat.png", OUT / "before-chat-header.png", ref=ref_chat)
    crop_chat(OUT / "after-03-chat.png", OUT / "after-chat-header.png", ref=ref_chat)
    chat_before = OUT / "before-chat-header.png"
    chat_after = OUT / "after-chat-header.png"
side(
    chat_before,
    chat_after,
    OUT / "compare-chat-header.png",
    "BEFORE — missing / broken PFP",
    "AFTER — yellow-circle PFP (top-left)",
    "Phone chat header",
)

# ---- PDF (compact ~2 pages) ----
# One best shot per edit; pack 2–3 edits per page.
EDITS = [
    {
        "num": "01",
        "title": "Favicon",
        "blurb": "Black wave + “inyo” text → wave on yellow circle #f5ff66",
        "image": "compare-favicon-assets.png",
        "max_h": 1.35 * inch,
    },
    {
        "num": "02",
        "title": "Chat PFPs",
        "blurb": "Phone header top-left PFP missing/broken → yellow-circle Inyo mark",
        "image": "compare-chat-header.png",
        "max_h": 1.55 * inch,
    },
    {
        "num": "03",
        "title": "Logo on slide lock",
        "blurb": "Always opaque → 100% between slides, 0% when a slide locks (home stays visible)",
        "image": "compare-logo-fade-zoom.png",
        "max_h": 1.35 * inch,
    },
    {
        "num": "04",
        "title": "Web Logic scroll-lock",
        "blurb": "Free scroll → sticky pin; bottom nav hides while locked; cream blend kept",
        "image": "compare-web-logic.png",
        "max_h": 2.35 * inch,
    },
    {
        "num": "05",
        "title": "Legal titles",
        "blurb": "{{Title}} — inyo → Privacy Policy / Terms & Conditions — inyo",
        "image": "compare-privacy-title.png",
        "max_h": 1.0 * inch,
    },
]


def draw_wrapped(c, text, x, y, max_w, font="Helvetica", size=10, leading=13, color=(0.2, 0.2, 0.2)):
    c.setFont(font, size)
    c.setFillColorRGB(*color)
    words = text.split()
    line = ""
    for w in words:
        trial = (line + " " + w).strip()
        if c.stringWidth(trial, font, size) <= max_w:
            line = trial
        else:
            c.drawString(x, y, line)
            y -= leading
            line = w
    if line:
        c.drawString(x, y, line)
        y -= leading
    return y


def add_img(c, path: Path, x, y_top, max_w, max_h):
    im = Image.open(path)
    w, h = im.size
    scale = min(max_w / w, max_h / h)
    dw, dh = w * scale, h * scale
    c.drawImage(
        ImageReader(path),
        x,
        y_top - dh,
        width=dw,
        height=dh,
        preserveAspectRatio=True,
        mask="auto",
    )
    return dh


pc = pdfcanvas.Canvas(str(PDF), pagesize=letter)
W, H = letter
margin = 0.55 * inch
content_w = W - 2 * margin


def new_page_header(first: bool = False) -> float:
    y = H - margin
    pc.setFont("Helvetica-Bold", 14 if first else 11)
    pc.setFillColorRGB(0.11, 0.11, 0.10)
    pc.drawString(margin, y, "Inyo — Before & After Edits")
    y -= 14
    if first:
        y = draw_wrapped(
            pc,
            "original/ → exact/  ·  left = before, right = after",
            margin,
            y,
            content_w,
            size=8,
            leading=10,
            color=(0.4, 0.4, 0.4),
        )
        y -= 4
    else:
        y -= 4
    return y


y = new_page_header(first=True)

for i, e in enumerate(EDITS):
    path = OUT / e["image"]
    # Estimate block height
    block = 28 + e["max_h"] + 10
    if y - block < margin:
        pc.showPage()
        y = new_page_header(first=False)

    pc.setFont("Helvetica-Bold", 10)
    pc.setFillColorRGB(0.11, 0.11, 0.10)
    pc.drawString(margin, y, f"{e['num']}  {e['title']}")
    y -= 12
    y = draw_wrapped(
        pc,
        e["blurb"],
        margin,
        y,
        content_w,
        size=8,
        leading=10,
        color=(0.35, 0.35, 0.35),
    )
    y -= 3
    if path.exists():
        used = add_img(pc, path, margin, y, content_w, e["max_h"])
        y -= used + 12
    else:
        y -= 8

pc.save()
print(f"wrote {PDF} ({PDF.stat().st_size / 1024:.0f} KB)")

# ---- Canvas embeds ----
SHOTS = [
    ("favicon", "compare-favicon-assets.png", 860),
    ("chatHeader", "compare-chat-header.png", 900),
    ("chatFull", "compare-chat-full.png", 1000),
    ("logoZoom", "compare-logo-fade-zoom.png", 780),
    ("slideLock", "compare-slide-lock.png", 1000),
    ("webLogic", "compare-web-logic.png", 1000),
    ("privacyTitle", "compare-privacy-title.png", 900),
    ("hero", "compare-hero.png", 1000),
]

uris: dict[str, str] = {}
for key, fname, max_w in SHOTS:
    im = Image.open(OUT / fname).convert("RGB")
    w, h = im.size
    if w > max_w:
        im = im.resize((max_w, int(h * max_w / w)), Image.Resampling.LANCZOS)
    path = EMBED / f"{key}.jpg"
    q = 68
    im.save(path, "JPEG", quality=q, optimize=True)
    while path.stat().st_size > 150_000 and q > 38:
        q -= 6
        im.save(path, "JPEG", quality=q, optimize=True)
    uris[key] = "data:image/jpeg;base64," + base64.b64encode(path.read_bytes()).decode()
    print(f"embed {key}: {path.stat().st_size / 1024:.1f}KB")


def lit(k: str) -> str:
    return json.dumps(uris[k])


title_jsx = '{"{{Title}}"}'

canvas = f"""import {{
  Divider,
  H1,
  H2,
  H3,
  Pill,
  Row,
  Spacer,
  Stack,
  Stat,
  Text,
  useHostTheme,
}} from "cursor/canvas";

const SHOTS = {{
  favicon: {lit("favicon")},
  chatHeader: {lit("chatHeader")},
  chatFull: {lit("chatFull")},
  logoZoom: {lit("logoZoom")},
  slideLock: {lit("slideLock")},
  webLogic: {lit("webLogic")},
  privacyTitle: {lit("privacyTitle")},
  hero: {lit("hero")},
}} as const;

function Shot({{ src, alt }}: {{ src: string; alt: string }}) {{
  const t = useHostTheme();
  return (
    <div
      style={{{{
        width: "100%",
        overflow: "hidden",
        borderRadius: 6,
        border: `1px solid ${{t.stroke.tertiary}}`,
      }}}}
    >
      <img
        src={{src}}
        alt={{alt}}
        style={{{{ display: "block", width: "100%", height: "auto" }}}}
      />
    </div>
  );
}}

export default function BeforeAfterEdits() {{
  return (
    <Stack gap={{20}}>
      <Stack gap={{6}}>
        <H1>Inyo — all before / after edits</H1>
        <Text tone="secondary">
          Frozen original/ → edited exact/. PDF: comparisons/Inyo-Before-After-Edits.pdf
        </Text>
      </Stack>

      <Row gap={{12}} wrap>
        <Stat value="5" label="Visual edits" />
        <Stat value="original/" label="Before" />
        <Stat value="exact/" label="After" />
      </Row>

      <Divider />

      <Stack gap={{8}}>
        <Row gap={{8}} align="center">
          <Pill size="sm">01</Pill>
          <H2>Favicon rebuilt</H2>
        </Row>
        <Text tone="secondary">
          Before: black wave + “inyo” text. After: wave on yellow circle #f5ff66.
        </Text>
        <Shot src={{SHOTS.favicon}} alt="Favicon before and after" />
      </Stack>

      <Divider />

      <Stack gap={{8}}>
        <Row gap={{8}} align="center">
          <Pill size="sm">02</Pill>
          <H2>Chat simulation PFPs</H2>
        </Row>
        <Text tone="secondary">
          Before: missing/broken avatars. After: yellow-circle logo avatar.
        </Text>
        <H3>Header crop</H3>
        <Shot src={{SHOTS.chatHeader}} alt="Chat header before and after" />
        <H3>Full section</H3>
        <Shot src={{SHOTS.chatFull}} alt="Chat section before and after" />
      </Stack>

      <Divider />

      <Stack gap={{8}}>
        <Row gap={{8}} align="center">
          <Pill size="sm">03</Pill>
          <H2>Logo fades on slide lock</H2>
        </Row>
        <Text tone="secondary">
          Before: always opaque. After: full opacity while scrolling between
          slides; fades to 0% when a slide locks; stays visible on the home
          slide.
        </Text>
        <H3>Logo zoom</H3>
        <Shot src={{SHOTS.logoZoom}} alt="Logo fade zoom" />
        <H3>Locked slide viewport</H3>
        <Shot src={{SHOTS.slideLock}} alt="Slide lock before and after" />
      </Stack>

      <Divider />

      <Stack gap={{8}}>
        <Row gap={{8}} align="center">
          <Pill size="sm">04</Pill>
          <H2>Web Logic scroll-lock</H2>
        </Row>
        <Text tone="secondary">
          Before: free-scroll section. After: sticky pin (180vh), bottom nav
          hides while locked, cream edge blend kept.
        </Text>
        <Shot src={{SHOTS.webLogic}} alt="Web Logic before and after" />
      </Stack>

      <Divider />

      <Stack gap={{8}}>
        <Row gap={{8}} align="center">
          <Pill size="sm">05</Pill>
          <H2>Legal page titles</H2>
        </Row>
        <Text tone="secondary">
          Before: {title_jsx}. After: Privacy Policy / Terms & Conditions — inyo.
        </Text>
        <Shot src={{SHOTS.privacyTitle}} alt="Privacy title before and after" />
      </Stack>

      <Divider />

      <Stack gap={{8}}>
        <H2>Hero (context)</H2>
        <Text tone="secondary">
          First viewport largely unchanged; logo stays visible on home.
        </Text>
        <Shot src={{SHOTS.hero}} alt="Hero before and after" />
      </Stack>

      <Spacer />
      <Text tone="tertiary" size="small">
        PDF also at comparisons/Inyo-Before-After-Edits.pdf
      </Text>
    </Stack>
  );
}}
"""

CANVAS.write_text(canvas)
print(f"wrote canvas ({len(canvas):,} chars)")
