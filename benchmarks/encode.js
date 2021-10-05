const notepack = require('notepack.io');
const msgpackJs = require('msgpack-js');
const msgpackLite = require('msgpack-lite');
const msgpack = require('@msgpack/msgpack');
const msgpackstream = require('../lib');
const data = require('./data');

const v8 = require('v8');

const Benchtable = require('benchtable');

const suite = new Benchtable;

mps = new msgpackstream.MsgPackEncoder({ EnableStreamTable: false, PermitPredefinedObjects: false, PageSize: 4096 });
mps.encodeStream(5);

suite
.addFunction('msgpackstream', function (x) {
  mps.encodeStream(x);
})
.addFunction('notepack', function (x) {
  notepack.encode(x);
})
.addFunction('msgpack-js', function (x) {
  msgpackJs.encode(x);
})
.addFunction('msgpack-lite', function (x) {
  msgpackLite.encode(x);
})
.addFunction('@msgpack/msgpack', function (x) {
  msgpack.encode(x);
})
// Note: JSON encodes buffers as arrays
.addFunction('JSON.stringify (to Buffer)', function (x) {
  Buffer.from(JSON.stringify(x));
})

.addInput('tiny', [data.tiny])
.addInput('small', [data.small])
.addInput('medium', [data.medium])
.addInput('large', [data.large])

.on('complete', function () {
  console.log(this.table.toString());
})
.run({ async: true });