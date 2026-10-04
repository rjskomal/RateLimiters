local key = KEYS[1]
local bucketSize = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local vals = redis.call('HMGET', key, 'totalTokens', 'lastRefillTime')
local totalTokens = tonumber(vals[1])
local lastRefillTime = tonumber(vals[2])

if not totalTokens then
    totalTokens = bucketSize
    lastRefillTime = now
end

local elapsed = now - lastRefillTime
local tokensToAdd = elapsed * (refillRate / 1000)
totalTokens = math.min(totalTokens + tokensToAdd, bucketSize)
lastRefillTime = now

local allowed = 0
if totalTokens >= 1 then
    totalTokens = totalTokens - 1
    allowed = 1
end

redis.call('HMSET', key, 'totalTokens', tostring(totalTokens), 'lastRefillTime', tostring(lastRefillTime))
redis.call('EXPIRE', key, math.ceil(bucketSize / refillRate) + 60)

return {allowed, tostring(totalTokens)}

