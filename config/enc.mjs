import { spawn } from "child_process";
import { getFfmpegOptions } from "./getFfmpegOptions.mjs";

const ffmpeg = process.env.FFMPEG;
const args = ["-y", "-i", process.env.INPUT].concat(getFfmpegOptions());
args.push(process.env.OUTPUT);

// ここから処理開始
const child = spawn(ffmpeg, args);

child.stderr.on("data", (data) => {
  console.error(String(data));
});

child.on("error", (err) => {
  console.error(err);
  throw new Error(err);
});

process.on("SIGINT", () => {
  child.kill("SIGINT");
});
