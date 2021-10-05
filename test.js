const { MsgPackEncoder, MsgPackDecoder } = require('./lib');

const simple = require('./lib/__tests__/testdata').simple;

const mp = new MsgPackEncoder({ EnableStreamTable: false, PermitPredefinedObjects: false });
const res = mp.encodeStream(simple);

console.log(simple, res);
const mpd = new MsgPackDecoder({});
const r = mpd.decodeStream(res);

console.dir([simple, r], { depth: 10 });