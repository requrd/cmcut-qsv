/**
 * 取得したログから状態を更新する
 * @param {string} line -  e.g." frame= 2847 fps=0.0 q=-1.0 Lsize=  216432kB time=00:01:35.64 bitrate=18537.1kbits/s speed= 222x"
 * @param {Object} progress
 * @returns progress - 更新済みのprogress
 */
const updateToFfmpeg = (line, progress) => {
  const encoding = {};
  const fields = (line + " ").match(/[A-z]*=[A-z,0-9,\s,.,\/,:,-]* /g);
  for (const field of fields) {
    encoding[field.split("=")[0]] = field
      .split("=")[1]
      .replace(/\r/g, "")
      .trim();
  }
  encoding["frame"] = parseInt(encoding["frame"]);
  encoding["fps"] = parseFloat(encoding["fps"]);
  encoding["q"] = parseFloat(encoding["q"]);

  // 進捗率 1.0 で 100%
  progress.now_num = encoding.time
    .split(":")
    .reduce((prev, curr, i) => prev + parseFloat(curr) * 60 ** (2 - i), 0);
  progress.total_num = progress.duration;
  progress.log = `(${progress.step}/${progress.steps}) FFmpeg: time=${encoding.time} speed=${encoding.speed}`;
  progress.log_updated = true;
  return progress;
};

const udpateToAviSynth = (line, progress) => {
  const raw_avisynth_data = line.replace(/AviSynth\s/, "");
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
  progress.log_updated = true;
  progress.log = `(${progress.step}/${progress.steps}) AviSynth:Creating lwi index files`;
  return progress;
};

const updateToLogoFrame = (line, progress) => {
  const raw_logoframe_data = line.replace(/logoframe\s/, "");
  if (raw_logoframe_data.startsWith("checking") && raw_logoframe_data) {
    const logoframe_reg = /checking\s*(\d+)\/(\d+)\sended./;
    const logoframe = raw_logoframe_data.match(logoframe_reg);
    progress.now_num = Number(logoframe[1]);
    progress.total_num = Number(logoframe[2]);
    progress.log_updated = true;
  }
  progress.log = `(${progress.step}/${progress.steps}) logoframe: ${progress.now_num}/${progress.total_num}`;
  return progress;
};

const updateToChapter = (line, progress) => {
  const raw_chapter_exe_data = line.replace(/chapter_exe\s/, "");
  if (raw_chapter_exe_data.startsWith("\tVideo Frames")) {
    progress.total_num = Number(
      raw_chapter_exe_data.match(/\tVideo\sFrames:\s(\d+)\s\[\d+\.\d+fps\]/)[1]
    );
    progress.log_updated = true;
  }
  if (raw_chapter_exe_data.startsWith("mute")) {
    progress.now_num = Number(
      raw_chapter_exe_data.match(/mute\s?\d+:\s(\d+)\s\-\s\d+フレーム/)[1]
    );
    progress.log_updated = true;
  }
  if (raw_chapter_exe_data.startsWith("end")) {
    progress.now_num = progress.total_num;
    progress.log_updated = true;
  }
  progress.log = `(${progress.step}/${progress.steps}) Chapter_exe: ${progress.now_num}/${progress.total_num}`;
  return progress;
};

const applyUdpate = (line, progress) => {
  const steps = new Map([
    ["AviSynth", udpateToAviSynth],
    ["chapter_exe", updateToChapter],
    ["logoframe", updateToLogoFrame],
    ["frame", updateToFfmpeg],
  ]);
  progress.steps = steps.size;
  progress.step = 0;
  for (const [text, fn] of steps) {
    progress.step += 1;
    if (line.startsWith(text)) {
      return fn(line, progress);
    }
  }
  //進捗表示に必要ない出力データを流す
  console.log(line);
  return progress;
};

/**
 * jlse実行中のログ行を解析し、進捗が更新された場合に標準出力する
 * @param {string} line - ログ行
 * @param {Object} progress - 直前までの進捗
 * @returns Object - 更新済みの進捗
 */
const updateProgress = (line, progress) => {
  progress = applyUdpate(line, progress);
  progress.percent = progress.now_num / progress.total_num;
  if (progress.log_updated) {
    console.log(
      JSON.stringify({
        type: "progress",
        percent: progress.percent,
        log: progress.log,
      })
    );
    progress.log_updated = false;
  }
  return progress;
};
export { updateProgress };
