import axios from 'axios';

const handle_error = (error) => {
    const { status, statusText } = error.response;
    console.error(`Error! HTTP Status: ${status} ${statusText}\nURL:${url}`);
    throw error;
}

const fetch_data = async function(url, query) {
  try {
      const response = await axios.get(url, { headers: { accept: "application/json" }, params: query })
      return response.data
  } catch (error) {
    handle_error(error)
  }
}

const main = async () => {
    const record_id = process.env.RECORDEDID
    const video_file_id = process.env.VIDEOFILEID
    
    if (record_id === undefined || video_file_id === undefined) {
        throw Error(`record info is not set\nreqcord id: ${record_id}, video_file_id: ${video_file_id}`)
    }
    try {
        const record = await fetch_data(`/api/recorded/${record_id}`, { "isHalfWidth": true })
        await axios.delete(`/api/thumbnails/${record.thumbnails[0]}`)
        await axios.post(`/api/thumbnails/videos/${video_file_id}`)
    } catch (error) {
        handle_error(error)
    }
}
await main()
