const http = require('http');
const express = require('express');
const socketIo = require('socket.io');
const config = require('./config');
const PubSub = require('./PubSub');
const TutorList = require('./TutorList');

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
const pubsub = new PubSub();
const tutorList = new TutorList();

/**
|--------------------------------------------------
| Helpers
|--------------------------------------------------
*/
// function login(uid) {
//   console.log(`Log in user with uid ${uid}`);
// }

// function logout(uid) {
//   console.log(`Log out user with uid ${uid}`);
// }

/**
|--------------------------------------------------
| REST app
|--------------------------------------------------
*/
rest.use(express.json());

rest.get('/', (req, res) => {
  res.sendFile(`${__dirname}/index.html`);
});

rest.post('/message', (req, res) => {
  const { uids, data } = req.body;
  if (!Array.isArray(uids)) {
    res.status(400).json('uids is invalid, expected an array');
    return;
  }
  if (uids.length === 0) {
    pubsub.broadcast('message', data);
    res.json(uids);
  } else {
    const published = [];
    uids.forEach((uid) => {
      if (tutorList.hasTutor(uid) && pubsub.publish(uid, 'message', data)) {
        published.push(uid);
      }
    });
    res.json(published);
  }
});

rest.post('/disconnect', (req, res) => {
  const { uid, data } = req.body;
  if (!tutorList.hasTutor(uid)) {
    res.status(404).json('Tutor not found');
    return;
  }
  if (pubsub.publish(uid, 'disconnect', data)) {
    res.json(uid);
  } else {
    res.status(500).json('Server error');
  }
});

/**
|--------------------------------------------------
| Socket app
|--------------------------------------------------
*/
socket.use((connection, next) => {
  const { uid, name, avatar } = connection.request._query;
  console.log(`Socket connection request from uid ${uid}, name ${name}, avatar ${avatar}`);
  next();
});

socket.on('connection', (connection) => {
  const { uid, name, avatar } = connection.handshake.query;
  tutorList.addTutor(uid, name, avatar);

  connection.on('disconnect', (reason) => {
    tutorList.removeTutor(uid);
  });

  pubsub.subscribe(uid);

  pubsub.onBroadcastMessage('message', (data) => {
    socket.sockets.emit('message', data);
  });

  pubsub.onMessage(uid, 'message', (data) => {
    connection.emit('message', data);
  });

  pubsub.onMessage(uid, 'disconnect', (data) => {
    if (tutorList.hasTutor(uid) && connection.emit('message', data)) {
      tutorList.removeTutor(uid);
      pubsub.unsubscribe(uid);
      connection.disconnect(true);
    }
  });
});

pubsub.subscribeBroadcast();

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
