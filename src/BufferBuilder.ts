export class BufferBuilder {
    protected buffer = new ArrayBuffer(0);
    protected bufferView = new Uint8Array(this.buffer);
    public cursor = 0;
    public startOffset = 0;

    get length() {
        return this.cursor;
    }

    constructor(private pageSize: number = 4096) {
    }

    result() {
        return this.bufferView.subarray(this.startOffset, this.cursor);
    }

    checkAvailableSize(size: number) {
        size = size | 0;
        if((size + this.cursor) >= this.buffer.byteLength) {
            const s = Math.ceil(~~(size + this.cursor) / this.pageSize) * this.pageSize;
            const b = this.buffer;
            const bv = this.bufferView;
            this.buffer = new ArrayBuffer(s);
            this.bufferView = new Uint8Array(this.buffer);
            this.bufferView.set(bv);
        }
    }

    appendBuffer(value: Uint8Array, length?: number): void;
    appendBuffer<T extends this>(value: T): void;
    appendBuffer(value: Uint8Array|this, length: number = value.length) {
        if(value instanceof Uint8Array) {
            if(length !== value.length)
                value = value.subarray(0, length);
                //value = new Uint8Array(value.buffer, value.byteOffset, length);
            this.checkAvailableSize(value.length);
            this.bufferView.set(value, this.cursor);
            this.cursor += value.length;
            return; 
        }
        return this.appendBuffer(this.bufferView, this.cursor);
    }

    prependBuffer(value: Uint8Array, length: number = value.length) {
      this.bufferView.set(value.subarray(0, length), this.startOffset -= length);
    }
    
    appendOne(value: number) {
      this.checkAvailableSize(1);
      this.bufferView[this.cursor++] = value;
    }

    prependOne(value: number) {
      this.bufferView[--this.startOffset] = value;
    }

    protected utf8Length(str: string) {
        let c = 0;
        let length = 0;
        for (let i = 0, l = str.length; i < l; i++) {
          c = str.charCodeAt(i);
          if (c < 0x80) {
            length += 1;
          } else if (c < 0x800) {
            length += 2;
          } else if (c < 0xd800 || c >= 0xe000) {
            length += 3;
          } else {
            i++;
            length += 4;
          }
        }
        return length;
      }

    protected utf8Write(str: string): number {
        let c = 0;
        let cu = this.cursor ;
        const bv = this.bufferView ;
        for (let i = 0, l = str.length; i < l; i++) {
          c = str.charCodeAt(i);
          if (c < 0x80) {
            bv[cu++] = c;
          } else if (c < 0x800) {
            bv[cu++] = 0xc0 | (c >> 6);
            bv[cu++] = 0x80 | (c & 0x3f);
          } else if (c < 0xd800 || c >= 0xe000) {
            bv[cu++] = 0xe0 | (c >> 12);
            bv[cu++] = 0x80 | (c >> 6) & 0x3f;
            bv[cu++] = 0x80 | (c & 0x3f);
          } else {
            i++;
            c = 0x10000 + (((c & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
            bv[cu++] = 0xf0 | (c >> 18);
            bv[cu++] = 0x80 | (c >> 12) & 0x3f;
            bv[cu++] = 0x80 | (c >> 6) & 0x3f;
            bv[cu++] = 0x80 | (c & 0x3f);
          }
        }
        const len = cu - this.cursor;
        this.cursor = cu;
        return len;
    }

}