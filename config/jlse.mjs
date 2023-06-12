import { spawn } from "child_process";
import { basename, extname, dirname } from "path";
import { getDuration } from "./getDuration.mjs";
import { getFfmpegOptions } from "./getFfmpegOptions.mjs";

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

/**
 * 取得したログから状態を更新する
 * @param {string} str 
 * @param {Object} state 
 * @returns state
 */
const updateToFfmpeg = (str, state) => {
  //FFmpeg
  // frame= 2847 fps=0.0 q=-1.0 Lsize=  216432kB time=00:01:35.64 bitrate=18537.1kbits/s speed= 222x
  const progress = {};
  let tmp = (str + " ").match(/[A-z]*=[A-z,0-9,\s,.,\/,:,-]* /g);
  if (tmp === null) continue;
  for (let j = 0; j < tmp.length; j++) {
    progress[tmp[j].split("=")[0]] = tmp[j]
      .split("=")[1]
      .replace(/\r/g, "")
      .trim();
  }
  progress["frame"] = parseInt(progress["frame"]);
  progress["fps"] = parseFloat(progress["fps"]);
  progress["q"] = parseFloat(progress["q"]);

  let current = 0;
  const times = progress.time.split(":");
  for (let i = 0; i < times.length; i++) {
    if (i == 0) {
      current += parseFloat(times[i]) * 3600;
    } else if (i == 1) {
      current += parseFloat(times[i]) * 60;
    } else if (i == 2) {
      current += parseFloat(times[i]);
    }
  }

  // 進捗率 1.0 で 100%
  state.now_num = current;
  state.total_num = duration;
  state.log =
    "(4/4) FFmpeg: " +
    //'frame= ' +
    //progress.frame +
    //' fps=' +
    //progress.fps +
    //' size=' +
    //progress.size +
    " time=" +
    progress.time +
    //' bitrate=' +
    //progress.bitrate +
    " speed=" +
    progress.speed;
  state.update_log_flag = true;
  return state;
};

const udpateProgress = (str, progress) => {
  if (str.startsWith("AviSynth") && str) {
    //AviSynth+
    const raw_avisynth_data = str.replace(/AviSynth\s/, "");
    if (raw_avisynth_data.startsWith("Creating")) {
      const avisynth_reg = /Creating\slwi\sindex\sfile\s(\d+)%/;
      progress.total_num = 200;
      progress.now_num = Number(raw_avisynth_data.match(avisynth_reg)[1]);
      progress.now_num += progress.avisynth_flag ? 100 : 0;
      progress.avisynth_flag = progress.avisynth_flag
        ? true
        : progress.now_num == 100
        ? true
        : false;
    }
    progress.update_log_flag = true;
    progress.log = `(1/4) AviSynth:Creating lwi index files`;
    return progress;
  }

  if (str.startsWith("chapter_exe") && str) {
    //chapter_exe
    const raw_chapter_exe_data = str.replace(/chapter_exe\s/, "");
    switch (raw_chapter_exe_data) {
      case raw_chapter_exe_data.startsWith("\tVideo Frames") &&
        raw_chapter_exe_data: {
        //chapter_exeでの総フレーム数取得
        const movie_frame_reg = /\tVideo\sFrames:\s(\d+)\s\[\d+\.\d+fps\]/;
        progress.total_num = Number(
          raw_chapter_exe_data.match(movie_frame_reg)[1]
        );
        progress.update_log_flag = true;
        break;
      }
      case raw_chapter_exe_data.startsWith("mute") && raw_chapter_exe_data: {
        //現在のフレーム数取得
        const chapter_reg = /mute\s?\d+:\s(\d+)\s\-\s\d+フレーム/;
        progress.now_num = Number(raw_chapter_exe_data.match(chapter_reg)[1]);
        progress.update_log_flag = true;
        break;
      }
      case raw_chapter_exe_data.startsWith("end") && raw_chapter_exe_data: {
        //chapter_exeの終了検知
        progress.now_num = total_num;
        progress.update_log_flag = true;
        break;
      }
      default: {
        break;
      }
    }
    progress.log = `(2/4) Chapter_exe: ${now_num}/${total_num}`;
    return progress;
  }

  if (str.startsWith("logoframe") && str) {
    //logoframe
    const raw_logoframe_data = str.replace(/logoframe\s/, "");
    switch (raw_logoframe_data) {
      case raw_logoframe_data.startsWith("checking") && raw_logoframe_data: {
        const logoframe_reg = /checking\s*(\d+)\/(\d+)\sended./;
        const logoframe = raw_logoframe_data.match(logoframe_reg);
        progress.now_num = Number(logoframe[1]);
        progress.total_num = Number(logoframe[2]);
        progress.update_log_flag = true;
      }
      default: {
        break;
      }
    }
    progress.log = `(3/4) logoframe: ${progress.now_num}/${progress.total_num}`;
    return progress;
  }

  if (str.startsWith("frame") && str) {
    return updateToFfmpeg(str, progress);
  }
  //進捗表示に必要ない出力データを流す
  console.log(str);
  return progress;
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
    update_log_flag: false,
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
      if (progress.update_log_flag)
        console.log(
          JSON.stringify({
            type: "progress",
            percent: progress.percent,
            log: progress.log,
          })
        );
      progress.update_log_flag = false;
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
