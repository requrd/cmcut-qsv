import axios from "axios";
/**
 * axiosのエラーを表示する
 * @param {Error} error
 */
const handle_error = (error) => {
  const { status, statusText } = error.response;
  console.error(`Error! HTTP Status: ${status} ${statusText}\nURL:${url}`);
  throw error;
};

const fetch_data = async (url, query) => {
  try {
    const response = await axios.get(url, {
      headers: { accept: "application/json" },
      params: query,
    });
    return response.data;
  } catch (error) {
    handle_error(error);
  }
};

const reGenerateThumbnail = async (record_id, video_file_id) => {
  try {
    const record = await fetch_data(`/api/recorded/${record_id}`, {
      isHalfWidth: true,
    });
    await axios.delete(`/api/thumbnails/${record.thumbnails[0]}`);
    await axios.post(
      `/api/thumbnails/videos/${video_file_id ?? record.videoFiles[0].id}`
    );
  } catch (error) {
    handle_error(error);
  }
};

const main = async () => {
  // 引数がセットされていた場合、優先して指定する
  const record_id = process.argv[2] ?? process.env.RECORDEDID;
  const video_file_id = process.argv[3] ?? process.env.VIDEOFILEID;

  if (record_id === undefined) {
    throw Error(`record info is not set\nreqcord id: ${record_id}`);
  }
  await reGenerateThumbnail(record_id, video_file_id);
};

await main();
