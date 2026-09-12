function tbRateLimiter(bucketSize, refillRate) {
    const users = new Map();

    return (req, res, next) => {
        const { clientID } = req.query;

        if (!clientID) {
            return res.status(400).send('clientID is required');
        }

        const now = Date.now();
        let user = users.get(clientID);

        if (!user) {
            user = { totalTokens: bucketSize, lastRefillTime: now };
            users.set(clientID, user);
        }

       
        const elapsedTime = now - user.lastRefillTime;
        const tokensToAdd = (elapsedTime * (refillRate / 1000));
        user.totalTokens = Math.min(user.totalTokens + tokensToAdd, bucketSize);
        user.lastRefillTime = now;

        if (user.totalTokens > 1) {
            console.log(`Total tokens available now for ${clientID} = ${user.totalTokens}`);
            user.totalTokens -= 1;

            return next();
        }

        console.log(`[${clientID}] Rate limit exceeded! Bucket is empty, wait a second to refill.`);
        return res
            .status(429)
            .send(`Rate limit exceeded. Try again later.`);
    };
}

module.exports = tbRateLimiter;