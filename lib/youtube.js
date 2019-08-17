require('dotenv').config()

const { google } = require('googleapis')
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
});

async function searchVideo(params) {
  const response = await youtube.search.list(params)
  return response.data
}

module.exports = {
  searchVideo
}