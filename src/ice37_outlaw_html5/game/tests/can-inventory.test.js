const assert = require('node:assert/strict');
const test = require('node:test');

const CanInventory = require('../js/logic/canInventory.js');

test('CanInventory defines all 33 shelf can colors matching decompiled AS2', () => {
    assert.equal(Object.keys(CanInventory.SHELF_CAN_COLORS).length, 33);
    for (let i = 1; i <= 33; i++) {
        const color = CanInventory.getShelfColor(i);
        assert.notEqual(color, null, `Shelf can ${i} must have a valid color`);
        assert.equal(typeof color, 'number');
        assert.ok(color >= 0 && color <= 0xffffff, `Shelf can ${i} color must be valid 24-bit hex`);
    }

    // Spot-check key colors
    assert.equal(CanInventory.getShelfColor(1), 0x660066);
    assert.equal(CanInventory.getShelfColor('farbdose_10'), 0xffffff);
    assert.equal(CanInventory.getShelfColor('farbdose_15'), 0x0000cc);
    assert.equal(CanInventory.getShelfColor('farbdose_22'), 0xff0000);
    assert.equal(CanInventory.getShelfColor(33), 0x000000);
    assert.equal(CanInventory.getShelfColor(999), null);
    assert.equal(CanInventory.getShelfColor('invalid'), null);
});

test('CanInventory manages 6 floor inventory colors and reset', () => {
    CanInventory.resetFloorColors();
    const starterColors = CanInventory.getFloorColors();
    assert.deepEqual(starterColors, [0x0000cc, 0xffffff, 0xffff33, 0x66ff33, 0xff0000, 0x000000]);

    // getFloorColor
    assert.equal(CanInventory.getFloorColor(0), 0x0000cc);
    assert.equal(CanInventory.getFloorColor(5), 0x000000);
    assert.equal(CanInventory.getFloorColor(6), null);
    assert.equal(CanInventory.getFloorColor(-1), null);

    // setFloorColor
    const success = CanInventory.setFloorColor(2, 0xcc0099);
    assert.equal(success, true);
    assert.equal(CanInventory.getFloorColor(2), 0xcc0099);

    // Invalid setFloorColor
    assert.equal(CanInventory.setFloorColor(-1, 0x123456), false);
    assert.equal(CanInventory.setFloorColor(10, 0x123456), false);
    assert.equal(CanInventory.setFloorColor(1, 'red'), false);

    // Reset
    CanInventory.resetFloorColors();
    assert.deepEqual(CanInventory.getFloorColors(), starterColors);
});

test('CanInventory.findTargetFloorCan tests hit detection against floor bounding boxes', () => {
    const floorBoxes = [
        { index: 0, x: 10, y: 100, width: 40, height: 80 },
        { index: 1, x: 60, y: 100, width: 40, height: 80 },
        { index: 2, x: 110, y: 100, width: 40, height: 80 },
    ];

    // Inside box 0
    assert.equal(CanInventory.findTargetFloorCan(25, 120, floorBoxes), 0);
    // Boundary of box 1
    assert.equal(CanInventory.findTargetFloorCan(60, 100, floorBoxes), 1);
    assert.equal(CanInventory.findTargetFloorCan(100, 180, floorBoxes), 1);
    // Miss: above box
    assert.equal(CanInventory.findTargetFloorCan(25, 50, floorBoxes), -1);
    // Miss: between boxes
    assert.equal(CanInventory.findTargetFloorCan(55, 120, floorBoxes), -1);
    // Edge cases
    assert.equal(CanInventory.findTargetFloorCan(25, 120, null), -1);
    assert.equal(CanInventory.findTargetFloorCan(25, 120, []), -1);

    // Bounding box overlap test
    const overlappingShelfBounds = { x: 5, y: 95, width: 40, height: 80 };
    assert.equal(CanInventory.findTargetFloorCan(null, null, floorBoxes, overlappingShelfBounds), 0);
});
