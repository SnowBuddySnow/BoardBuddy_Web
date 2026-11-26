import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { runEventGuestVerificationSmoke } from '../scripts/test/event-guest-verification-smoke.mjs';

// The CLI also loads these function expressions without importing an ES module.
function loadScenario<T>(name: string): (page: Page) => Promise<T> {
    const source = readFileSync(new URL(`../scripts/test/${name}`, import.meta.url), 'utf8');
    return new Function(`return (${source})`)();
}

const installFixture = loadScenario('event-browser-fixture.js');
const exerciseRegistration = loadScenario<{ result: string; completed: string[] }>('event-browser-smoke.js');

test('participants can register and cancel, and private details follow their status', async ({ page }, testInfo) => {
    await installFixture(page);
    const result = await exerciseRegistration(page);

    expect(result.result).toBe('PASS');
    await testInfo.attach('completed scenarios', {
        body: JSON.stringify(result, null, 2),
        contentType: 'application/json',
    });
});

test('signed-out guests can apply, reverify their receipt, and cancel', async ({ page, baseURL }) => {
    expect(await runEventGuestVerificationSmoke(page, baseURL!)).toBe('signed-out-guest-apply-reverify-lookup-cancel');
});
