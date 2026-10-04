const sharedStore = require('./sharedStore');

function tbRateLimiter(bucketSize, refillRate) {
    return async (req, res, next) => {
        const { clientID } = req.query;

        if (!clientID) {
            return res.status(400).send('clientID is required');
        }

        try {
            const { allowed, tokensRemaining } = await sharedStore.rateLimitCheck(clientID, bucketSize, refillRate);

            if (allowed) {
                console.log(`Total tokens available now for ${clientID} = ${tokensRemaining}`);
                return next();
            }

            console.log(`[${clientID}] Rate limit exceeded! Bucket is empty, wait a second to refill.`);
            return res
                .status(429)
                .send('Rate limit exceeded. Try again later.');
        } catch (err) {
            console.error(`Rate limiter error for ${clientID}:`, err);
            return res.status(500).send('Internal server error');
        }
    };
}

module.exports = tbRateLimiter;
module.exports = tbRateLimiter;