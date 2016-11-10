const storage = require('@google-cloud/storage');

function getLastModified(gcs, bucketName, fileName) {
  return gcs.bucket(bucketName).file(fileName).getMetadata().then(([{timeCreated}]) => timeCreated);
}

function poll(ui, gcs, bucketName, fileName, pollTime, currentLastModified, notify) {
  return getLastModified(gcs, bucketName, fileName).then((newLastModified) => {
    if (currentLastModified !== newLastModified) {
      ui.writeLine(`config modified; old=${currentLastModified}; new=${newLastModified}`);
      notify();
    }

    setTimeout(() => {
      poll(ui, gcs, bucketName, fileName, pollTime, newLastModified, notify);
    }, pollTime);
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
      poll(this.ui, this.gcs, this.bucket, this.key, this.pollTime, lastModified, notify);
    });
  }
}

module.exports = GCSNotifier;
