var events = require('events'),
    Stream = require('stream'),
    inherits = require('util').inherits,
    diff = require('changeset'),
    clone = require('clone'),
    observejs = require('observejs'),
    noop = function () {};

module.exports = ObserveStream;
function ObserveStream(key, scope, path, initalValue, opts) {
  if (typeof opts === 'undefined') opts = {};
  opts.nextTurn = opts.nextTurn || nextTurn;
  opts.observejs = opts.observejs || false;

  Stream.Duplex.call(this, { objectMode: true });

  this.key = key;
  this.scope = scope;
  this.path = path;

  this.nextTurn = opts.nextTurn;
  this.observejs = opts.observejs;
  this.old = clone(this.scope[this.path]);

  var self = this;

  if (opts.observejs) {
    if (typeof this.scope[this.path] === 'undefined') {
      this.scope[this.path] = {};
    }
    observejs.observe(this.scope)
      .on('data', function(data) {
        self.$digest();
      });
  } else {
    this.nextTurn(function () {
      self.$digest();
    });
  }

  this.on('pipe', function (ws) {
    ws.write(['listen', { key: self.key, initialValue: self.initialValue }]);
  });
}
inherits(ObserveStream, Stream.Duplex);

ObserveStream.prototype._read = noop;

ObserveStream.prototype._write = function (chunk, enc, cb) {
  if (Array.isArray(chunk) && chunk.length >= 2) {
    var msg = chunk[0];
    var data = chunk[1];

    switch (msg) {
      case 'value':
        this.scope[this.path] = clone(data);
        break;

      case 'change':
        diff.apply(data, this.scope[this.path], true);
        break;
    }
  }
  cb();
};

ObserveStream.prototype.$digest = function () {
  var self = this;
  var new_ = clone(this.scope[this.path]);
  var changes = diff(this.old, new_);
  if (changes.length) {
    this.old = new_;
    self.push(['change', changes]);
  }
  if (!this.observejs) {
    this.nextTurn(function () {
      self.$digest();
    });
  }
};

function nextTurn(fn) {
  //setImmediate(fn);
  setTimeout(fn, 0);
}
