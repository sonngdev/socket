const redis = require('redis');

class TutorList {
  constructor(client = redis.createClient()) {
    this.client = client;
  }

  hasTutor(uid) {
    return this.client.exists(`tutor_${uid}`);
  }

  addTutor(uid, name, avatar) {
    return this.client.hset(`tutor_${uid}`, 'uid', uid, 'name', name, 'avatar', avatar);
  }

  removeTutor(uid) {
    return this.client.del(`tutor_${uid}`);
  }
}

module.exports = TutorList;
