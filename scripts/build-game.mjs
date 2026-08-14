import fs from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const sourceDir = path.join(root, "src");

const bundle = await build({
  entryPoints: [path.join(sourceDir, "game.js")],
  bundle: true,
  write: false,
  format: "iife",
  target: "es2022",
  minify: true,
  legalComments: "none",
  logLevel: "warning",
});

let browserJavaScript = bundle.outputFiles[0].text;
browserJavaScript = browserJavaScript.replace(/<\/script/gi, "<\\/script");

const htmlTemplate = await fs.readFile(path.join(sourceDir, "index.html"), "utf8");
if (!htmlTemplate.includes("/*__GAME_BUNDLE__*/")) {
  throw new Error("index.html에 게임 번들 위치가 없습니다.");
}
const html = htmlTemplate.replace("/*__GAME_BUNDLE__*/", browserJavaScript);

const workerTemplate = await fs.readFile(path.join(sourceDir, "worker.template.js"), "utf8");
if (!workerTemplate.includes("__APP_HTML_JSON__")) {
  throw new Error("worker.template.js에 HTML 위치가 없습니다.");
}
const worker = workerTemplate.replace("__APP_HTML_JSON__", JSON.stringify(html));

await fs.writeFile(path.join(root, "worker.js"), worker, "utf8");
console.log(`게임 빌드 완료: HTML ${html.length.toLocaleString()}자 / Worker ${worker.length.toLocaleString()}자`);
