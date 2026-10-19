import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'vitest';
import { checkBundleSizes } from './check-bundle-size.mjs';

const directories = new Set();
afterEach(() => {
    for (const directory of directories) rmSync(directory, { recursive: true });
    directories.clear();
});

function fixture() {
    const directory = mkdtempSync(join(tmpdir(), 'boardbuddy-bundle-budget-'));
    directories.add(directory);
    return directory;
}

test('checks every JavaScript chunk, ignores other assets, and permits the exact budget', () => {
    const directory = fixture();
    writeFileSync(join(directory, 'entry.js'), Buffer.alloc(500_000));
    writeFileSync(join(directory, 'screen.js'), Buffer.alloc(100));
    writeFileSync(join(directory, 'image.png'), Buffer.alloc(600_000));
    assert.deepEqual(checkBundleSizes(directory).map(chunk => chunk.bytes), [500_000, 100]);
});
test('fails for an oversized lazy chunk even when the entry is small', () => {
    const directory = fixture();
    writeFileSync(join(directory, 'entry.js'), Buffer.alloc(100));
    writeFileSync(join(directory, 'screen.js'), Buffer.alloc(500_001));
    assert.throws(() => checkBundleSizes(directory), /screen.js/);
});
test('fails rather than silently passing an empty output directory', () => {
    assert.throws(() => checkBundleSizes(fixture()), /no JavaScript chunks/);
});
