import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const origin = 'http://127.0.0.1:5187';
let server;
let browser;
try {
    if (!process.argv.includes('--existing-server')) {
        server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5187', '--strictPort'], {
            cwd: root, stdio: 'ignore', env: { ...process.env, VITE_API_BASE_URL: `${origin}/__scenario_api`,
                VITE_OPERATING_MODE_OVERRIDE: 'OFF_SEASON', VITE_KAKAO_JAVASCRIPT_KEY: '' },
        });
        let ready = false;
        for (let attempt = 0; attempt < 100; attempt++) {
            if (server.exitCode != null) throw new Error('The isolated Vite server exited; port 5187 must be free.');
            try { if ((await fetch(origin)).ok) { ready = true; break; } } catch { /* startup */ }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        if (!ready) throw new Error('Local browser scenario server did not become ready.');
    }
    browser = await chromium.launch({ headless: true, ...(process.env.CI ? {} : { channel: 'chrome' }) });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Seoul', serviceWorkers: 'block' });
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    const load = name => new Function(`return (${readFileSync(new URL(name, import.meta.url), 'utf8')})`)();
    await load('event-browser-fixture.js')(page);
    const report = await load('event-browser-smoke.js')(page);
    mkdirSync(`${root}/output/playwright`, { recursive: true });
    await page.screenshot({ path: `${root}/output/playwright/event-browser-smoke.png`, fullPage: true });
    writeFileSync(`${root}/output/playwright/event-browser-smoke.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
} finally {
    if (browser) await browser.close();
    if (server && server.exitCode == null) server.kill('SIGTERM');
}
