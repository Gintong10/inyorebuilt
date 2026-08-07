import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "shots");
const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

fs.mkdirSync(OUT, { recursive: true });

const VIEW = { width: 1280, height: 800, deviceScaleFactor: 2 };

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, type: "png" });
  console.log("wrote", file);
  return file;
}

async function waitReady(page) {
  await page.waitForFunction(
    () =>
      document.querySelector("h1") &&
      document.body.scrollHeight > 2000 &&
      [...document.images].filter((i) => i.complete).length >= 3,
    { timeout: 30000 },
  );
  await new Promise((r) => setTimeout(r, 1200));
}

async function scrollToText(page, text) {
  await page.evaluate((t) => {
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walk.nextNode())) {
      if (n.textContent && n.textContent.includes(t)) {
        const el = n.parentElement;
        if (el) {
          el.scrollIntoView({ block: "center" });
          return;
        }
      }
    }
    // fallback: chat-ish mid page
    window.scrollTo(0, Math.min(document.body.scrollHeight * 0.28, 3200));
  }, text);
  await new Promise((r) => setTimeout(r, 700));
}

async function captureSite(browser, base, label) {
  const page = await browser.newPage();
  await page.setViewport(VIEW);
  await page.goto(base, { waitUntil: "networkidle2", timeout: 60000 });
  await waitReady(page);

  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 400));
  await shot(page, `${label}-01-hero`);

  // Mid-page where logo often overlays copy
  await page.evaluate(() => window.scrollTo(0, 900));
  await new Promise((r) => setTimeout(r, 600));
  await shot(page, `${label}-02-logo-over-content`);

  await scrollToText(page, "Inyo learns the real you");
  await shot(page, `${label}-03-chat-learns`);

  await scrollToText(page, "You decide who gets introduced");
  await shot(page, `${label}-04-chat-intro`);

  // Legal privacy page
  const privacyUrl =
    label === "before"
      ? `${base.replace(/\/$/, "")}/legal/privacy-policy/`
      : `${base.replace(/\/$/, "")}/legal/privacy-policy/`;
  await page.goto(privacyUrl, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 800));
  const title = await page.title();
  fs.writeFileSync(
    path.join(OUT, `${label}-privacy-title.txt`),
    title,
    "utf8",
  );
  await shot(page, `${label}-05-privacy`);

  await page.close();
  return title;
}

function sideBySide(before, after, out, caption) {
  // Use macOS `sips` + ImageMagick if available; else python Pillow; else ffmpeg
  const tmp = path.join(OUT, "_tmp");
  fs.mkdirSync(tmp, { recursive: true });

  // Prefer ImageMagick convert/magick
  const hasMagick =
    tryWhich("magick") || tryWhich("convert") || tryWhich("ffmpeg");

  if (tryWhich("magick")) {
    execFileSync("magick", [
      before,
      after,
      "+append",
      "-background",
      "#f4f1ea",
      out,
    ]);
    return;
  }
  if (tryWhich("convert")) {
    execFileSync("convert", [before, after, "+append", out]);
    return;
  }

  // Python Pillow composite
  const py = `
from PIL import Image, ImageDraw, ImageFont
import sys
b,a,out,cap = sys.argv[1:5]
imb = Image.open(b).convert('RGBA')
ima = Image.open(a).convert('RGBA')
h = max(imb.height, ima.height)
w = imb.width + ima.width + 24
# header band
band = 72
canvas = Image.new('RGBA', (w, h + band), (244, 241, 234, 255))
draw = ImageDraw.Draw(canvas)
try:
    font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 28)
    font_sm = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 20)
except Exception:
    font = ImageFont.load_default()
    font_sm = font
draw.text((24, 18), 'BEFORE (original)', fill=(40,40,40), font=font_sm)
draw.text((imb.width + 48, 18), 'AFTER (changed)', fill=(40,40,40), font=font_sm)
if cap:
    draw.text((24, 42), cap, fill=(90,90,90), font=font_sm)
canvas.paste(imb, (0, band))
canvas.paste(ima, (imb.width + 24, band))
# divider
draw.rectangle([imb.width + 10, band, imb.width + 14, h + band], fill=(200,196,188,255))
canvas.convert('RGB').save(out, 'PNG')
print('composed', out)
`;
  const script = path.join(tmp, "compose.py");
  fs.writeFileSync(script, py);
  execFileSync("python3", [script, before, after, out, caption || ""]);
}

function tryWhich(bin) {
  try {
    execFileSync("which", [bin], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-web-security"],
});

try {
  const beforeTitle = await captureSite(
    browser,
    "http://127.0.0.1:5175",
    "before",
  );
  const afterTitle = await captureSite(
    browser,
    "http://127.0.0.1:5173",
    "after",
  );
  console.log("privacy titles:", { beforeTitle, afterTitle });

  // Favicon asset compare (static)
  const favBefore = path.join(
    __dirname,
    "..",
    "original/assets/images/B2tRsfEtD1H3a7ArhHVWR2t6XCk.png",
  );
  const favAfter = path.join(
    __dirname,
    "..",
    "exact/assets/images/favicon-180.png",
  );
  const avAfter = path.join(
    __dirname,
    "..",
    "exact/assets/images/inyo-avatar.png",
  );
  fs.copyFileSync(favBefore, path.join(OUT, "favicon-before.png"));
  fs.copyFileSync(favAfter, path.join(OUT, "favicon-after.png"));
  fs.copyFileSync(avAfter, path.join(OUT, "avatar-after.png"));

  // Find original broken/missing avatar reference if any in original assets
  // Compose side-by-sides
  const pairs = [
    ["01-hero", "Hero / first viewport"],
    ["02-logo-over-content", "Logo over page content (fade behavior)"],
    ["03-chat-learns", "Chat simulation — learns the real you"],
    ["04-chat-intro", "Chat simulation — intro consent"],
    ["05-privacy", "Privacy policy page"],
  ];

  for (const [key, cap] of pairs) {
    const b = path.join(OUT, `before-${key}.png`);
    const a = path.join(OUT, `after-${key}.png`);
    if (fs.existsSync(b) && fs.existsSync(a)) {
      sideBySide(b, a, path.join(OUT, `compare-${key}.png`), cap);
    }
  }

  // Favicon side-by-side on a board
  const favPy = `
from PIL import Image, ImageDraw, ImageFont
b = Image.open(${JSON.stringify(path.join(OUT, "favicon-before.png"))}).convert('RGBA')
a = Image.open(${JSON.stringify(path.join(OUT, "favicon-after.png"))}).convert('RGBA')
av = Image.open(${JSON.stringify(path.join(OUT, "avatar-after.png"))}).convert('RGBA')
size = 220
b = b.resize((size, size), Image.Resampling.LANCZOS)
a = a.resize((size, size), Image.Resampling.LANCZOS)
av = av.resize((size, size), Image.Resampling.LANCZOS)
pad, gap, band = 40, 48, 90
w = pad*2 + size*3 + gap*2
h = band + size + pad
canvas = Image.new('RGB', (w, h), (244, 241, 234))
d = ImageDraw.Draw(canvas)
try:
    f = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 18)
except Exception:
    f = ImageFont.load_default()
labels = ['BEFORE favicon', 'AFTER favicon', 'AFTER chat avatar']
imgs = [b,a,av]
x = pad
for lab, im in zip(labels, imgs):
    d.text((x, 28), lab, fill=(40,40,40), font=f)
    # circle crop board
    canvas.paste(im, (x, band), im if im.mode=='RGBA' else None)
    x += size + gap
canvas.save(${JSON.stringify(path.join(OUT, "compare-favicon-assets.png"))})
print('favicon board ok')
`;
  fs.writeFileSync(path.join(OUT, "_fav.py"), favPy);
  execFileSync("python3", [path.join(OUT, "_fav.py")]);
} finally {
  await browser.close();
}

console.log("done");
