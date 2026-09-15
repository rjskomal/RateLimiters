const sharedStore = require('./sharedStore');

function tbRateLimiter(bucketSize, refillRate) {
    return async (req, res, next) => {
        const { clientID } = req.query;

        if (!clientID) {
            return res.status(400).send('clientID is required');
        }

        try {
            const now = Date.now();
            
            // Get or initialize user state from Redis
            let user = await sharedStore.getUserState(clientID);
            if (!user) {
                await sharedStore.initializeUserIfNotExists(clientID, bucketSize, now);
                user = { totalTokens: bucketSize, lastRefillTime: now };
            }

            // Calculate tokens to add based on elapsed time
            const elapsedTime = now - user.lastRefillTime;
            const tokensToAdd = (elapsedTime * (refillRate / 1000));
            user.totalTokens = Math.min(user.totalTokens + tokensToAdd, bucketSize);
            user.lastRefillTime = now;

            if (user.totalTokens >= 1) {
                console.log(`Total tokens available now for ${clientID} = ${user.totalTokens}`);
                user.totalTokens -= 1;

                // Persist updated state to Redis
                await sharedStore.setUserState(clientID, user.totalTokens, user.lastRefillTime);

                return next();
            }

            console.log(`[${clientID}] Rate limit exceeded! Bucket is empty, wait a second to refill.`);
            return res
                .status(429)
                .send(`Rate limit exceeded. Try again later.`);
        } catch (err) {
            console.error(`Rate limiter error for ${clientID}:`, err);
            return res.status(500).send('Internal server error');
        }
    };
}

module.exports = tbRateLimiter;