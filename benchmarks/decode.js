const notepack = require('notepack.io');
const msgpackJs = require('msgpack-js');
const msgpackLite = require('msgpack-lite');
const msgpack = require('@msgpack/msgpack');
const MsgPackDecoder = require('../lib').MsgPackDecoder;
const data = require('./data');

const dec = new MsgPackDecoder();

const Benchtable = require('benchtable');

const suite = new Benchtable;

suite
.addFunction('msgPackStream', function(m, js, node, json) {
    dec.decodeStream(m);
})
.addFunction('notepack', function (m, js, node, json) {
  notepack.decode(m);
})
.addFunction('msgpack-js', function (m, js, node, json) {
  msgpackJs.decode(js);
})
.addFunction('msgpack-lite', function (m, js, node, json) {
  msgpackLite.decode(m);
})
.addFunction('@msgpack/msgpack', function (m, js, node, json) {
  msgpack.decode(m);
})
// Note: JSON encodes buffers as arrays
.addFunction('JSON.parse (from Buffer)', function (m, js, node, json) {
  JSON.parse(json.toString());
})

.addInput('tiny', [notepack.encode(data.tiny), msgpackJs.encode(data.tiny), msgpackLite.encode(data.tiny), Buffer.from(JSON.stringify(data.tiny))])
.addInput('small', [notepack.encode(data.small), msgpackJs.encode(data.small), msgpackLite.encode(data.small), Buffer.from(JSON.stringify(data.small))])
.addInput('medium', [notepack.encode(data.medium), msgpackJs.encode(data.medium), msgpackLite.encode(data.medium), Buffer.from(JSON.stringify(data.medium))])
.addInput('large', [notepack.encode(data.large), msgpackJs.encode(data.large), msgpackLite.encode(data.large), Buffer.from(JSON.stringify(data.large))])

.on('complete', function () {
  console.log(this.table.toString());
})
.run({ async: true });