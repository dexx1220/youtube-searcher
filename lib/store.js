const redis = require('redis')
const client = redis.createClient()
const { promisify } = require('util')

const hgetAsync = promisify(client.hget).bind(client)
const hsetAsync = promisify(client.hset).bind(client)

async function lookUpHash(key, hashKey) {
  const data = await hgetAsync(key, hashKey)
  return data
}

async function insertHash(key, hashKey, hashValue) {
  hsetAsync(key, hashKey, hashValue)
}

module.exports = {
  lookUpHash,
  insertHash
}
