debugger;
const TE = require('fastestsmallesttextencoderdecoder').encode;
const performance = require('perf_hooks').performance;
const msgpackstream = require('../lib');
const data = require('./data');

mps = new msgpackstream.MsgPackEncoder({ EnableStreamTable: false, PermitPredefinedObjects: false, PageSize: 4096 });
//mps.encodeStream(5);
const perf = [];


perf.push(performance.now("A"));
for(let j = 0; j < 10; j++) {
    for(let i = 0; i < 1000000; i++) {
        mps.encodeStream(data.tiny);
    }
    perf.push(performance.now("B"));
}


for(let i = 0; i < (perf.length-1); i++) {
    console.log(perf[i], perf[i+1], perf[i+1] - perf[i]);
}