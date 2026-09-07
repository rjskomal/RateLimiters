const express = require('express');
const fwRateLimiter = require('./fwRateLimiter');

const app = express();
const rateLimiter = fwRateLimiter(5, 10);

app.get('/', rateLimiter, (req, res) => {
  const { clientID } = req.query;
  res.send(`Hello ${clientID}`);
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});