export const nothing = 0;

export const MpTypeDef: {[name: string]: new() => any} = {};

export function MPType(cls: new() => any) {
    MpTypeDef[cls.name] = cls;
}
