export type LonSubset = {
    start: number;
    end: number;
};

export function lonSubsetIndices(
    iLonStart: number,
    iLonEnd: number,
    inumLon: number,
    oLonStart: number,
    oLonEnd: number,
): LonSubset[] {
    const res = _lonSubsetIndices(iLonStart, iLonEnd, inumLon, oLonStart, oLonEnd);

    // if there is NaN return Empty
    if (res.some(subset => isNaN(subset.start) || isNaN(subset.end))) {
        return [];
    }

    if (res[0] && res[0].end === inumLon) {
        let result = [{ start: res[0].start, end: inumLon - 1 }, { start: 0, end: 0 }];
        return result;
    }

    return res;
}

function _lonSubsetIndices(
    iLonStart: number,
    iLonEnd: number,
    inumLon: number,
    oLonStart: number,
    oLonEnd: number,
): LonSubset[] {

    const dlon = (iLonEnd - iLonStart) / (inumLon - 1);

    const isPreriodic = isPreriodicLon(iLonStart, iLonEnd, inumLon);

    const indexFloor = (lon: number) => {
        let index = Math.floor((lon - iLonStart) / dlon);
        if (index < 0) return NaN
        return index;
    }

    const indexCeil = (lon: number) => {
        const index = Math.ceil((lon - iLonStart) / dlon);
        if (index > inumLon) return NaN
        if (!isPreriodic && index >= inumLon) return NaN
        return index;
    };

    const input360 = iLonStart >= 0;
    const output360 = oLonStart >= 0;

    // Same convention: always contiguous.
    if (input360 === output360) {
        return [{
            start: indexFloor(oLonStart),
            end: indexCeil(oLonEnd),
        }];
    }

    // Convert [-180,180] -> [0,360]
    if (input360) {
        if (oLonEnd < 0) {
            // Entirely western hemisphere.
            return [{
                start: indexFloor(oLonStart + 360),
                end: indexCeil(oLonEnd + 360),
            }];
        }

        if (oLonStart >= 0) {
            // Entirely eastern hemisphere.
            return [{
                start: indexFloor(oLonStart),
                end: indexCeil(oLonEnd),
            }];
        }

        // Crosses Greenwich.
        return [
            {
                start: indexFloor(oLonStart + 360),
                end: inumLon - 1,
            },
            {
                start: 0,
                end: indexCeil(oLonEnd),
            },
        ];
    }

    // Convert [0,360] -> [-180,180]
    if (oLonEnd <= 180) {
        // Entirely eastern hemisphere.
        return [{
            start: indexFloor(oLonStart),
            end: indexCeil(oLonEnd),
        }];
    }

    if (oLonStart >= 180) {
        // Entirely western hemisphere.
        return [{
            start: indexFloor(oLonStart - 360),
            end: indexCeil(oLonEnd - 360),
        }];
    }

    // Crosses the dateline.
    return [
        {
            start: indexFloor(oLonStart),
            end: indexCeil(180 - dlon),
        },
        {
            start: indexFloor(-180),
            end: indexCeil(oLonEnd - 360),
        },
    ];
}



export function isPreriodicLon(
    lon0: number,
    lon1: number,
    nlon: number,
) {
    const dlon = (lon1 - lon0) / (nlon - 1);
    const lonEnd = lon0 + nlon * dlon;
    return Math.abs(lon0 - (lonEnd - 360)) < 1e-9;
}