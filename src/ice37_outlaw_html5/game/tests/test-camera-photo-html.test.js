const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('test camera photo page declares the standard viewport meta element', () => {
    const htmlPath = path.join(__dirname, '../test_camera_photo.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    assert.match(
        html,
        /<meta\s+name=["']viewport["']\s+content=["']width=device-width,\s*initial-scale=1\.0["']\s*\/?\s*>/i
    );
});
