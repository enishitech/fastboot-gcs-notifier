const {Storage} = require('@google-cloud/storage');

function getLastModified(file) {
  return file.getMetadata().then(([{timeCreated}]) => timeCreated);
}

function schedulePoll(pollTime, currentLastModified, ...args) {
  setTimeout(() => {
    poll(currentLastModified, ...args).then((newLastModified) => {
      schedulePoll(pollTime, newLastModified, ...args);
    });
  }, pollTime);
}

function poll(currentLastModified, ui, file, notify) {
  return getLastModified(file).then((newLastModified) => {
    if (currentLastModified !== newLastModified) {
      ui.writeLine(`config modified; old=${currentLastModified}; new=${newLastModified}`);
      notify();
    }

    return newLastModified;
  });
}

class GCSNotifier {
  constructor({bucket, key, authentication, poll} = {}) {
    this.bucket         = bucket;
    this.key            = key || 'fastboot-deploy-info.json';
    this.authentication = authentication;
    this.pollTime       = poll || 3 * 1000;
  }

  subscribe(notify) {
    const file = new Storage(this.authentication).bucket(this.bucket).file(this.key);

    return getLastModified(file).then((lastModified) => {
      schedulePoll(this.pollTime, lastModified, this.ui, file, notify);
    });
  }
}

module.exports = GCSNotifier;
