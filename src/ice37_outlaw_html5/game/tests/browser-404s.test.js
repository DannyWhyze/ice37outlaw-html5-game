const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('does not preload removed Hall of Fame backpack assets', () => {
    const bootScenePath = path.join(__dirname, '../js/BootScene.js');
    const bootSceneSource = fs.readFileSync(bootScenePath, 'utf8');

    assert.doesNotMatch(bootSceneSource, /assets\/images\/halloffame\/backpack\//);
});

test('suppresses the implicit favicon request without adding an unrelated image asset', () => {
    const indexPath = path.join(__dirname, '../index.html');
    const indexHtml = fs.readFileSync(indexPath, 'utf8');

    assert.match(indexHtml, /<link\s+rel="icon"\s+href="data:,">/);
});
