(function attachCanInventory(globalScope) {
    'use strict';

    // 33 shelf spray can hex colors extracted from decompiled AS2 (outlaw300_home.swf)
    const SHELF_CAN_COLORS = {
        1: 0x660066,
        2: 0xcc0099,
        3: 0xcc00ff,
        4: 0xffccff,
        5: 0xffcccc,
        6: 0xcc6666,
        7: 0x663300,
        8: 0x996600,
        9: 0xcccc99,
        10: 0xffffff,
        11: 0xffff33,
        12: 0xffcc00,
        13: 0xff6600,
        14: 0x000066,
        15: 0x0000cc,
        16: 0x0099ff,
        17: 0x99ffff,
        18: 0x333399,
        19: 0x6600cc,
        20: 0x9999ff,
        21: 0x6666ff,
        22: 0xff0000,
        23: 0x990000,
        24: 0x660000,
        25: 0x006600,
        26: 0x336600,
        27: 0x66ff33,
        28: 0x666600,
        29: 0x666666,
        30: 0xcccccc,
        31: 0xff6666,
        32: 0x006699,
        33: 0x000000,
    };

    // 6 authentic starter inventory colors from outlaw300_start.swf (Frame 1)
    const STARTER_FLOOR_COLORS = [
        0x0000cc, // canone = 204
        0xffffff, // cantwo = 16777215
        0xffff33, // canthree = 16777011
        0x66ff33, // canfour = 6750003
        0xff0000, // canfive = 16711680
        0x000000, // cansix = 0
    ];

    let currentFloorColors = [...STARTER_FLOOR_COLORS];

    function parseCanId(canRef) {
        if (typeof canRef === 'number') {
            return canRef;
        }
        if (typeof canRef === 'string') {
            const match = canRef.match(/\d+/);
            return match ? parseInt(match[0], 10) : null;
        }
        return null;
    }

    function getShelfColor(canRef) {
        const canId = parseCanId(canRef);
        return (canId !== null && SHELF_CAN_COLORS[canId] !== undefined)
            ? SHELF_CAN_COLORS[canId]
            : null;
    }

    function getFloorColors() {
        return [...currentFloorColors];
    }

    function getFloorColor(slotIndex) {
        if (slotIndex >= 0 && slotIndex < currentFloorColors.length) {
            return currentFloorColors[slotIndex];
        }
        return null;
    }

    function setFloorColor(slotIndex, color) {
        if (slotIndex >= 0 && slotIndex < currentFloorColors.length && typeof color === 'number') {
            currentFloorColors[slotIndex] = color;
            return true;
        }
        return false;
    }

    function resetFloorColors() {
        currentFloorColors = [...STARTER_FLOOR_COLORS];
        return [...currentFloorColors];
    }

    function findTargetFloorCan(dropX, dropY, floorBoxes, shelfBounds = null, tolerance = 0) {
        if (!Array.isArray(floorBoxes)) {
            return -1;
        }

        // 1. Point hit test (drop coordinates with optional margin tolerance)
        if (typeof dropX === 'number' && typeof dropY === 'number') {
            for (let i = 0; i < floorBoxes.length; i++) {
                const box = floorBoxes[i];
                if (!box) continue;
                const x = box.x - tolerance;
                const y = box.y - tolerance;
                const w = box.width + tolerance * 2;
                const h = box.height + tolerance * 2;
                if (dropX >= x && dropX <= x + w && dropY >= y && dropY <= y + h) {
                    return (typeof box.index === 'number') ? box.index : i;
                }
            }
        }

        // 2. Bounding-box intersection test (Flash MovieClip.hitTest)
        if (shelfBounds && typeof shelfBounds.x === 'number' && typeof shelfBounds.y === 'number') {
            const sw = shelfBounds.width || 0;
            const sh = shelfBounds.height || 0;
            const sx1 = shelfBounds.x;
            const sx2 = shelfBounds.x + sw;
            const sy1 = shelfBounds.y;
            const sy2 = shelfBounds.y + sh;

            for (let i = 0; i < floorBoxes.length; i++) {
                const box = floorBoxes[i];
                if (!box) continue;
                const bx1 = box.x;
                const bx2 = box.x + box.width;
                const by1 = box.y;
                const by2 = box.y + box.height;

                const overlap = (sx1 < bx2 && sx2 > bx1 && sy1 < by2 && sy2 > by1);
                if (overlap) {
                    return (typeof box.index === 'number') ? box.index : i;
                }
            }
        }

        return -1;
    }

    const api = {
        SHELF_CAN_COLORS,
        STARTER_FLOOR_COLORS,
        findTargetFloorCan,
        getFloorColor,
        getFloorColors,
        getShelfColor,
        parseCanId,
        resetFloorColors,
        setFloorColor,
    };

    globalScope.CanInventory = api;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
}(typeof globalThis === 'undefined' ? this : globalThis));
