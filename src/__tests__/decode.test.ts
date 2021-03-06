import { MsgPackEncoder, MsgPackDecoder  } from "..";
import { simple, simple_result } from "./testdata";
const data = require("../../benchmarks/data");





test('decode INT', ()  => {

    const mp = new MsgPackEncoder({ EnableStreamTable: false, PermitPredefinedObjects: false });
    const res = mp.encodeStream(5);

    const mpd = new MsgPackDecoder();
    const r = mpd.decodeStream(res);
    expect(r).toBe(5);
})


test('decode -INT129', ()  => {

    const mp = new MsgPackEncoder({ EnableStreamTable: false, PermitPredefinedObjects: false });
    const res = mp.encodeStream(-129);

    const mpd = new MsgPackDecoder();
    const r = mpd.decodeStream(res);
    expect(r).toBe(-129);
})

test('decode FLOAT', ()  => {
    const mp = new MsgPackEncoder({ EnableStreamTable: false, PermitPredefinedObjects: false });
    const res = mp.encodeStream(5.2);
    const mpd = new MsgPackDecoder();
    const r = mpd.decodeStream(res);
    expect(r).toBe(5.2);
})


test('Simple decoding', () => {
    const mp = new MsgPackEncoder({ EnableStreamTable: false, PermitPredefinedObjects: false });
    const res = mp.encodeStream(simple);
    const mpd = new MsgPackDecoder();
    const r = mpd.decodeStream(res);
    expect(r).toStrictEqual(simple_result);
});

test('benchtable data "tiny"', () => {
    const mp = new MsgPackEncoder({ EnableStreamTable: false, PermitPredefinedObjects: false });
    const res = mp.encodeStream(data.tiny);
    const mpd = new MsgPackDecoder();
    const r = mpd.decodeStream(res);
    expect(r).toStrictEqual(data.tiny);
})

test('benchtable data "small"', () => {
    const mp = new MsgPackEncoder({ EnableStreamTable: false, PermitPredefinedObjects: false });
    const res = mp.encodeStream(data.small);
    const mpd = new MsgPackDecoder();
    const r = mpd.decodeStream(res);
    expect(r).toStrictEqual(data.small);
})
/*
test('benchtable data "medium"', () => {
    const mp = new MsgPackEncoder({ EnableStreamTable: false, PermitPredefinedObjects: false });
    const res = mp.encodeStream(data.medium);
    const mpd = new MsgPackDecoder();
    const r = mpd.decodeStream(res);
    expect(r).toStrictEqual(data.medium);
})
*/

test('bug - ', () => {
    const d = JSON.parse('[{"longi":6.12,"latitude":1.12,"country":"Deutschlaxnx","city":"Krefeld","AAAAA":"ABCDEFGHIJKLMNOPQR"},{"longi":6.566153117047705,"latitude":51.28853345,"country":"Deutschland","city":"Krefeld","postalCode":"47807","AAAAA":"Nordrhein-Westfalen"},{"longi":6.5679506,"latitude":51.2890211,"country":"Deutschland","city":"Krefeld","postalCode":"47807","AAAAA":"Nordrhein-Westfalen"}]');
    const mp = new MsgPackEncoder({});
    const res = mp.encodeStream(d);
    const mpd = new MsgPackDecoder();
    const r = mpd.decodeStream(res);
    expect(r).toStrictEqual(d);
})
/*
test('benchtable data "large"', () => {
    const mp = new MsgPackEncoder({ EnableStreamTable: false, PermitPredefinedObjects: false });
    const res = mp.encodeStream(data.large);
    const r = msgpack.decode(res);
    expect(r).toStrictEqual(data.large);
})
*/