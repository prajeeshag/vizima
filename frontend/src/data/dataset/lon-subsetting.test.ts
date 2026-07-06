
import { expect, test, describe } from "bun:test";
import { lonSubsetIndices } from './lon-subsetting';

describe("lonSubsetIndices", () => {
    test("returns a simple subset on a 0-360 grid", () => {
        expect(lonSubsetIndices(0, 359, 360, 20, 40)).toEqual([
            { start: 20, end: 40 },
        ]);
    });

    test("returns a simple decimal subset on a 0-360 grid", () => {
        expect(lonSubsetIndices(0, 359, 360, 20.5, 40.5)).toEqual([
            { start: 20, end: 41 },
        ]);
    });

    test("returns a simple decimal subset on a 0-360 grid crossing 180", () => {
        expect(lonSubsetIndices(0, 359, 360, 20.5, 210.3)).toEqual([
            { start: 20, end: 211 },
        ]);
    });

    test("accepts -180..180 subset on a 0-360 grid", () => {
        expect(lonSubsetIndices(0, 359, 360, -10.2, 10.5)).toEqual([
            { start: 349, end: 359 },
            { start: 0, end: 11 },
        ]);
    });

    test("accepts negative subset on a 0-360 grid", () => {
        expect(lonSubsetIndices(0, 359, 360, -45, -2)).toEqual([
            { start: 315, end: 358 },
        ]);
    });


    test("accepts 0..360 subset on a -180..180 grid", () => {
        expect(lonSubsetIndices(-180, 179, 360, 10.5, 30.5)).toEqual([
            { start: 190, end: 211 },
        ]);
    });

    test("handles wrapped subset on a -180..180 grid", () => {
        expect(lonSubsetIndices(-180, 179, 360, -170.0, 170.2)).toEqual([
            { start: 10, end: 351 },
        ]);
    });

    test("handles -180-180 subset on a -180..180 grid", () => {
        expect(lonSubsetIndices(-180, 179, 360, -180.0, 180.0)).toEqual([
            { start: 0, end: 359 }, { start: 0, end: 0 }
        ]);
    });

    test("handles 0-359 subset on a -180..179 grid", () => {
        expect(lonSubsetIndices(-180, 179, 360, 0.0, 350.0)).toEqual([
            { start: 180, end: 359 }, { start: 0, end: 170 }
        ]);
    });

    test("handles 0-359.5 subset on a -180..179@0.5 grid", () => {
        expect(lonSubsetIndices(-180, 179.5, 720, 0.0, 359.5)).toEqual([
            { start: 360, end: 719 }, { start: 0, end: 359 }
        ]);
    });

    test("handles -180-179 subset on a 0..359 grid", () => {
        expect(lonSubsetIndices(0, 359, 360, -180.0, 179.0)).toEqual([
            { start: 180, end: 359 }, { start: 0, end: 179 }
        ]);
    });

    test("handles -180-179.5 subset on a 0..359@0.5 grid", () => {
        expect(lonSubsetIndices(0, 359.5, 720, -180.0, 179.5)).toEqual([
            { start: 360, end: 719 }, { start: 0, end: 359 }
        ]);
    });

    test("handles -180-179.75 subset on a 0..359@0.5 grid", () => {
        expect(lonSubsetIndices(0, 359.5, 720, -180.0, 179.75)).toEqual([
            { start: 360, end: 719 }, { start: 0, end: 360 }
        ]);
    });

    test("handles -180-179.75 subset on a 0..359@8 grid", () => {
        expect(lonSubsetIndices(0, 352, 45, -180.0, 179.75)).toEqual([
            { start: 22, end: 44 }, { start: 0, end: 23 }
        ]);
    });

    test("handles -180-179.75 subset on a 0..359@8.71670702 grid", () => {
        expect(lonSubsetIndices(0, 357.38498789, 42, -180.0, 179.75)).toEqual([
            { start: 20, end: 41 }, { start: 0, end: 21 }
        ]);
    });

    test("handles 0-359 subset on a -180..180@8.63309353 grid", () => {
        expect(lonSubsetIndices(-180, 173.95683453, 42, 0.0, 359.75)).toEqual([
            { start: 20, end: 41 }, { start: 0, end: 21 }
        ]);
    });

    test("returns the whole grid", () => {
        expect(lonSubsetIndices(0, 359, 360, 0, 359)).toEqual([
            { start: 0, end: 359 },
        ]);
    });

    test("returns a single longitude", () => {
        expect(lonSubsetIndices(0, 359, 360, 42, 42)).toEqual([
            { start: 42, end: 42 },
        ]);
    });

    test("works for a coarse grid", () => {
        expect(lonSubsetIndices(0, 270, 4, 90, 180)).toEqual([
            { start: 1, end: 2 },
        ]);
    });


    test("handles subset crossing the prime meridian", () => {
        expect(lonSubsetIndices(-180, 179, 360, -10, 10)).toEqual([
            { start: 170, end: 190 },
        ]);
    });

    test("subset on non-global grid0", () => {
        expect(lonSubsetIndices(0, 179, 180, 0, 10)).toEqual([
            { start: 0, end: 10 },
        ]);
    });

    test("empty on non-global grid0 with invalid range", () => {
        expect(lonSubsetIndices(0, 179, 180, 0, 180)).toEqual([]);
    });

    test("subset on non-global grid 1", () => {
        expect(lonSubsetIndices(180, 359, 180, 190, 210)).toEqual([
            { start: 10, end: 30 },
        ]);
    });

    test("-ve subset on non-global grid 1", () => {
        expect(lonSubsetIndices(190, 359, 170, -170, -150)).toEqual([
            { start: 0, end: 20 },
        ]);
    });

    test("empty on non-global grid1 with invalid range", () => {
        expect(lonSubsetIndices(180, 359, 180, 0, 10)).toEqual([]);
    });

    test("subset on non-global grid 2", () => {
        expect(lonSubsetIndices(-180, -1, 180, -180, -160)).toEqual([
            { start: 0, end: 20 },
        ]);
    });

    test("+ve subset on non-global grid 2", () => {
        expect(lonSubsetIndices(-180, -1, 180, 350, 359)).toEqual([
            { start: 170, end: 179 },
        ]);
    });

});