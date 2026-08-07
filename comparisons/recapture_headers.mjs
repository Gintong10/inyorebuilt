/**
 * Recapture chat phone headers (with visible PFP) and slide-lock logo state.
 */
import puppeteer from "puppeteer-core";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "shots");
const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
fs.mkdirSync(OUT, { recursive: true });

const VIEW = { width: 1280, height: 800, deviceScaleFactor: 2 };

async function waitReady(page) {
  await page.waitForFunction(
    () => document.querySelector("h1") && document.body.scrollHeight > 2000,
    { timeout: 45000 },
  );
  await new Promise((r) => setTimeout(r, 1500));
}

async function captureSlideLock(page, label) {
  // Problem slide lock where logo opacity hits 0 on after
  await page.evaluate(() => window.scrollTo(0, 1200));
  await new Promise((r) => setTimeout(r, 800));

  // Wait until logo class/opacity settles on after (before never locks)
  for (let i = 0; i < 20; i++) {
    const info = await page.evaluate(() => {
      const logo = document.querySelector(
        '[data-framer-name="Fixed Logo"], .framer-vop471',
      );
      const link =
        logo?.querySelector('[data-framer-name="Logo"]') ||
        logo?.querySelector("a");
      return {
        locked: !!logo?.classList?.contains("inyo-logo-slide-locked"),
        opacity: link ? getComputedStyle(link).opacity : null,
        classes: logo?.className,
      };
    });
    console.log(label, "slide-lock try", i, info);
    if (label === "before" || info.locked) break;
    await page.evaluate(() => window.scrollBy(0, 40));
    await new Promise((r) => setTimeout(r, 200));
  }

  await page.screenshot({
    path: path.join(OUT, `${label}-02-slide-lock.png`),
    type: "png",
  });

  const zoom = await page.evaluate(() => {
    const logo = document.querySelector(
      '[data-framer-name="Fixed Logo"], .framer-vop471',
    );
    if (!logo) {
      return { x: window.innerWidth / 2 - 200, y: 0, width: 400, height: 220 };
    }
    const r = logo.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    return {
      x: Math.max(0, cx - 200),
      y: Math.max(0, Math.min(r.top - 10, 40)),
      width: 400,
      height: 220,
    };
  });
  await page.screenshot({
    path: path.join(OUT, `${label}-logo-zoom.png`),
    type: "png",
    clip: zoom,
  });
  console.log(label, "logo zoom", zoom);
}

async function captureChatHeader(page, label) {
  // Drive scroll until Phone is visible and avatar has non-zero size/opacity
  let phoneBox = null;
  for (let y = 2000; y <= 4200; y += 150) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await new Promise((r) => setTimeout(r, 280));
    const info = await page.evaluate(() => {
      const phone =
        document.querySelector('[data-framer-name="Phone"]') ||
        document.querySelector(".framer-10hrei6");
      const avatar =
        document.querySelector(
          '[data-framer-name="Phone"] [data-framer-name="Inyo Avatar"]',
        ) || document.querySelector(".framer-599mvd");
      const header =
        document.querySelector(
          '[data-framer-name="Phone"] [data-framer-name="Chat Header"]',
        ) || document.querySelector(".framer-1mtxokr");
      if (!phone) return null;
      const pr = phone.getBoundingClientRect();
      const ar = avatar?.getBoundingClientRect();
      const hr = header?.getBoundingClientRect();
      const aOpacity = avatar ? getComputedStyle(avatar).opacity : "0";
      const pOpacity = getComputedStyle(phone).opacity;
      return {
        phone: {
          x: pr.left,
          y: pr.top,
          w: pr.width,
          h: pr.height,
          opacity: pOpacity,
        },
        avatar: ar
          ? { x: ar.left, y: ar.top, w: ar.width, h: ar.height, opacity: aOpacity }
          : null,
        header: hr
          ? { x: hr.left, y: hr.top, w: hr.width, h: hr.height }
          : null,
        scrollY: window.scrollY,
      };
    });
    if (!info) continue;
    const visible =
      info.phone.w > 200 &&
      info.phone.h > 300 &&
      info.phone.y > 40 &&
      info.phone.y < 500 &&
      parseFloat(info.phone.opacity) > 0.5 &&
      info.avatar &&
      info.avatar.w > 10 &&
      parseFloat(info.avatar.opacity) > 0.3;
    if (visible) {
      phoneBox = info;
      console.log(label, "phone visible at", y, info);
      break;
    }
  }

  if (!phoneBox) {
    console.log(label, "phone never became visible — last-ditch scroll");
    await page.evaluate(() => {
      document
        .querySelector('[data-framer-name="Phone"]')
        ?.scrollIntoView({ block: "center" });
    });
    await new Promise((r) => setTimeout(r, 1000));
    phoneBox = await page.evaluate(() => {
      const phone = document.querySelector('[data-framer-name="Phone"]');
      const avatar = document.querySelector(
        '[data-framer-name="Phone"] [data-framer-name="Inyo Avatar"]',
      );
      const header = document.querySelector(
        '[data-framer-name="Phone"] [data-framer-name="Chat Header"]',
      );
      const pr = phone.getBoundingClientRect();
      const ar = avatar?.getBoundingClientRect();
      const hr = header?.getBoundingClientRect();
      return {
        phone: { x: pr.left, y: pr.top, w: pr.width, h: pr.height },
        avatar: ar
          ? { x: ar.left, y: ar.top, w: ar.width, h: ar.height }
          : null,
        header: hr
          ? { x: hr.left, y: hr.top, w: hr.width, h: hr.height }
          : null,
      };
    });
  }

  // Clip: phone top including header row (avatar top-left)
  const clip = {
    x: Math.max(0, phoneBox.phone.x),
    y: Math.max(0, phoneBox.phone.y),
    width: Math.min(phoneBox.phone.w, 1280 - phoneBox.phone.x),
    height: Math.min(160, phoneBox.phone.h),
  };
  await page.screenshot({
    path: path.join(OUT, `${label}-chat-phone-top.png`),
    type: "png",
    clip,
  });
  console.log(label, "phone-top clip", clip);

  // Tighter header-only if available
  if (phoneBox.header && phoneBox.header.w > 40) {
    const hclip = {
      x: Math.max(0, phoneBox.header.x - 8),
      y: Math.max(0, phoneBox.header.y - 4),
      width: phoneBox.header.w + 16,
      height: Math.max(phoneBox.header.h + 8, 44),
    };
    await page.screenshot({
      path: path.join(OUT, `${label}-chat-header.png`),
      type: "png",
      clip: hclip,
    });
    console.log(label, "header clip", hclip);
  }
}

async function run(base, label) {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport(VIEW);
    await page.goto(base, { waitUntil: "networkidle2", timeout: 60000 });
    await waitReady(page);
    await captureSlideLock(page, label);
    await captureChatHeader(page, label);
  } finally {
    await browser.close();
  }
}

await run("http://127.0.0.1:5175", "before");
await run("http://127.0.0.1:5173", "after");

execFileSync(
  "python3",
  [
    "-c",
    `
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
OUT = Path(${JSON.stringify(OUT)})
try:
    F = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 16)
except Exception:
    F = ImageFont.load_default()

def side(b, a, dest, bl, al, cap=''):
    imb = Image.open(b).convert('RGBA')
    ima = Image.open(a).convert('RGBA')
    # match widths for phone tops
    tw = max(imb.width, ima.width)
    def fit(im):
        if im.width == tw: return im
        nh = int(im.height * tw / im.width)
        return im.resize((tw, nh), Image.Resampling.LANCZOS)
    imb, ima = fit(imb), fit(ima)
    h = max(imb.height, ima.height)
    def pad(im):
        if im.height == h: return im
        c = Image.new('RGBA', (im.width, h), (244,241,234,255))
        c.paste(im, (0,0))
        return c
    imb, ima = pad(imb), pad(ima)
    band = 56
    w = imb.width + ima.width + 24
    canvas = Image.new('RGBA', (w, h+band), (244,241,234,255))
    d = ImageDraw.Draw(canvas)
    d.text((16,12), bl, fill=(40,40,40), font=F)
    d.text((imb.width+40,12), al, fill=(40,40,40), font=F)
    if cap: d.text((16,34), cap, fill=(100,100,100), font=F)
    canvas.paste(imb, (0, band))
    canvas.paste(ima, (imb.width+24, band))
    d.rectangle([imb.width+10, band, imb.width+14, h+band], fill=(200,196,188,255))
    canvas.convert('RGB').save(dest)
    print('wrote', dest.name, canvas.size)

side(OUT/'before-chat-phone-top.png', OUT/'after-chat-phone-top.png',
     OUT/'compare-chat-header.png',
     'BEFORE — missing / broken PFP',
     'AFTER — yellow-circle PFP (top-left)',
     'Phone chat header')

side(OUT/'before-logo-zoom.png', OUT/'after-logo-zoom.png',
     OUT/'compare-logo-fade-zoom.png',
     'BEFORE — logo opaque',
     'AFTER — logo hidden on slide lock (0%)',
     'Header logo')

side(OUT/'before-02-slide-lock.png', OUT/'after-02-slide-lock.png',
     OUT/'compare-slide-lock.png',
     'BEFORE — logo stays opaque',
     'AFTER — logo fades when slide locks',
     'Slide-locked section')
`,
  ],
  { stdio: "inherit" },
);

console.log("recapture done");
