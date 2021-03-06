// Inspired from https://gist.github.com/sixertoy/6b5433220a45aa754354287ff54a1e2a

const os = require('os');
const dns = require('dns');
const express = require('express');
const request = require('request');

const app = express();
const hostname = os.hostname();

const serverPort = (process.env.PORT || process.env.PROXY_PORT || 3000);

app.get('/icecast_metadata_worker.min.js', (req, res) => {
  res.sendFile(__dirname + '/icecast_metadata_worker.min.js');
});

app.get('/', (req, res) => {
  process.stdout.write(`Request: ${req.query.stream}\n`);
  const stream_url = req.query.stream;

  const options = {
    url: req.query.stream/*,
    headers: {"Icy-Metadata": "1"}*/
  };

  request.get(options)
    .on('error', () => {})
    .on('response', () => {})
    .pipe(res);
});

app.listen(serverPort, () => {
  dns.lookup(hostname, (err, ip) => {
    // retrieve network local ip
    process.stdout.write('Audio Proxy Server runs under\n');
    process.stdout.write(`  Local:        http://locahost:${serverPort}\n`);
    process.stdout.write(`  Home Network: http://${ip}:${serverPort}\n`);
  });
});
