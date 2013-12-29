var events = require('events'),
    Stream = require('stream'),
    inherits = require('util').inherits,
    diff = require('changeset'),
    clone = require('clone'),
    observejs = require('observejs'),
    noop = function () {};

module.exports = ObserveStream;
function ObserveStream(scope, path, opts) {
  if (typeof opts === 'undefined') opts = {};
  opts.nextTurn = opts.nextTurn || nextTurn;
  opts.observejs = opts.observejs || false;

  Stream.Duplex.call(this, { objectMode: true });

  this.nextTurn = opts.nextTurn;
  this.observejs = opts.observejs;
  this.scope = scope;
  this.path = path;
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
}
inherits(ObserveStream, Stream.Duplex);

ObserveStream.prototype._read = noop;

ObserveStream.prototype._write = function (chunk, enc, cb) {
  if ('value' in chunk) {
    this.scope[this.path] = clone(chunk.value);
  } else if ('change' in chunk) {
    diff.apply(chunk.change, this.scope[this.path], true);
  }
  cb();
};

ObserveStream.prototype.$digest = function () {
  var self = this;
  var new_ = clone(this.scope[this.path]);
  var changes = diff(this.old, new_);
  if (changes.length) {
    this.old = new_;
    self.push({change: changes});
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
