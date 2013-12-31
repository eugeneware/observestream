var expect = require('expect.js'),
    through2 = require('through2'),
    MemLively = require('memlively'),
    LivelyStream = require('livelystream'),
    ObserveStream = require('..'),
    setImmediate = global.setImmediate || process.nextTick,
    noop = function() {};

describe('Observe Stream', function() {
  it('should be able to monitor changes', function(done) {
    var obj = { target: { name: 'Eugene', number: 42 } };
    var os = new ObserveStream('eugene', obj, 'target', {});
    os.pipe(through2({ objectMode: true }, function (chunk, enc, cb) {
      var msg = chunk[0];
      var data = chunk[1];
      expect(msg).to.equal('change');
      expect(data).to.eql([
          { type: 'put', key: [ 'name' ], value: 'Susan' },
          { type: 'del', key: [ 'number' ] }
        ]);
      cb();
      done();
    }));

    obj.target.name = 'Susan';
    delete obj.target.number;
  });

  it('should be able to receive an initial value', function(done) {
    var obj = {};
    var os = new ObserveStream('eugene', obj, 'target', {});
    os.write(['value', { name: 'Eugene', number: 42 }]);
    setImmediate(function () {
      expect(obj.target).to.eql({ name: 'Eugene', number: 42 });
      done();
    });
  });

  it('should be able to receive changes', function(done) {
    var obj = { target: { name: 'Eugene', number: 42 } };
    var os = new ObserveStream('eugene', obj, 'target', {});
    os.write(['change', [
      { type: 'put', key: [ 'name' ], value: 'Susan' },
      { type: 'del', key: [ 'number' ] }
    ]]);
    setImmediate(function () {
      expect(obj.target).to.eql({ name: 'Susan' });
      done();
    });
  });

  it('should be able to work with LivelyStreams', function(done) {
    var memdb = new MemLively();
    var ls = new LivelyStream(memdb);
    var obj = {};
    var os = new ObserveStream('eugene', obj, 'target', {});

    var count = 0;
    ls.pipe(os).pipe(ls);

    memdb.put('eugene', { name: 'Eugene', number: 42 }, noop);
    setTimeout(checkValue, 50);

    function checkValue() {
      expect(obj).to.eql({ target: { name: 'Eugene', number: 42 } });
      changes();
    }

    function changes() {
      obj.target.name = 'Susan';
      delete obj.target.number;
      setTimeout(checkChange, 50);
    }

    function checkChange() {
      expect(memdb.db.eugene).to.eql({ name: 'Susan' });
      done();
    }
  });

  it('should be able to use setImmediate with LivelyStream', function(done) {
    var memdb = new MemLively();
    var ls = new LivelyStream(memdb);
    var obj = {};
    var os = new ObserveStream('eugene', obj, 'target', {}, { nextTurn: setImmediate });

    var count = 0;
    ls.pipe(os).pipe(ls);

    memdb.put('eugene', { name: 'Eugene', number: 42 }, noop);
    setTimeout(checkValue, 50);

    function checkValue() {
      expect(obj).to.eql({ target: { name: 'Eugene', number: 42 } });
      changes();
    }

    function changes() {
      obj.target.name = 'Susan';
      delete obj.target.number;
      setTimeout(checkChange, 50);
    }

    function checkChange() {
      expect(memdb.db.eugene).to.eql({ name: 'Susan' });
      done();
    }
  });

  it('should be able to use observejs with LivelyStream', function(done) {
    var memdb = new MemLively();
    var ls = new LivelyStream(memdb);
    var obj = {};
    var os = new ObserveStream('eugene', obj, 'target', {}, { observejs: true });

    var count = 0;
    ls.pipe(os).pipe(ls);

    memdb.put('eugene', { name: 'Eugene', number: 42 }, noop);
    setTimeout(checkValue, 50);

    function checkValue() {
      expect(obj).to.eql({ target: { name: 'Eugene', number: 42 } });
      changes();
    }

    function changes() {
      obj.target.name = 'Susan';
      setTimeout(checkChange, 50);
    }

    function checkChange() {
      expect(memdb.db.eugene).to.eql({ name: 'Susan', number: 42 });
      done();
    }
  });
});
