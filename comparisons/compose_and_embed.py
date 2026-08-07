#!/usr/bin/env python3
"""Compose side-by-side PNGs and write before-after-edits.canvas.tsx with inline JPEGs."""

from __future__ import annotations

import base64
import json
import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "shots"
EMBED = ROOT / "canvas-embeds"
CANVAS = Path(
    "/Users/jintong/.cursor/projects/Users-jintong-Projects-inyorebuilt/canvases/before-after-edits.canvas.tsx"
)

OUT.mkdir(parents=True, exist_ok=True)
EMBED.mkdir(parents=True, exist_ok=True)

try:
    FONT_SM = ImageFont.truetype(
        "/System/Library/Fonts/Supplemental/Arial.ttf", 16
    )
except Exception:
    FONT_SM = ImageFont.load_default()


def side(bpath: Path, apath: Path, out: Path, blabel: str, alabel: str, caption: str = "") -> None:
    b = Image.open(bpath).convert("RGBA")
    a = Image.open(apath).convert("RGBA")
    band = 64
    h = max(b.height, a.height)
    w = b.width + a.width + 24
    canvas = Image.new("RGBA", (w, h + band), (244, 241, 234, 255))
    d = ImageDraw.Draw(canvas)
    d.text((20, 12), blabel, fill=(40, 40, 40), font=FONT_SM)
    d.text((b.width + 44, 12), alabel, fill=(40, 40, 40), font=FONT_SM)
    if caption:
        d.text((20, 36), caption, fill=(100, 100, 100), font=FONT_SM)
    canvas.paste(b, (0, band))
    canvas.paste(a, (b.width + 24, band))
    d.rectangle(
        [b.width + 10, band, b.width + 14, h + band], fill=(200, 196, 188, 255)
    )
    canvas.convert("RGB").save(out, "PNG")


def zoom_logo(src: Path, out: Path) -> None:
    im = Image.open(src)
    w, h = im.size
    im.crop((w // 2 - 180, 0, w // 2 + 180, 220)).save(out)


def crop_chat_header(src: Path, out: Path) -> None:
    im = Image.open(src)
    w, h = im.size
    pw = 840
    left = (w - pw) // 2
    top = int(h * 0.22)
    im.crop((left + 40, top, left + pw - 40, top + 160)).save(out)


# Favicon board
size = 200
imgs = []
for name in ("favicon-before.png", "favicon-after.png", "avatar-after.png"):
    im = (
        Image.open(OUT / name)
        .convert("RGBA")
        .resize((size, size), Image.Resampling.LANCZOS)
    )
    imgs.append(im)
pad, gap, band = 36, 40, 70
board = Image.new("RGB", (pad * 2 + size * 3 + gap * 2, band + size + pad), (244, 241, 234))
d = ImageDraw.Draw(board)
for i, lab in enumerate(("BEFORE favicon", "AFTER favicon", "AFTER chat avatar")):
    x = pad + i * (size + gap)
    d.text((x, 22), lab, fill=(40, 40, 40), font=FONT_SM)
    board.paste(imgs[i], (x, band), imgs[i])
board.save(OUT / "compare-favicon-assets.png")

zoom_logo(OUT / "before-02-logo-fade.png", OUT / "before-logo-zoom.png")
zoom_logo(OUT / "after-02-logo-fade.png", OUT / "after-logo-zoom.png")
side(
    OUT / "before-logo-zoom.png",
    OUT / "after-logo-zoom.png",
    OUT / "compare-logo-fade-zoom.png",
    "BEFORE — logo opaque",
    "AFTER — logo faded (~14%)",
)
side(
    OUT / "before-02-logo-fade.png",
    OUT / "after-02-logo-fade.png",
    OUT / "compare-logo-fade-full.png",
    "BEFORE (original)",
    "AFTER (changed)",
    "Logo over content",
)

crop_chat_header(OUT / "before-03-chat.png", OUT / "before-chat-header.png")
crop_chat_header(OUT / "after-03-chat.png", OUT / "after-chat-header.png")
side(
    OUT / "before-chat-header.png",
    OUT / "after-chat-header.png",
    OUT / "compare-chat-header.png",
    "BEFORE — missing PFP",
    "AFTER — yellow-circle avatar",
)
side(
    OUT / "before-03-chat.png",
    OUT / "after-03-chat.png",
    OUT / "compare-chat-full.png",
    "BEFORE (original)",
    "AFTER (changed)",
    "Chat simulation",
)
side(
    OUT / "before-01-hero.png",
    OUT / "after-01-hero.png",
    OUT / "compare-hero.png",
    "BEFORE (original)",
    "AFTER (changed)",
    "Hero viewport",
)

# Privacy title board
W, H = 1100, 240
title = Image.new("RGB", (W, H), (244, 241, 234))
d = ImageDraw.Draw(title)
d.text((30, 18), "BEFORE — document <title>", fill=(80, 80, 80), font=FONT_SM)
d.text((580, 18), "AFTER — document <title>", fill=(80, 80, 80), font=FONT_SM)


def tab(x: int, y: int, w: int, h: int, t: str) -> None:
    d.rounded_rectangle(
        [x, y, x + w, y + h], radius=10, fill=(255, 255, 255), outline=(210, 205, 195)
    )
    d.ellipse([x + 12, y + 14, x + 36, y + 38], fill=(245, 255, 102))
    d.text((x + 46, y + 16), t, fill=(30, 30, 30), font=FONT_SM)


tab(30, 60, 500, 52, "{{Title}} — inyo")
tab(580, 60, 500, 52, "Privacy Policy — inyo")
d.text(
    (30, 150),
    "original/legal/privacy-policy/  ·  same fix for Terms",
    fill=(110, 110, 110),
    font=FONT_SM,
)
d.text((580, 150), "exact/legal/ + site/legal/", fill=(110, 110, 110), font=FONT_SM)
title.save(OUT / "compare-privacy-title.png")

SHOTS = [
    ("favicon", "compare-favicon-assets.png", 860),
    ("chatHeader", "compare-chat-header.png", 900),
    ("chatFull", "compare-chat-full.png", 1000),
    ("logoZoom", "compare-logo-fade-zoom.png", 780),
    ("logoFull", "compare-logo-fade-full.png", 1000),
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
    while path.stat().st_size > 140_000 and q > 38:
        q -= 6
        im.save(path, "JPEG", quality=q, optimize=True)
    b64 = base64.b64encode(path.read_bytes()).decode("ascii")
    uris[key] = "data:image/jpeg;base64," + b64
    print(f"embed {key}: {path.stat().st_size / 1024:.1f}KB")


def lit(key: str) -> str:
    return json.dumps(uris[key])


# Emits TSX: {"{{Title}}"}
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

/** Compressed before/after comparison JPEGs (inline data URIs). */
const SHOTS = {{
  favicon: {lit("favicon")},
  chatHeader: {lit("chatHeader")},
  chatFull: {lit("chatFull")},
  logoZoom: {lit("logoZoom")},
  logoFull: {lit("logoFull")},
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
        <H1>Inyo — before / after shots</H1>
        <Text tone="secondary">
          Side-by-side screenshots from frozen original/ → edited exact/
        </Text>
      </Stack>

      <Row gap={{12}} wrap>
        <Stat value="4" label="Visual edits" />
        <Stat value="original/" label="Before" />
        <Stat value="exact/" label="After" />
      </Row>

      <Divider />

      <Stack gap={{10}}>
        <Row gap={{8}} align="center">
          <Pill size="sm">01</Pill>
          <H2>Favicon rebuilt</H2>
        </Row>
        <Text tone="secondary">
          Black wave + wordmark → wave on yellow circle. Chat avatar uses the
          higher-fidelity header-logo composite.
        </Text>
        <Shot src={{SHOTS.favicon}} alt="Favicon before and after assets" />
      </Stack>

      <Divider />

      <Stack gap={{10}}>
        <Row gap={{8}} align="center">
          <Pill size="sm">02</Pill>
          <H2>Chat simulation PFPs</H2>
        </Row>
        <Text tone="secondary">
          Missing/broken profile pictures replaced with the yellow-circle Inyo
          mark.
        </Text>
        <H3>Chat header crop</H3>
        <Shot src={{SHOTS.chatHeader}} alt="Chat header before and after" />
        <H3>Full chat section</H3>
        <Shot src={{SHOTS.chatFull}} alt="Chat section before and after" />
      </Stack>

      <Divider />

      <Stack gap={{10}}>
        <Row gap={{8}} align="center">
          <Pill size="sm">03</Pill>
          <H2>Logo fades over content</H2>
        </Row>
        <Text tone="secondary">
          Fixed logo stays centered but fades to ~14% opacity when covering
          headlines.
        </Text>
        <H3>Logo zoom</H3>
        <Shot src={{SHOTS.logoZoom}} alt="Logo fade zoom before and after" />
        <H3>Full viewport</H3>
        <Shot src={{SHOTS.logoFull}} alt="Logo fade full before and after" />
      </Stack>

      <Divider />

      <Stack gap={{10}}>
        <Row gap={{8}} align="center">
          <Pill size="sm">04</Pill>
          <H2>Legal page titles</H2>
        </Row>
        <Text tone="secondary">
          Document title placeholder {title_jsx} fixed to Privacy Policy /
          Terms & Conditions.
        </Text>
        <Shot src={{SHOTS.privacyTitle}} alt="Privacy title before and after" />
      </Stack>

      <Divider />

      <Stack gap={{10}}>
        <H2>Hero viewport (context)</H2>
        <Text tone="secondary">
          First screen for orientation — layout largely unchanged.
        </Text>
        <Shot src={{SHOTS.hero}} alt="Hero before and after" />
      </Stack>

      <Spacer />
      <Text tone="tertiary" size="small">
        Source PNGs in comparisons/shots/ · gallery also at npm run compare
      </Text>
    </Stack>
  );
}}
"""

CANVAS.write_text(canvas)
print(f"wrote {CANVAS} ({len(canvas):,} chars)")
