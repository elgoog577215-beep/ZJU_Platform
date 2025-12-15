const apicache = require('apicache');

const cache = apicache.middleware;

// Cache GET requests for 5 minutes
const cacheMiddleware = cache('5 minutes', (req, res) => res.statusCode === 200 && req.method === 'GET');

module.exports = cacheMiddleware;