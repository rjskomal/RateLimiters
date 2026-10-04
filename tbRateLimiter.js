const sharedStore = require('./sharedStore');

const failureMode = 'open'; // Change to 'closed' to block requests when Redis is unavailable
if (!['open', 'closed'].includes(failureMode)) {
    throw new Error('RATE_LIMIT_FAILURE_MODE must be "open" or "closed"');
}

let failureModeAllowed = 0;

function tbRateLimiter(bucketSize, refillRate) {
    return async (req, res, next) => {
        const { clientID } = req.query;

        if (!clientID) {
            return res.status(400).send('clientID is required');
        }

        let rateLimitResult;
        try {
            rateLimitResult = await sharedStore.rateLimitCheck(clientID, bucketSize, refillRate);
        } catch (err) {
            if (failureMode === 'open') {
                failureModeAllowed += 1;
                console.warn(`[${clientID}] failure_mode_allowed count=${failureModeAllowed}; Redis check failed: ${err.message}`);
                return next();
            }

            console.error(`[${clientID}] failure_mode_blocked; Redis check failed:`, err);
            return res.status(503).send('Rate limiter unavailable. Try again later.');
        }

        const { allowed, tokensRemaining } = rateLimitResult;
        if (allowed) {
            console.log(`Total tokens available now for ${clientID} = ${tokensRemaining}`);
            return next();
        }

        console.log(`[${clientID}] Rate limit exceeded! Bucket is empty, wait a second to refill.`);
        return res
            .status(429)
            .send('Rate limit exceeded. Try again later.');
    };
}

module.exports = tbRateLimiter;