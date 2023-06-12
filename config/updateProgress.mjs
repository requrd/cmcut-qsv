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
  // if (tmp === null) continue;
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
  state.total_num = state.duration;
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
  state.log_updated = true;
  return state;
};

const udpateToAviSynth = (str, progress) => {
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
  progress.log_updated = true;
  progress.log = `(1/4) AviSynth:Creating lwi index files`;
  return progress;
};

const updateToLogoFrame = (str, progress) => {
  const raw_logoframe_data = str.replace(/logoframe\s/, "");
  if (raw_logoframe_data.startsWith("checking") && raw_logoframe_data) {
    const logoframe_reg = /checking\s*(\d+)\/(\d+)\sended./;
    const logoframe = raw_logoframe_data.match(logoframe_reg);
    progress.now_num = Number(logoframe[1]);
    progress.total_num = Number(logoframe[2]);
    progress.log_updated = true;
  }
  progress.log = `(3/4) logoframe: ${progress.now_num}/${progress.total_num}`;
  return progress;
};

const updateToChapter = (str, progress) => {
  const raw_chapter_exe_data = str.replace(/chapter_exe\s/, "");
  switch (raw_chapter_exe_data) {
    case raw_chapter_exe_data.startsWith("\tVideo Frames") &&
      raw_chapter_exe_data: {
      //chapter_exeでの総フレーム数取得
      const movie_frame_reg = /\tVideo\sFrames:\s(\d+)\s\[\d+\.\d+fps\]/;
      progress.total_num = Number(
        raw_chapter_exe_data.match(movie_frame_reg)[1]
      );
      progress.log_updated = true;
      break;
    }
    case raw_chapter_exe_data.startsWith("mute") && raw_chapter_exe_data: {
      //現在のフレーム数取得
      const chapter_reg = /mute\s?\d+:\s(\d+)\s\-\s\d+フレーム/;
      progress.now_num = Number(raw_chapter_exe_data.match(chapter_reg)[1]);
      progress.log_updated = true;
      break;
    }
    case raw_chapter_exe_data.startsWith("end") && raw_chapter_exe_data: {
      //chapter_exeの終了検知
      progress.now_num = progress.total_num;
      progress.log_updated = true;
      break;
    }
    default: {
      break;
    }
  }
  progress.log = `(2/4) Chapter_exe: ${progress.now_num}/${progress.total_num}`;
  return progress;
};

const applyUdpate = (str, progress) => {
  if (str.startsWith("AviSynth") && str) {
    //AviSynth+
    return udpateToAviSynth(str, progress);
  }

  if (str.startsWith("chapter_exe") && str) {
    //chapter_exe
    return updateToChapter(str, progress);
  }

  if (str.startsWith("logoframe") && str) {
    //logoframe
    return updateToLogoFrame(str, progress);
  }

  if (str.startsWith("frame") && str) {
    return updateToFfmpeg(str, progress);
  }
  //進捗表示に必要ない出力データを流す
  console.log(str);
  return progress;
};

/**
 * jlse実行中のログ行を解析し、進捗が更新された場合に標準する
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
