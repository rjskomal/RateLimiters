const express = require('express');
const fwRateLimiter = require('./fwRateLimiter');
const tbRateLimiter = require('./tbRateLimiter');

const app = express();
const fwLimiter = fwRateLimiter(5, 10);
const tbLimiter = tbRateLimiter(5, 2);

app.get('/fw', fwLimiter, (req, res) => {
  const { clientID } = req.query;
  res.send(`Hello ${clientID}`);
});

app.get('/tb', tbLimiter, (req, res) => {
  const { clientID } = req.query;
  res.send(`Hello ${clientID}`);
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});