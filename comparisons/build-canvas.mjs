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
    { timeout: 30000 },
  );
  await new Promise((r) => setTimeout(r, 1200));
}

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, type: "png" });
  console.log("shot", name);
}

async function captureSite(browser, base, label) {
  const page = await browser.newPage();
  await page.setViewport(VIEW);
  await page.goto(base, { waitUntil: "networkidle2", timeout: 60000 });
  await waitReady(page);

  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 400));
  await shot(page, `${label}-01-hero`);

  await page.evaluate(() => window.scrollTo(0, 1600));
  await new Promise((r) => setTimeout(r, 800));
  await shot(page, `${label}-02-logo-fade`);

  await page.evaluate(() => {
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walk.nextNode())) {
      if (n.textContent?.includes("Inyo learns the real you")) {
        n.parentElement?.scrollIntoView({ block: "center" });
        return;
      }
    }
    window.scrollTo(0, 3200);
  });
  await new Promise((r) => setTimeout(r, 700));
  await shot(page, `${label}-03-chat`);

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

execFileSync("python3", [path.join(__dirname, "compose_and_embed.py")], {
  stdio: "inherit",
});
console.log("done");
