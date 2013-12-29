# observestream 
Duplex node.js stream to replicate live changes to and from Javascript objects.

[![build status](https://secure.travis-ci.org/eugeneware/observestream.png)](http://travis-ci.org/eugeneware/observestream)

## Installation

This module is installed via npm:

``` bash
$ npm install observestream
```

## Example Usage

ObserveStream when used in conjunction with
[LivelyStream](https://github.com/eugeneware/livelystream) will replicate
data from the database pointed to LivelyStream with the local javascript
object pointed to by ObserveStream:

``` js
// require the observestream class
var ObserveStream = require('observestream');

// a database to replicate to/from
var memdb = new MemLively();

// bind the database to the lively stream, and give a key to watch, and an
// initial value if the key is not found in the database
var ls = new LivelyStream(memdb, 'eugene', {});

// scope will contain the local javascript versions of the data in the database
var scope = {};

// Watch for any changes on scope.target
var os = new ObserveStream(scope, 'target');

// Connect the database to the observestream to do two-way replication
ls.pipe(os).pipe(ls);

// Making any changes to the database, should eventually replicate
// the changes to scope.target
memdb.put('eugene', { name: 'Eugene', number: 42 }, function () {});

// Making any changes to the local scope.target will replicate to he database
scope.target.name = 'Susan';
```

## API

### ObserveStream(scope, path[, options])

Constructs a Duplex ObserveStream.

* ```scope``` - This is the scope object (similar to a scope in angularjs)
  which contains the local javascript object that is to be replicated by
  the upstream database through LivelyStream. The object to be watched and
  replicated is ```scope[path]```. So if the path is 'foo', then the object
  to be replicated would be ```scope['foo']```.
* ```path``` - The property of the ```scope``` object which will congtain the
  local javascript object to be replicated to and from the database attached
  to the LivelyStream.
* ```options``` - An optional options object that the following options:
    * ```nextTurn``` (function) - A function that will be used to poll for
      changes of the monitored object. By default, this is a function that
      does ```setTimeout(fn, 0)```. But you can easily change this to
      ```setImmediate``` by passing in ```setImmediate``` to the ```NextTurn```
      property of the options object. Note that doing this will increase the
      CPU utilization considerably.
    * ```observejs``` (boolean) - This default to false. This uses
      [observejs](https://github.com/eugeneware/observejs) to detect changes
      on the watched object. In practice this wraps the object in a series
      of getters and setters to detect changes. However, the limitation of
      this method is that you can't detect if a property has been deleted.
      This is why we use the ```nextTurn``` function to poll for changes. Also
      there maybe times where wrapping an object in getters and setters may
      cause issues. If you can use this method of change detection, then
      this will be much more CPU friendly. ObserveJS may be re-written to use
      the new ECMAScript Object.observe feature, which would be the best of
      both worlds. However, this won't work in older browsers or node.js
      implementations.

Examples:

``` js
// Scope object which will hold the data to be watched
var scope = {}, os;

// Watch for any changes on scope.target
os = new ObserveStream(scope, 'target');

// Use observejs to detect changes of the object
os = new ObserveStream(scope, 'target', { observejs: true });

// Use setImmediate for polling
os = new ObserveStream(scope, 'target', { nextTurn: setImmediate });
```

### Outbound 'data' Events emitted by ObserveStream

The ObserveStream emits 'data' events with the following format:


#### ```change``` events

Any time there is a change in the database, a ```change``` event is emitted.
The change is in [changeset](https://github.com/eugeneware/changeset) object
diff format. For example:

``` js
{ change: [
    { type: 'put', key: ['name'], value: 'Eugene' },
    { type: 'put', key: ['number'], value: 42 },
    { type: 'del', key: ['old'] } ] }
```

### Inbound events consumed by ObserveStream to change database values

#### Initial ```value``` events

The very first event that the LivelyStream fires will be the ```value``` event.
The ObserveStream processes this event, and expects it, to set the initial
value of the monitored object.

For example, if the initial value in the database is ```my value``` then the
first event emitted would be:

``` js
{ value: 'my value' }
```

#### ```change``` events

When piped from a stream such as
[ObserveStream](https://github.com/eugeneware/observestream), the inbound
stream can write events that can modify the underlying database values pointed
to by the ```key```.

The format of these events is the same as the ```change``` event listed above.

Eg:

``` js
{ change: [
    { type: 'put', key: ['name'], value: 'Eugene' },
    { type: 'put', key: ['number'], value: 42 },
    { type: 'del', key: ['old'] } ] }
```
