const d = new Date();

export const simple = {
    7: "test",
    "t": "bla",
    "x": true,
    "y": false,
    "blubb": null,
    "keks": undefined,
    "flo": 1.72,
    "something": [5, 7, "hallo", undefined, true, false, null],
    "blabla": () => true,
    a: 2133472298,
    b: -2133472298,
    d,
    o: { x: 127, y: 128, z: 129 }
};

export const simple_result =
{
    "7": "test",
    "t": "bla",
    "x": true,
    "y": false,
    "blubb": null,
    "flo": 1.72,
    "something": [5, 7, "hallo", null, true, false, null],
    a: 2133472298,
    b: -2133472298,
    d,
    o: { x: 127, y: 128, z: 129 }
};