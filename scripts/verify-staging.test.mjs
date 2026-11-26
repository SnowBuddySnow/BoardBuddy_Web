import { expect, it, vi } from 'vitest';
import { verifyStaging } from './verify-staging.mjs';

const origin = 'https://staging.example.test';
const revision = 'a'.repeat(40);
const entry = '/assets/index-build.js';
const html = `<div id="root"></div><script type="module" src="${entry}"></script>`;
const app = () => new Response('export {};', { headers: { 'Content-Type': 'text/javascript' } });

it('waits for the exact release and checks its HTML and JavaScript', async () => {
    const request = vi.fn()
        .mockResolvedValueOnce(Response.json({ revision: 'b'.repeat(40), entry }))
        .mockResolvedValueOnce(Response.json({ revision, entry }))
        .mockResolvedValueOnce(new Response(html))
        .mockResolvedValueOnce(app());

    await verifyStaging(origin, revision, { attempts: 2, intervalMs: 0, request });

    expect(request.mock.calls.map(([url]) => url.pathname)).toEqual(['/build-info.json', '/build-info.json', '/', entry]);
    expect(request.mock.calls.every(([url]) => url.searchParams.get('ci_revision') === revision)).toBe(true);
});

it.each([
    ['an old revision', Response.json({ revision: 'b'.repeat(40), entry }), html, app(), 'revision has not reached staging'],
    ['stale HTML', Response.json({ revision, entry }), html.replace(entry, '/assets/old.js'), app(), 'missing the entry module'],
    ['an HTML fallback for the asset', Response.json({ revision, entry }), html, new Response(html), 'non-JavaScript response'],
    ['a remote asset', Response.json({ revision, entry: 'https://example.test/entry.js' }), html, app(), 'missing a valid entry module'],
])('rejects %s', async (_scenario, metadata, root, module, message) => {
    const request = vi.fn()
        .mockResolvedValueOnce(metadata)
        .mockResolvedValueOnce(new Response(root))
        .mockResolvedValueOnce(module);
    await expect(verifyStaging(origin, revision, { attempts: 1, request })).rejects.toThrow(message);
});
