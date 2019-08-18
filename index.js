const moment = require('moment')
const youtube = require('./lib/youtube')
const store = require('./lib/store')
var videoList = require('./config/videoList')

const updatedVideos = []
const youtubeSearchUrl = "https://www.youtube.com/results?sp=EgIYAg%253D%253D&search_query="

Promise.all(
  videoList.map(video => {
    return new Promise(resolve => {
      const redisKey = `youtube:${video}`
      let latestVideo = {}
      youtube.searchVideo({
        part: 'id,snippet',
        q: video,
        maxResults: 10,
        order: 'date',
        type: 'video',
        videoDuration: 'long'
      }).then(results => {
        if(results) {
          items = results.items

          if (!items.length) {
            console.log(`No items found for: ${video}`)
            return resolve(`No items found for: ${video}`)
          }
  
          latestVideo = findLatestVersion(items)
  
          store.lookUpHash(redisKey, "publishedAt")
            .then(storedItem => {
              if (!storedItem) {
                console.log(`=== ITEM NOT STORED: ${video} ===`)
                console.log(`=== INSERTING DATA: ${video} ===`)
                store.insertHash(redisKey, "id", latestVideo.id)
                store.insertHash(redisKey, "publishedAt", latestVideo.publishedAt)
              } else {
                console.log(`=== ITEM FOUND IN STORE: ${video} ===`)
                if (moment(storedItem) < moment(latestVideo.publishedAt)) {
                  console.log(`=== NEWER VERSION FOUND: ${video} - INSERTING NEW DATA`)
                  updatedVideos.push(`${youtubeSearchUrl}${video}`)
                  store.insertHash(redisKey, "publishedAt", latestVideo.publishedAt)
                } else {
                  console.log(`=== NO UPDATES FOUND: ${video} ===`)
                  console.log(`=== LATEST VERSION: ${storedItem}`)
                }
              }
              return resolve()
            })
            .catch(err => {
              console.log(`=== ERROR: ${video} ===`)
              console.log(err)
            })
        } else {
          return resolve()
        }
      })
    })
  })
).then(() => {
  console.log("SEARCH DONE")
  console.log(updatedVideos)
})

function findLatestVersion(items) {
  let latestVideo = {}
  items.forEach(i => {
    if(!latestVideo.id) {
      latestVideo.id = i.id.videoId
      latestVideo.publishedAt = moment(i.snippet.publishedAt).format()
    } else {
      const currentPublishedAt = moment(i.snippet.publishedAt).format()
      const latestPublishedAt = latestVideo.publishedAt
      if (currentPublishedAt > latestPublishedAt) {
        latestVideo.id = i.id.videoId
        latestVideo.publishedAt = moment(i.snippet.publishedAt).format()
      }
    }
  })

  return latestVideo
}