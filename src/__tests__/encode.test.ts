import { MsgPackEncoder  } from "..";
import { simple, simple_result } from "./testdata";
const data = require("../../benchmarks/data");
const msgpack = require('msgpack5')();





test('encode INT', ()  => {
    const mp = new MsgPackEncoder({ EnableStreamTable: false, PermitPredefinedObjects: false });
    const res = mp.encodeStream(5);
    const r = msgpack.decode(res);
    expect(r).toBe(5);
})

test('encode FLOAT', ()  => {
    const mp = new MsgPackEncoder({ EnableStreamTable: false, PermitPredefinedObjects: false });
    const res = mp.encodeStream(5.2);
    const r = msgpack.decode(res);
    expect(r).toBe(5.2);
})


test('Simple encoding', () => {
    const mp = new MsgPackEncoder({ EnableStreamTable: false, PermitPredefinedObjects: false, encodeUndefinedAsNull: true });
    const res = mp.encodeStream(simple);
    const r = msgpack.decode(res);
    expect(r).toStrictEqual(simple_result);
});

test('benchtable data "tiny"', () => {
    const mp = new MsgPackEncoder({ EnableStreamTable: false, PermitPredefinedObjects: false });
    const res = mp.encodeStream(data.tiny);
    const r = msgpack.decode(res);
    expect(r).toStrictEqual(data.tiny);
})
/*
test('benchtable data "small"', () => {
    const mp = new MsgPackEncoder({ EnableStreamTable: false, PermitPredefinedObjects: false });
    const res = mp.encodeStream(data.small);
    const r = msgpack.decode(res);
    expect(r).toStrictEqual(data.small);
})

test('benchtable data "medium"', () => {
    const mp = new MsgPackEncoder({ EnableStreamTable: false, PermitPredefinedObjects: false });
    const res = mp.encodeStream(data.medium);
    const r = msgpack.decode(res);
    expect(Object.fromEntries(r.entries())).toStrictEqual(data.medium);
})

test('benchtable data "large"', () => {
    const mp = new MsgPackEncoder({ EnableStreamTable: false, PermitPredefinedObjects: false });
    const res = mp.encodeStream(data.large);
    const r = msgpack.decode(res);
    expect(r).toStrictEqual(data.large);
})
*/