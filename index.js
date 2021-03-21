const http = require('http');
const express = require('express');
const socketIo = require('socket.io');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const morgan = require('morgan');
const config = require('./config');
const PubSub = require('./PubSub');
const TutorList = require('./TutorList');
const RRE = require('./RRE');

const conf = config(process.env.NODE_ENV);
const rest = express();
const restServer = http.createServer(rest);
const socketServer = http.createServer();
const io = socketIo(socketServer, {
  cors: {
    origin: `http://localhost:${conf.rest.port}`,
    methods: ['GET', 'POST'],
  },
});
const logger = winston.createLogger({
  transports: [
    new DailyRotateFile({
      level: 'debug',
      filename: 'socket.log',
      dirname: `${__dirname}/logs`,
    }),
  ],
});
const pubsub = new PubSub();
const tutorList = new TutorList();
const rre = new RRE(process.env.NODE_ENV);

/**
|--------------------------------------------------
| REST app
|--------------------------------------------------
*/
rest.use(morgan(':req[x-forwarded-for] - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'));

rest.use(express.json());

rest.get('/', (req, res) => {
  res.sendFile(`${__dirname}/index.html`);
});

rest.post('/message', (req, res) => {
  const { uids, data } = req.body;
  if (!Array.isArray(uids)) {
    res.status(400).json('uids is invalid, expected an array');
    logger.warn(`Rest POST /message, invalid uids: ${uids}`);
    return;
  }
  if (uids.length === 0) {
    pubsub.broadcast('message', data);
    res.json(uids);
    logger.info(`Rest POST /message, broadcast data: ${JSON.stringify(data)}`);
  } else {
    const published = [];
    uids.forEach((uid) => {
      if (tutorList.hasTutor(uid) && pubsub.publish(uid, 'message', data)) {
        published.push(uid);
      }
    });
    res.json(published);
    logger.info(`Rest POST /message, published uids: ${published}, data: ${JSON.stringify(data)}`);
  }
});

rest.post('/disconnect', (req, res) => {
  const { uid, data } = req.body;
  if (!tutorList.hasTutor(uid)) {
    res.status(404).json('Tutor not found');
    logger.warn(`Rest POST /disconnect, uid not found: ${uid}`);
    return;
  }
  if (pubsub.publish(uid, 'disconnect', data)) {
    res.json(uid);
    logger.info(`Rest POST /disconnect, uid: ${uid}, data: ${JSON.stringify(data)}`);
  } else {
    res.status(500).json('Server error');
    logger.error(`Rest POST /disconnect, could not publish, uid: ${uid}, event: disconnect, data: ${JSON.stringify(data)}`);
  }
});

/**
|--------------------------------------------------
| Socket app
|--------------------------------------------------
*/
io.use((socket, next) => {
  const { uid, name, avatar } = socket.request._query;
  logger.info(`Socket connection request from uid: ${uid}, name: ${name}, avatar: ${avatar}`);
  next();
});

io.on('connection', (socket) => {
  const { uid, name, avatar } = socket.handshake.query;

  socket.on('disconnect', (reason) => {
    rre.logout(uid);
    tutorList.removeTutor(uid);
    pubsub.unsubscribe(uid);
    logger.info(`Socket disconnected, reason: ${reason}, uid: ${uid}, name: ${name}, avatar: ${avatar}`);
  });

  rre.login(uid);
  tutorList.addTutor(uid, name, avatar);
  pubsub.subscribe(uid);

  pubsub.onBroadcastMessage('message', (data) => {
    io.sockets.emit('message', data);
    logger.info(`Event message, all tutors, data: ${JSON.stringify(data)}`);
  });

  pubsub.onMessage(uid, 'message', (data) => {
    socket.emit('message', data);
    logger.info(`Event message, uid: ${uid}, data: ${JSON.stringify(data)}`);
  });

  pubsub.onMessage(uid, 'disconnect', (data) => {
    if (socket.emit('message', data)) {
      socket.disconnect();
      logger.info(`Event force disconnect, uid: ${uid}, data: ${JSON.stringify(data)}`);
    }
  });

  logger.info(`Socket new connection, uid: ${uid}, name: ${name}, avatar: ${avatar}`);
});

pubsub.subscribeBroadcast();

/**
|--------------------------------------------------
| Spinning up
|--------------------------------------------------
*/
restServer.listen(conf.rest.port, () => {
  logger.info(`REST app listening on port ${conf.rest.port}`);
});

socketServer.listen(conf.socket.port, () => {
  logger.info(`Socket app listening on port ${conf.socket.port}`);
});
