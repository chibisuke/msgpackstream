import { EXTTYPE_STREAM, PacketOptions } from "./constants";
import { MpTypeDef } from "./decorators";
import moment from 'moment';

export class MsgPackDecoder {

    public binaryAsArrayBuffer = false;
    public decodeTypes = true;
    public dateAsMoment = true;

    private buffer!: Uint8Array;
    private bufferView!: DataView;
    private cursor = 0 ;

    private options = 0;
    private streamTable: string[] = [];
    private packetTable: string[] = [];

    private isTableEntry = false;
    private isInStreamExt = false;

    private static undef:any = undefined;

    private static decoders: {[id: number]: (t: MsgPackDecoder, ...args:any[]) => any} = {
        [this.undef]: (t) => { throw new Error('decoding beyond end of dataPacket') },
        0xc0: (t) => null,
        0xc1: (t) => { throw new Error('invalid opcode 0xc1') },
        0xc2: (t) => false,
        0xc3: (t) => true,
        0xc4: (t) => t.decodeBin(t.bufferView.getUint8(t.cursor++)),
        0xc5: (t) => t.decodeBin(t.bufferView.getUint16((t.cursor+=2) - 2)),
        0xc6: (t) => t.decodeBin(t.bufferView.getUint32((t.cursor+=4) - 4)),
        0xc7: (t) => t.decodeExt(t.bufferView.getUint8(t.cursor++), t.bufferView.getUint8(t.cursor++)),
        0xc8: (t) => t.decodeExt(t.bufferView.getUint16((t.cursor+=2) - 2), t.bufferView.getUint8(t.cursor++)),
        0xc9: (t) => t.decodeExt(t.bufferView.getUint32((t.cursor+=4) - 4), t.bufferView.getUint8(t.cursor++)),
        0xca: (t) => t.bufferView.getFloat32((t.cursor += 4 )- 4),
        0xcb: (t) => t.bufferView.getFloat64((t.cursor += 8 )- 8),
        0xcc: (t) => t.getTableEntry(t.bufferView.getUint8(t.cursor++)),
        0xcd: (t) => t.getTableEntry(t.bufferView.getUint16((t.cursor+=2) - 2)),
        0xce: (t) => t.getTableEntry(t.bufferView.getUint32((t.cursor+=4) - 4)),
        0xcf: (t) => Number(t.bufferView.getBigUint64((t.cursor += 8 ) - 8)),
        0xd0: (t) => t.bufferView.getInt8(t.cursor++),
        0xd1: (t) => t.bufferView.getInt16((t.cursor+=2) - 2),
        0xd2: (t) => t.bufferView.getInt32((t.cursor+=4) - 4),
        0xd3: (t) => Number(t.bufferView.getBigInt64((t.cursor+=8) - 8)),
        0xd9: (t) => t.decodeString(t.bufferView.getUint8(t.cursor++)),
        0xda: (t) => t.decodeString(t.bufferView.getUint16((t.cursor+=2) - 2)),
        0xdb: (t) => t.decodeString(t.bufferView.getUint32((t.cursor+=4) - 4)),
        0xdc: (t) => t.decodeArray(t.bufferView.getUint16((t.cursor+=2) - 2)),
        0xdd: (t) => t.decodeArray(t.bufferView.getUint32((t.cursor+=4) - 4)),
        0xde: (t) => t.decodeMap(t.bufferView.getUint16((t.cursor+=2) - 2)),
        0xdf: (t) => t.decodeMap(t.bufferView.getUint32((t.cursor+=4) - 4)),
    }

    private static ext: {[id: number]: (t: MsgPackDecoder, ...args:any[]) => any} = {
        [this.undef]: (t, len, type) => { throw new Error('ExtType ' + type + ' unknown') },
        0xff: (t, len) => t.decodeExtDate(len),
        [EXTTYPE_STREAM]: (t, len, type) => t.decodeStreamExt(len),
    }

    static {
        // positive fixint
        for(let i = 0; i <= 0x7f; i++)
            MsgPackDecoder.decoders[i] = (t) => t.getTableEntry(i);
        // negative fixint
        for(let i = 0; i <= 0x1F; i++) 
            MsgPackDecoder.decoders[i | 0xe0] = () => -32 + i;
        // Decode FixMap 
        for(let i = 0; i <= 15; i++)
            MsgPackDecoder.decoders[i | 0x80] = (t) => t.decodeMap(i);
        // decode FixArray
        for(let i = 0; i <= 15; i++)
            MsgPackDecoder.decoders[i | 0x90] = (t) => t.decodeArray(i);
        // decode FixString
        for(let i = 0; i <= 31; i++)
            MsgPackDecoder.decoders[i | 0xa0] = (t) => t.decodeString(i);
        // decode fixext
        for(let i = 0; i <= 4; i++) 
            MsgPackDecoder.decoders[i + 0xd4] = (t) => t.decodeExt(2**i, t.bufferView.getUint8(t.cursor++));
    }

    private utf8Read(view: DataView, offset:number, length:number) {
        let string = '';
        let chr = 0;
        for (let i = offset, end = offset + length; i < end; i++) {
          const byte = view.getUint8(i);
          if ((byte & 0x80) === 0x00) {
            string += String.fromCharCode(byte);
            continue;
          }
          if ((byte & 0xe0) === 0xc0) {
            string += String.fromCharCode(
              ((byte & 0x1f) << 6) |
              (view.getUint8(++i) & 0x3f)
            );
            continue;
          }
          if ((byte & 0xf0) === 0xe0) {
            string += String.fromCharCode(
              ((byte & 0x0f) << 12) |
              ((view.getUint8(++i) & 0x3f) << 6) |
              ((view.getUint8(++i) & 0x3f) << 0)
            );
            continue;
          }
          if ((byte & 0xf8) === 0xf0) {
            chr = ((byte & 0x07) << 18) |
              ((view.getUint8(++i) & 0x3f) << 12) |
              ((view.getUint8(++i) & 0x3f) << 6) |
              ((view.getUint8(++i) & 0x3f) << 0);
            if (chr >= 0x010000) { // surrogate pair
              chr -= 0x010000;
              string += String.fromCharCode((chr >>> 10) + 0xD800, (chr & 0x3FF) + 0xDC00);
            } else {
              string += String.fromCharCode(chr);
            }
            continue;
          }
          throw new Error('Invalid byte ' + byte.toString(16));
        }
        return string;
    }


    constructor(InitialPacketTable?: string[]) {
        if(InitialPacketTable)
            this.streamTable.push(...InitialPacketTable);
    }

    decodeNext() {
        return MsgPackDecoder.decoders[this.buffer[this.cursor++]](this);
    }

    decodeStream(data: Uint8Array) {
        this.buffer = data;
        this.bufferView = new DataView(data.buffer, data.byteOffset, data.byteLength);
        this.cursor = 0;

        return this.decodeNext();
    }

    createObjectInstance(type: new() => any, data: any) {
        delete data['$type'];
        const r =  Object.assign(Object.create(type.prototype), data);
        return r;
    }

    decodeMap(len: number) {
        const r:any = {};
        for(let i = 0; i < len; i++) {
            this.isTableEntry = true;
            const key = this.decodeNext();
            this.isTableEntry = false;
            r[key] = this.decodeNext();
        }
        if(this.decodeTypes && r['$type'] !== undefined && MpTypeDef[r['$type']]) {
            return this.createObjectInstance(MpTypeDef[r['$type']], r);
        }
        return r;
    }
    decodeArray(len: number) {
        const r = [];
        for(let i = 0; i < len; i++) {
            r.push(this.decodeNext());
        }
        return r;
    }
    decodeString(len: number) {
        this.cursor += len;
        return this.utf8Read(this.bufferView, this.cursor - len, len); 
    }
    decodeExt(len: number, type: number) {
        if(MsgPackDecoder.ext[type]) {
            const r = MsgPackDecoder.ext[type](this,  len, type);
            return r;
        }
        this.cursor += len;
        return undefined;
    }
    decodeBin(len: number) {
        let b = new Uint8Array(this.buffer.buffer, this.buffer.byteOffset + this.cursor, len);
        this.cursor += len;
        if(this.binaryAsArrayBuffer)
            return b.buffer.slice(b.byteOffset, b.byteLength + b.byteOffset);
        return b;
    }

    makeDate(ts: number) {
        if(!this.dateAsMoment)
            return new Date(ts*1000);
        else
            return moment(new Date(ts*1000))
    }

    decodeExtDate(len: number) {
        if(len === 4) {
            const ts = this.bufferView.getUint32(this.cursor);
            this.cursor += len;
            return this.makeDate(ts);
        } else if (len === 8) {
            const hi = this.bufferView.getUint32(this.cursor);
            const lo = this.bufferView.getUint32(this.cursor + 4);
            const nsec = hi >>> 2;
            const sec = (hi & 0x03) << 32 | lo;
            const ts = sec + (nsec / 1e9);
            this.cursor += len;
            return this.makeDate(ts);
        } else {
            const nsec = this.bufferView.getUint32(this.cursor);
            const sec = Number(this.bufferView.getBigUint64(this.cursor + 4));
            const ts = sec + (nsec / 1e9);
            this.cursor += len;
            return this.makeDate(ts);
        }
    }

    decodeStreamExt(len: number) {
        const curEnd = this.cursor + len;
        this.options = +this.decodeNext();
        if(Number.isNaN(this.options))
            throw new Error('Invalid option packet');
        const payloadLen = this.decodeNext();
        const payloadStart = this.cursor;
        this.cursor += payloadLen;
        if(this.options & PacketOptions.HasStreamTable) {
            const streamTable = this.decodeNext();
            if(!Array.isArray(streamTable)) {
                throw new Error('StreamTable is not an array');
            }
            this.streamTable.push(...streamTable);
        } 
        if(this.options & PacketOptions.HasPacketTable) {
            this.packetTable = this.decodeNext();
            if(!Array.isArray(this.packetTable))
                throw new Error('PacketTable is not an array');
        }
        this.cursor = payloadStart;
        this.isInStreamExt = true;
        const payload = this.decodeNext();
        this.isInStreamExt = false;
        this.cursor = curEnd;
        return payload;
    }

    getTableEntry(id: number) {
        if(this.isTableEntry && this.isInStreamExt) {
            if(id >= 0) {
                if(this.streamTable[id])
                    return this.streamTable[id];
            } else {
                if((this.options & PacketOptions.HasPacketTable) && this.packetTable[1-id])
                    return this.packetTable[1-id];
            }
        }
        return id;
    }
}