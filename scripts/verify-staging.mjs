import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

export async function verifyStaging(origin, revision, { attempts = 48, intervalMs = 10_000, request = fetch } = {}) {
    if (!/^[a-f0-9]{40}$/.test(revision ?? '')) throw new Error('Expected a full Git commit SHA');

    async function get(path) {
        const url = new URL(path, origin);
        url.searchParams.set('ci_revision', revision);
        const response = await request(url, {
            redirect: 'error',
            headers: { 'Cache-Control': 'no-cache' },
            signal: AbortSignal.timeout(5_000),
        });
        if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
        return response;
    }

    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            const metadata = await (await get('/build-info.json')).json();
            if (metadata.revision !== revision) throw new Error('revision has not reached staging');
            if (!/^\/assets\/[\w.-]+\.js$/.test(metadata.entry ?? '')) {
                throw new Error('build metadata is missing a valid entry module');
            }

            const root = await (await get('/')).text();
            if (!root.includes('id="root"') || !root.includes(`src="${metadata.entry}"`)) {
                throw new Error('staging HTML is missing the entry module for the verified build');
            }
            const entry = await get(metadata.entry);
            if (!/^(?:text|application)\/(?:java|ecma)script\b/i.test(entry.headers.get('content-type') ?? '')) {
                throw new Error('staging entry module returned a non-JavaScript response');
            }
            await entry.body?.cancel();
            return;
        } catch (error) {
            lastError = error;
            if (attempt < attempts) await delay(intervalMs);
        }
    }
    throw new Error(`Staging did not verify revision ${revision}: ${lastError?.message ?? 'no attempts made'}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const revision = process.env.BOARDBUDDY_STAGING_REVISION ?? process.env.GITHUB_SHA;
    await verifyStaging('https://stg.boardbuddy.kr', revision);
    console.log(`Staging verified revision ${revision} and its entry module`);
}
