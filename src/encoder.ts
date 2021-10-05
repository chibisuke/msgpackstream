import { BufferBuilder } from "./BufferBuilder";
import { BufferEncoder } from "./BufferEncoder";
import { EXTTYPE_STREAM, PacketOptions } from "./constants";
import { StatsCollector } from "./statsCollector";

export interface MsgPackEncoderOptions {
    /**
     * Enable encodings/deduplication of keys for stream encoding
     */
    EnableStreamTable?: boolean,
    PermitPredefinedObjects?: boolean,
    PageSize?: number
    /* TODO:
        EnablePacketTable?: boolean,
        StatsCollector?: StatsCollector,
        InitialStreamTable: (number|string)[] 
    */
}


export class MsgPackEncoder {

    private StreamTable = [];

    /* Working memory */
    private StreamTableAddition = [];
    private PacketTableAddition = [];
    private packet: BufferEncoder;
    private header: BufferEncoder;



    /**
     * if string deduplication for stream encoding is enabled
     */
    public get StreamTableActive() {
        return this.options.EnableStreamTable !== false;
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


    constructor(private options: MsgPackEncoderOptions) {
        this.packet = new BufferEncoder(options.PageSize ?? 4096);
        this.header = new BufferEncoder(options.PageSize ?? 4096);
    }

    encodeStream(data: any) {
        //let options = 0;
        //this.StreamTableAddition = [];
        //this.PacketTableAddition = [];
        this.packet.cursor = 0;
        //this.header.cursor = 0;

        this.encodeElement(data);
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
        } else if(data instanceof ArrayBuffer) {
            this.packet.encodeBin(new Uint8Array(data));
        } else if(ArrayBuffer.isView(data)) {
            const b = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
            this.packet.encodeBin(b);
        } else if(data instanceof Date) {
            this.packet.encodeExtDate(data);
        } else {
            if(typeof data.toJSON === 'function')
                data = data.toJSON();
            // Map
            const entries = Object.entries(data).filter(([k,x]) => x !== undefined && typeof x !== 'function');
            this.packet.encodeMapHeader(entries.length);
            for(const [key, value] of entries) {
                this.packet.encodeString(key);
                this.encodeElement(value);
            }

        }
        
    }
}