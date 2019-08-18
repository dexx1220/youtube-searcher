const moment = require('moment')
const videoList = require('./config/videoList')
const youtube = require('./lib/youtube')
const store = require('./lib/store')

const updatedVideos = []
const allPromises = []
const youtubeSearchUrl = "https://www.youtube.com/results?sp=EgIYAg%253D%253D&search_query="

videoList.forEach(video => {
  const redisKey = `youtube:${video}`
  let latestVideo = {}
  
  allPromises.push(
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
          return Promise.resolve(`No items found for: ${video}`)
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
          })
          .catch(err => {
            console.log(`=== ERROR: ${video} ===`)
            console.log(err)
          })
      }
    })
  )
})

Promise.all(allPromises)
  .then(() => {
    console.log("Search done")
    console.log("Updated videos are:")
    console.log(updatedVideos)
    process.exit()
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