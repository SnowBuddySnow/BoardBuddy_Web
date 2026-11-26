import { defineConfig } from '@playwright/test';

const origin = 'http://127.0.0.1:5187';
const isCI = Boolean(process.env.CI);
const outputDirectory = 'output/playwright/event';
const previewBuild = 'node_modules/.boardbuddy-browser-build';

export default defineConfig({
    testDir: './e2e',
    timeout: 90_000,
    workers: isCI ? 1 : undefined,
    retries: isCI ? 1 : 0,
    forbidOnly: isCI,
    failOnFlakyTests: isCI,
    outputDir: `${outputDirectory}/artifacts`,
    reporter: [
        ['list'],
        ['junit', { outputFile: `${outputDirectory}/junit.xml` }],
        ['html', { outputFolder: `${outputDirectory}/report`, open: 'never' }],
    ],
    use: {
        baseURL: origin,
        timezoneId: 'Asia/Seoul',
        serviceWorkers: 'block',
        screenshot: 'only-on-failure',
        trace: isCI ? 'on-first-retry' : 'retain-on-failure',
    },
    projects: [
        { name: 'chromium-desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } },
        {
            name: 'chromium-mobile',
            use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
        },
    ],
    webServer: {
        command: `node node_modules/vite/bin/vite.js build --outDir ${previewBuild} --emptyOutDir && node node_modules/vite/bin/vite.js preview --outDir ${previewBuild} --host 127.0.0.1 --port 5187 --strictPort`,
        url: origin,
        timeout: 90_000,
        env: {
            VITE_API_BASE_URL: `${origin}/__scenario_api`,
            VITE_OPERATING_MODE_OVERRIDE: 'OFF_SEASON',
            VITE_KAKAO_JAVASCRIPT_KEY: '',
            VITE_GLITCHTIP_DSN: '',
        },
    },
});
