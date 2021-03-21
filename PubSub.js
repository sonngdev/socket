const redis = require('redis');

class PubSub {
  constructor(pub = redis.createClient(), sub = redis.createClient()) {
    this.pub = pub;
    this.sub = sub;
  }

  subscribe(uid) {
    this.sub.subscribe(`channel_tutor_${uid}`);
  }

  unsubscribe(uid) {
    this.sub.unsubscribe(`channel_tutor_${uid}`);
  }

  publish(uid, messageType, data) {
    return this.pub.publish(`channel_tutor_${uid}`, JSON.stringify({
      type: messageType,
      payload: { data },
    }));
  }

  onMessage(uid, messageType, callback) {
    this.sub.on('message', (channelName, message) => {
      if (channelName !== `channel_tutor_${uid}`) {
        return;
      }
      const { type, data } = JSON.parse(message).payload;
      if (type !== messageType) {
        return;
      }
      callback(data);
    });
  }

  subscribeBroadcast() {
    this.sub.subscribe('common');
  }

  broadcast(messageType, data) {
    return this.pub.publish('common', JSON.stringify({
      type: messageType,
      payload: { data },
    }));
  }

  onBroadcastMessage(messageType, callback) {
    this.sub.on('message', (channelName, message) => {
      if (channelName !== 'common') {
        return;
      }
      const { type, data } = JSON.parse(message).payload;
      if (type !== messageType) {
        return;
      }
      callback(data);
    });
  }
}

module.exports = PubSub;
