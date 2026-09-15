const { createClient } = require('redis');

const client = createClient();

function logRedisStats(context) {
    if (!client.isReady) {
        console.log(`[Redis] ${context}; client is not ready`);
        return;
    }

    return Promise.all([client.dbSize(), client.info('memory')])
        .then(([keyCount, memoryInfo]) => {
            const usedMemory = memoryInfo.match(/used_memory_human:([^\r\n]+)/)?.[1] || 'unknown';
            const maxMemory = memoryInfo.match(/maxmemory_human:([^\r\n]+)/)?.[1] || '0B';
            console.log(`[Redis] ${context}; keys=${keyCount}; usedMemory=${usedMemory}; maxMemory=${maxMemory}`);
        })
        .catch((err) => {
            console.error(`[Redis] Could not read stats after ${context}:`, err.message);
        });
}

client.on('error', (err) => {
    console.error('Redis Client Error:', err);
});

client.on('connect', () => {
    console.log('[Redis] TCP connection established');
});

client.on('ready', () => {
    console.log('[Redis] Ready to accept commands');
});

client.on('reconnecting', () => {
    console.log('[Redis] Reconnecting');
});

client.on('end', () => {
    console.log('[Redis] Connection closed');
});

// Connect to Redis on module load
(async () => {
    try {
        await client.connect();
    } catch (err) {
        console.error('Failed to connect to Redis:', err);
    }
})();

/**
 * Get user state from Redis
 * Returns { totalTokens, lastRefillTime } or null if user doesn't exist
 */
async function getUserState(clientID) {
    try {
        const key = `rate-limiter:${clientID}`;
        const data = await client.hGetAll(key);

        if (!data || Object.keys(data).length === 0) {
            console.log(`[Redis] READ miss key=${key}`);
            return null;
        }

        const state = {
            totalTokens: parseFloat(data.totalTokens),
            lastRefillTime: parseInt(data.lastRefillTime, 10),
        };
        console.log(`[Redis] READ hit key=${key}`, state);
        return state;
    } catch (err) {
        console.error(`Error getting user state for ${clientID}:`, err);
        return null;
    }
}

/**
 * Set user state in Redis
 * Stores { totalTokens, lastRefillTime } for a user
 */
async function setUserState(clientID, totalTokens, lastRefillTime) {
    try {
        const key = `rate-limiter:${clientID}`;
        await client.hSet(key, {
            totalTokens: totalTokens.toString(),
            lastRefillTime: lastRefillTime.toString(),
        });
        console.log(`[Redis] WRITE key=${key}`, { totalTokens, lastRefillTime });
        await logRedisStats(`after WRITE key=${key}`);
    } catch (err) {
        console.error(`Error setting user state for ${clientID}:`, err);
    }
}

/**
 * Initialize user state if doesn't exist
 * Returns true if initialized, false if already existed
 */
async function initializeUserIfNotExists(clientID, bucketSize, now) {
    try {
        const existing = await getUserState(clientID);
        if (!existing) {
            await setUserState(clientID, bucketSize, now);
            console.log(`[Redis] INITIALIZED clientID=${clientID}`);
            return true;
        }
        console.log(`[Redis] ALREADY INITIALIZED clientID=${clientID}`);
        return false;
    } catch (err) {
        console.error(`Error initializing user ${clientID}:`, err);
        return false;
    }
}

/**
 * Check if Redis is connected
 */
function isStoreConnected() {
    return client.isReady;
}

module.exports = {
    getUserState,
    setUserState,
    initializeUserIfNotExists,
    isStoreConnected,
    client,
};
