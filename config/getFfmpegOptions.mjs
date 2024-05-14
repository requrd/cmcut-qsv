// const videoHeight = parseInt(process.env.VIDEORESOLUTION, 10);
const isDualMono = parseInt(process.env.AUDIOCOMPONENTTYPE, 10) == 2;

/**
 * FFmpegのオプションを作成する
 * @returns string[] - FFmpegの引数となるパラメータ
 */
const getFfmpegOptions = () => {
  const args = ["-y"];
  const preset = "veryfast";
  const codec = "libx264"; //libx264でエンコード
  const crf = 23;
  const videoFilter = "yadif";

  if (isDualMono) {
    Array.prototype.push.apply(args, [
      "-filter_complex",
      "channelsplit[FL][FR]",
      "-map",
      "0:v",
      "-map",
      "[FL]",
      "-map",
      "[FR]",
      "-metadata:s:a:0",
      "language=jpn",
      "-metadata:s:a:1",
      "language=eng",
    ]);
    Array.prototype.push.apply(args, ["-c:a ac3", "-ar 48000", "-ab 256k"]);
  } else {
    // audio dataをコピー
    Array.prototype.push.apply(args, ["-c:a", "aac"]);
  }

  Array.prototype.push.apply(args, ["-ignore_unknown"]);

  // その他設定
  Array.prototype.push.apply(args, [
    "-stats",
    "-vf",
    videoFilter,
    "-preset",
    preset,
    "-aspect",
    "16:9",
    "-c:v",
    codec,
    "-crf",
    crf,
    "-f",
    "mp4",
  ]);
  return args;
};
export { getFfmpegOptions };
