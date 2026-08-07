import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
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

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), type: "png" });
  console.log("shot", name);
}

async function scrollToText(page, text) {
  await page.evaluate((t) => {
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walk.nextNode())) {
      if (n.textContent?.includes(t)) {
        n.parentElement?.scrollIntoView({ block: "center" });
        return true;
      }
    }
    return false;
  }, text);
  await new Promise((r) => setTimeout(r, 900));
}

async function captureSite(browser, base, label) {
  const page = await browser.newPage();
  await page.setViewport(VIEW);
  await page.goto(base, { waitUntil: "networkidle2", timeout: 60000 });
  await waitReady(page);

  // 1 Hero / home — logo should be visible on after
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 500));
  await shot(page, `${label}-01-hero`);

  // 2 Mid problem / slide-locked region (logo fade on after)
  await page.evaluate(() => window.scrollTo(0, 1600));
  await new Promise((r) => setTimeout(r, 1000));
  await shot(page, `${label}-02-slide-lock`);

  // 3 Chat PFPs
  await scrollToText(page, "Inyo learns the real you");
  await shot(page, `${label}-03-chat`);

  // 4 Web Logic section
  await scrollToText(page, "A simple chat");
  // nudge so sticky lock engages on after
  await page.evaluate(() => {
    const el =
      document.querySelector('[data-framer-name="Web Logic"]') ||
      document.querySelector(".framer-37tqo7");
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, Math.max(0, top - 8));
    }
  });
  await new Promise((r) => setTimeout(r, 1100));
  await shot(page, `${label}-04-web-logic`);

  // 5 Privacy
  await page.goto(`${base.replace(/\/$/, "")}/legal/privacy-policy/`, {
    waitUntil: "networkidle2",
    timeout: 60000,
  });
  await new Promise((r) => setTimeout(r, 800));
  await shot(page, `${label}-05-privacy`);
  await page.close();
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
});
try {
  await captureSite(browser, "http://127.0.0.1:5175", "before");
  await captureSite(browser, "http://127.0.0.1:5173", "after");
} finally {
  await browser.close();
}

fs.copyFileSync(
  path.join(ROOT, "original/assets/images/B2tRsfEtD1H3a7ArhHVWR2t6XCk.png"),
  path.join(OUT, "favicon-before.png"),
);
fs.copyFileSync(
  path.join(ROOT, "exact/assets/images/favicon-180.png"),
  path.join(OUT, "favicon-after.png"),
);
fs.copyFileSync(
  path.join(ROOT, "exact/assets/images/inyo-avatar.png"),
  path.join(OUT, "avatar-after.png"),
);

execFileSync("python3", [path.join(__dirname, "compose_pdf_canvas.py")], {
  stdio: "inherit",
});
console.log("done");
