import { LokaliseDownload } from "./dist/index.js";

try {
  const downloader = new LokaliseDownload({})
} catch (e) {
  console.error(e);
}

console.log(downloader);