const { MsgPackEncoder, MsgPackDecoder } = require('./lib');

//const simple = require('./lib/__tests__/testdata').simple;

const testdata = {
    auuu: {
        test: 5,
        bla: 7
    },
    baka: {
        test: 9,
        bla: 3
    },
    chu: {
        auuu: "bla",
        chu: "hallo",
        bla: 42,
        test: true,
        12345: 'test'
    }
}

const mp = new MsgPackEncoder({ EnableStreamTable: true, PermitPredefinedObjects: false });
const res = mp.encodeStream(testdata, true);

testdata['fooooo'] = {
    nah: false,
    'määäh': 123123532453523,
    '{}{}': null
}
const res2 = mp.encodeStream(testdata);

console.log(Array.from(res).map(r => r.toString(16)), Array.from(res2).map(r => r.toString(16)));

//console.log(simple, res);
const mpd = new MsgPackDecoder();
const r = mpd.decodeStream(res);
const r2 = mpd.decodeStream(res2);

console.log(testdata, r, r2);

