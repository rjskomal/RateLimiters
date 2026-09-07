
function fwRateLimiter(maxRequests, windowSize) {                       
    const windowMs = windowSize * 1000;
    let users = new Map();
console.log(users);
    return (req, res, next) => {
        const { clientID } = req.query;

        if (!clientID) {
            return res.status(400).send('clientID is required');
        }

        const now = Date.now();
        const user = users.get(clientID);

        if (!user || now - user.startTime >= windowMs) {
            users.set(clientID, { count: 1, startTime: now });
            return next();
        }

        if (user.count < maxRequests) {
            user.count += 1;
            return next();
        }

        const retryAfter = Math.ceil((windowMs - (now - user.startTime)) / 1000);
        res.set('Retry-After', retryAfter);
        return res
            .status(429)
            .send(`Rate limit exceeded. Try again in ${retryAfter} seconds.`);
    };
}

module.exports = fwRateLimiter;