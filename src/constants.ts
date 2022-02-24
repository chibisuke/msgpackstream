export const NOCONST = false;

export const EXTTYPE_PACKING = 42;
export const EXTTYPE_STREAM = 43;
export const HEADEROFFSET = 15;

/* [flags - 7 bit max!] */
export const enum PacketOptions {
    HasStreamTable = 1,
    HasPacketTable = 2,
    HasEncodedValues = 4,
};