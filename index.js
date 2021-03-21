const http = require('http');
const express = require('express');
const socketIo = require('socket.io');
const config = require('./config');

const conf = config(process.env.NODE_ENV);
const rest = express();
const restServer = http.createServer(rest);
const socketServer = http.createServer();
const socket = socketIo(socketServer, {
  cors: {
    origin: `http://localhost:${conf.rest.port}`,
    methods: ['GET', 'POST'],
  },
});

/**
|--------------------------------------------------
| REST app
|--------------------------------------------------
*/
rest.use(express.json());

rest.get('/', (req, res) => {
  res.sendFile(`${__dirname}/index.html`);
});

/**
|--------------------------------------------------
| Socket app
|--------------------------------------------------
*/
socket.on('connection', (connection) => {
  const { uid, name, avatar } = connection.handshake.query;
});

/**
|--------------------------------------------------
| Spinning up
|--------------------------------------------------
*/
restServer.listen(conf.rest.port, () => {
  console.log(`REST app listening on port ${conf.rest.port}`);
});

socketServer.listen(conf.socket.port, () => {
  console.log(`Socket app listening on port ${conf.socket.port}`);
});
