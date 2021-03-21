const redis = require('redis');

class TutorList {
  constructor(client = redis.createClient()) {
    this.client = client;
    this.localUids = new Set();
  }

  hasTutor(uid) {
    return this.client.exists(`tutor_${uid}`);
  }

  addTutor(uid, name, avatar) {
    this.localUids.add(uid);
    return this.client.hset(`tutor_${uid}`, 'uid', uid, 'name', name, 'avatar', avatar);
  }

  removeTutor(uid) {
    if (this.localUids.has(uid)) {
      this.localUids.delete(uid);
    }
    return this.client.del(`tutor_${uid}`);
  }

  getLocalUids() {
    return this.localUids;
  }
}

module.exports = TutorList;
