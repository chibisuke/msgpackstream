import { BufferBuilder } from "./BufferBuilder";

export class BufferEncoder extends BufferBuilder {

    private b = new ArrayBuffer(20);
    private scratch = new Uint8Array(this.b);
    private scratchDataView = new DataView(this.b);


    public encodeBoolean(data: boolean) {
        if(data)
            this.appendOne(0xc3);
        else
            this.appendOne(0xc2);
    }

    public encodeNil() {
        this.appendOne(0xc0);
    }

    public encodeNumber(data: number) {
        if(Number.isInteger(data))
            return this.encodeInt(data);
        else {
            this.scratch[0] = 0xcb;
            this.scratchDataView.setFloat64(1, data);
            this.appendBuffer(this.scratch, 9);
        }
    }

    public encodeString(data: string) {
        const len = this.utf8Length(data);
        this.checkAvailableSize(len + 5);
        if(len < 32) {
            this.appendOne(0xa0 | len);
        } else if(len < 0x100) {
            this.appendOne(0xd9);
            this.appendOne(len);
        } else if(len < 0x10000) {
            this.scratch[0] = 0xda;
            this.scratchDataView.setUint16(1, len);
            this.appendBuffer(this.scratch, 3);
        } else {
            this.scratch[0] = 0xdb;
            this.scratchDataView.setUint32(1, len);
            this.appendBuffer(this.scratch, 5);
        }
        this.utf8Write(data);
    }

    public encodeArrayHeader(size: number) {
        if(size < 0x10) {
            this.appendOne(0x90 | size);
        } else if(size < 0x10000) {
            this.scratch[0] = 0xdc;
            this.scratchDataView.setUint16(1, size);
            this.appendBuffer(this.scratch, 3);
        } else {
            this.scratch[0] = 0xdd;
            this.scratchDataView.setUint32(1, size);
            this.appendBuffer(this.scratch, 5);
        }
    }

    public encodeBin(data: Uint8Array) {
        if(data.length < 0x100) {
            this.appendOne(0xc4);
            this.appendOne(data.length);
        } else if(data.length < 0x10000) {
            this.scratch[0] = 0xc5;
            this.scratchDataView.setUint16(1, data.length);
            this.appendBuffer(this.scratch, 3);
        } else {
            this.scratch[0] = 0xc6;
            this.scratchDataView.setUint32(1, data.length);
            this.appendBuffer(this.scratch, 5);
        }
        this.appendBuffer(data);
    }

    public encodeMapHeader(size: number) {
        if(size < 16) {
            this.appendOne(0x80 | size);
        } else if(size < 0x10000) {
            this.scratch[0] = 0xde;
            this.scratchDataView.setUint16(1, size);
            this.appendBuffer(this.scratch, 3);
        } else {
            this.scratch[0] = 0xdf;
            this.scratchDataView.setUint32(1, size);
            this.appendBuffer(this.scratch, 5);
        }
    }

    public prependExtHeader(type: number, size: number) {
        const fixext: {[key: number]: number} = {
            1: 0xd4,
            2: 0xd5,
            4: 0xd6,
            8: 0xd7,
           16: 0xd8
        };
        if(fixext[size]) {
            this.prependOne(type);
            this.prependOne(fixext[size]);            
        } else if(size < 0x100) {
            this.prependOne(type);
            this.prependOne(size);
            this.prependOne(0xc7);
        } else if(size < 0x10000) {
            this.scratch[0] = 0xc8;
            this.scratchDataView.setUint16(1, size);
            this.scratch[3] = type;
            this.prependBuffer(this.scratch, 4)
        } else {
            this.scratch[0] = 0xc9;
            this.scratchDataView.setUint32(1, size);
            this.scratch[5] = type;
            this.prependBuffer(this.scratch, 6);
        }
    }

    public encodeExtHeader(type: number, size: number) {
        const fixext: {[key: number]: number} = {
            1: 0xd4,
            2: 0xd5,
            4: 0xd6,
            8: 0xd7,
           16: 0xd8
        };
        if(fixext[size]) {
            this.appendOne(fixext[size]);            
            this.appendOne(type);
        } else if(size < 0x100) {
            this.appendOne(0xc7);
            this.appendOne(size);
            this.appendOne(type);
        } else if(size < 0x10000) {
            this.scratch[0] = 0xc8;
            this.scratchDataView.setUint16(1, size);
            this.scratch[3] = type;
            this.appendBuffer(this.scratch, 4)
        } else {
            this.scratch[0] = 0xc9;
            this.scratchDataView.setUint32(1, size);
            this.scratch[5] = type;
            this.appendBuffer(this.scratch, 6);
        }
    }

    public encodeExtDate(date: Date) {
        const t = date.getTime();

        let sec = t / 1000 >>> 0;
        let nsec = (t % 1000) * 1e6;

        if(nsec === 0 && sec < 0x100000000) {
            this.encodeExtHeader(-1, 4);
            this.scratchDataView.setUint32(0, sec);
            this.appendBuffer(this.scratch, 4);
        } else if(sec < 0x400000000) {
            this.encodeExtHeader(-1, 8);
            const secHi = (sec / 0x100000000) >> 0;
            const secLo = sec & 0xffffffff;
            this.scratchDataView.setUint32(0, (nsec << 2) | (secHi & 0x3));
            this.scratchDataView.setUint32(4, secLo);
            this.appendBuffer(this.scratch, 8);
        } else {
            this.encodeExtHeader(-1, 12);
            this.scratchDataView.setUint32(0, nsec);
            this.scratchDataView.setBigInt64(4, BigInt(sec));
            this.appendBuffer(this.scratch, 12);
        }
        
    }

    public prependUint(data: number) {
        if(data < 0x80) {
            this.prependOne(data);
        } else if(data < 0x100) {
            this.prependOne(data);
            this.prependOne(0xcc);
        } else if(data < 0x10000) {
            this.scratch[0] = 0xcd;
            this.scratchDataView.setUint16(1, data);
            return this.prependBuffer(this.scratch, 3);
        } else if(data < 0x100000000) {
            this.scratch[0] = 0xce;
            this.scratchDataView.setUint32(1, data)
            return this.prependBuffer(this.scratch, 5);               
        } else {
            this.scratch[0] = 0xcf;
            this.scratchDataView.setBigUint64(1, BigInt(data));
            return this.prependBuffer(this.scratch, 9);        
        }
    }

    private encodeInt(data: number) {
        if(data < 0) { //signed integer
            if (data >= -0x20) {
                this.appendOne(data);
            } else if(data >= -0x80) {
                this.scratch[0] = 0xd0;
                this.scratch[1] = data;
                this.appendBuffer(this.scratch, 2);
            } else if(data >= -0x8000) {
                this.scratch[0] = 0xd1;
                this.scratchDataView.setInt16(1, data);
                return this.appendBuffer(this.scratch, 3);
            } else if(data >= -0x80000000) {
                this.scratch[0] = 0xd2;
                this.scratchDataView.setInt32(1, data);
                return this.appendBuffer(this.scratch, 5);                   
            } else {
                this.scratch[0] = 0xd3;
                this.scratchDataView.setBigInt64(1, BigInt(data));
                return this.appendBuffer(this.scratch, 9);               
            }

        } else { //unsinged integer
            if(data < 0x80) {
                return this.appendOne(data);
            } else if(data < 0x100) {
                this.scratch[0] = 0xcc;
                this.scratch[1] = data;
                return this.appendBuffer(this.scratch, 2);
            } else if(data < 0x10000) {
                this.scratch[0] = 0xcd;
                this.scratchDataView.setUint16(1, data);
                return this.appendBuffer(this.scratch, 3);
            } else if(data < 0x100000000) {
                this.scratch[0] = 0xce;
                this.scratchDataView.setUint32(1, data)
                return this.appendBuffer(this.scratch, 5);               
            } else {
                this.scratch[0] = 0xcf;
                this.scratchDataView.setBigUint64(1, BigInt(data));
                return this.appendBuffer(this.scratch, 9);        
            }
        }
    }
    
}