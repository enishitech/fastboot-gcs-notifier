const storage = require('@google-cloud/storage');

function getLastModified(gcs, bucketName, fileName) {
  return gcs.bucket(bucketName).file(fileName).getMetadata().then(([{timeCreated}]) => timeCreated);
}

function schedulePoll(pollTime, currentLastModified, ...args) {
  setTimeout(() => {
    poll(currentLastModified, ...args).then((newLastModified) => {
      schedulePoll(pollTime, newLastModified, ...args);
    });
  }, pollTime);
}

function poll(currentLastModified, ui, gcs, bucketName, fileName, notify) {
  return getLastModified(gcs, bucketName, fileName).then((newLastModified) => {
    if (currentLastModified !== newLastModified) {
      ui.writeLine(`config modified; old=${currentLastModified}; new=${newLastModified}`);
      notify();
    }

    return newLastModified;
  });
}

class GCSNotifier {
  constructor({bucket, key, poll, authentication} = {}) {
    this.bucket   = bucket;
    this.key      = key;
    this.pollTime = poll || 3 * 1000;
    this.gcs      = storage(authentication);
  }

  subscribe(notify) {
    return getLastModified(this.gcs, this.bucket, this.key).then((lastModified) => {
      schedulePoll(this.pollTime, lastModified, this.ui, this.gcs, this.bucket, this.key, notify);
    });
  }
}

module.exports = GCSNotifier;
