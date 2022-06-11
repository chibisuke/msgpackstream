import { BufferBuilder } from "./BufferBuilder";
import { BufferEncoder } from "./BufferEncoder";
import { EXTTYPE_STREAM, HEADEROFFSET as HEADERRESERVE, PacketOptions } from "./constants";
import { MpTypeDef } from "./decorators";
import { StatsCollector } from "./statsCollector";

export interface MsgPackEncoderOptions {
    /**
     * Enable encodings/deduplication of keys for stream encoding
     */
    EnableStreamTable?: boolean,
    EnablePacketTable?: boolean,
    EnableTypeHints?: boolean,
    PermitPredefinedObjects?: boolean,
    PageSize?: number,
    InitialStreamTable?: string[],
    InitialStreamTableSize?: number
    /* TODO:
        StatsCollector?: StatsCollector,
        InitialStreamTable: (number|string)[] 
    */
}


export class MsgPackEncoder {

    private StreamTableValue: string[] = [];
    private StreamTableIndex = new Map<string, number>();

    private packet: BufferEncoder;



    /**
     * if string deduplication for stream encoding is enabled
     */
    public get StreamTableActive() {
        return this.options.EnableStreamTable !== false;
    }

    public get PacketTableActive() {
        return this.options.EnablePacketTable === true;
    }

    public get PredefinedObjectsActive() {
        return this.options.PermitPredefinedObjects !== false;
    }

    public get PageSize() {
        return this.options.PageSize ?? 1024;
    }

    public get EncodeValues() {
        return false;
    }

    public get UseTypeHints() {
        return this.options.EnableTypeHints !== false;
    }


    constructor(private options: MsgPackEncoderOptions) {
        this.packet = new BufferEncoder(options.PageSize ?? 4096);
        if(options.InitialStreamTable) {
            if(options.InitialStreamTableSize)
                this.StreamTableValue.push(...options.InitialStreamTable.slice(0, options.InitialStreamTableSize));
            else
                this.StreamTableValue.push(...options.InitialStreamTable);
            this.StreamTableValue.forEach(([v, k]) => {
                this.StreamTableIndex.set(v, +k);
            });
        }
        
    }

    encodeStream(data: any, copyOutputBuffer = false) {
        let options = 0;
        const STStart = this.StreamTableValue.length;
        if(this.StreamTableActive || this.PacketTableActive)
            this.packet.cursor = this.packet.startOffset = HEADERRESERVE;
        else 
            this.packet.cursor = 0;
        
        this.encodeElement(data);
        if(this.StreamTableActive || this.PacketTableActive) {
            const STend = this.StreamTableValue.length;
            if(STStart !== STend) {
                options |= PacketOptions.HasStreamTable;
            }
            const payload = this.packet.cursor - this.packet.startOffset;


            // TODO: need packet table? 
            
            
            if(options & PacketOptions.HasStreamTable) {
                this.packet.encodeArrayHeader(STend - STStart);
                for(let i = STStart; i < STend; i++) {
                    this.packet.encodeString(this.StreamTableValue[i]);
                }
            }
            // TODO: write packet table
            this.packet.prependUint(payload);
            this.packet.prependOne(options & 0x7f);
            this.packet.prependExtHeader(EXTTYPE_STREAM, this.packet.cursor - this.packet.startOffset);
        }
        if(copyOutputBuffer)
            return Uint8Array.from(this.packet.result());
        return this.packet.result();
    }

    private encodeElement(data: any) {
        switch(typeof data) {
            case 'string':
                return this.packet.encodeString(data);
            case 'number': 
                return this.packet.encodeNumber(data);
            case 'boolean':
                return this.packet.encodeBoolean(data);
            case 'object':
                return this.encodeObject(data);
            case 'undefined':
            case 'function':
                return this.packet.encodeNil();
            default:
                throw new Error('unknow object type ' + typeof data);
        }
    }

    private encodeObject(data: any) {
        if(data === null)
            this.packet.encodeNil();
        else if(Array.isArray(data)) {
            this.packet.encodeArrayHeader(data.length);
            for(const e of data) {
                this.encodeElement(e);
            }
        } else if(data?.constructor?.name === 'ArrayBuffer') {
            this.packet.encodeBin(new Uint8Array(data));
        } else if(ArrayBuffer.isView(data)) {
            const b = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
            this.packet.encodeBin(b);
        } else if(data.constructor.name === 'Date') {
            this.packet.encodeExtDate(data);
        } else if(data.constructor.name === 'Moment') {
            this.packet.encodeExtDate(data.toDate());
        } else {
            const typeHint = (this.UseTypeHints && MpTypeDef[data?.constructor?.name]) ? data?.constructor?.name : null;
            if(typeof data.toJSON === 'function')
                data = data.toJSON();
            if(typeHint)
                data['$type'] = typeHint;
            // Map
            const entries = Object.entries(data).filter(([k,x]) => x !== undefined && typeof x !== 'function');
            this.packet.encodeMapHeader(entries.length);
            for(const [key, value] of entries) {
                if(this.encodeAsTable(key))
                    this.encodeTableEntry(key);
                else
                    this.packet.encodeString(key);
                this.encodeElement(value);
            }
        }
    }

    private encodeAsTable(key: string): boolean {
        return this.StreamTableActive || this.PacketTableActive;
    }

    private encodeTableEntry(key: string) {
        let idx = this.StreamTableIndex.get(key);
        if(idx === undefined){
            idx = this.StreamTableValue.length;
            this.StreamTableValue[idx] = key;
            this.StreamTableIndex.set(key, idx);
        }
        this.packet.encodeNumber(idx);
    }
}