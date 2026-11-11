import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const canonical = value => value.split('?')[0].replace(/\$\{[^}]+\}/g, '{}').replace(/\{[^}]*\}/g, '{}');
const snapshot = JSON.parse(readFileSync(path.join(root, 'contracts/backend-routes.json'), 'utf8'));
const routes = new Set(snapshot.routes.map(route => {
    const [method, endpoint] = route.split(' ');
    return `${method} ${canonical(endpoint)}`;
}));
const patterns = [...routes].map(route => new RegExp('^' + route.split('{}')
    .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^/]+') + '$'));
const files = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? files(full) : /\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [full] : [];
});
let checked = 0;
const missing = [];
for (const file of files(path.join(root, 'src'))) {
    const source = readFileSync(file, 'utf8');
    const calls = /apiClient\.(get|post|put|patch|delete)\s*(?:<[^;\n()]*>)?\s*\(\s*(['"`])([^'"`]+)\2/g;
    for (const match of source.matchAll(calls)) {
        const [, method, , endpoint] = match;
        if (!endpoint.startsWith('/')) continue;
        checked += 1;
        const signature = `${method.toUpperCase()} ${canonical(`/api${endpoint}`)}`;
        if (!routes.has(signature) && !patterns.some(pattern => pattern.test(signature))) {
            missing.push(`${path.relative(root, file)}: ${signature}`);
        }
    }
}
if (!checked) throw new Error('No literal API calls checked; contract scanner must not pass vacuously.');
if (missing.length) throw new Error(`Missing backend routes:\n${missing.join('\n')}`);
console.log(`HTTP contract verified: ${checked} client calls against ${routes.size} backend routes.`);
