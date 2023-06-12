import { spawn } from "child_process";
import { basename, extname, dirname } from "path";
import { getDuration } from "./getDuration.mjs";
import { getFfmpegOptions } from "./getFfmpegOptions.mjs";
import { udpateProgress } from "./updateProgress.mjs";

// const ffmpeg = process.env.FFMPEG;

/**
 * JLSEを実行中のサブプロセスを取得する
 * @param {string} input - 入力ファイルのパス
 * @returns JLSEのサブプロセス
 */
const getJlseProcess = (input) => {
  const output = process.env.OUTPUT;
  const jlse_args = [
    "-i",
    input,
    "-e",
    "-o",
    getFfmpegOptions().reduce((prev, curr) => prev + " " + curr),
    "-r",
    "-d",
    dirname(output),
    "-n",
    basename(output, extname(output)),
  ];
  console.error(`jlse args: ${jlse_args}`);

  const env = Object.create(process.env);
  env.HOME = "/root";
  console.error(`env: ${JSON.stringify(env)}`);
  return spawn("jlse", jlse_args, { env: env });
};

//メインの処理 ここから
(async () => {
  const input = process.env.INPUT;
  // 進捗計算のために動画の長さを取得
  const duration = await getDuration(input);

  //必要な変数
  let progress = {
    total_num: 0,
    now_num: 0,
    avisynth_flag: false,
    percent: 0,
    log_updated: false,
    log: "",
  };
  const child = getJlseProcess(input);
  /**
   * エンコード進捗表示用に標準出力に進捗情報を吐き出す
   * 出力する JSON
   * {"type":"progress","percent": 0.8, "log": "view log" }
   */
  child.stderr.on("data", (data) => {
    const lines = String(data).split("\n");
    console.error(`エンコード開始！: ${lines}`);

    for (const str of lines) {
      progress = udpateProgress(str, progress);
      progress.percent = progress.now_num / progress.total_num;
      if (progress.log_updated)
        console.log(
          JSON.stringify({
            type: "progress",
            percent: progress.percent,
            log: progress.log,
          })
        );
      progress.log_updated = false;
    }
  });

  child.on("error", (err) => {
    console.error(err);
    throw new Error(err);
  });

  process.on("SIGINT", () => {
    child.kill("SIGINT");
  });

  child.on("close", (code) => {
    //終了後にしたい処理があれば書く
  });
})();
//メインの処理 ここまで
