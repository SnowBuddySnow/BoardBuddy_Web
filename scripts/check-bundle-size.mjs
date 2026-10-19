import { readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function checkBundleSizes(directory, maxBytes = 500_000) {
    const chunks = readdirSync(directory).filter(name => name.endsWith('.js'))
        .map(name => ({ name, bytes: statSync(resolve(directory, name)).size }))
        .sort((left, right) => right.bytes - left.bytes);
    if (!chunks.length) throw new Error('Bundle budget: no JavaScript chunks found');
    const oversized = chunks.filter(chunk => chunk.bytes > maxBytes);
    if (oversized.length) throw new Error(`Bundle budget exceeded: ${oversized.map(chunk => `${chunk.name} (${chunk.bytes} bytes)`).join(', ')}`);
    return chunks;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
    const chunks = checkBundleSizes(resolve('dist/assets'));
    console.log(`Bundle budget passed: largest JavaScript chunk ${chunks[0].bytes} / 500000 bytes`);
}
