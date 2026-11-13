// Explicit, localhost-only sandbox. Never connects to staging or production.
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { installOnboardingBoundary } from '../test/onboarding-browser-boundary.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const origin = 'http://127.0.0.1:5175';
const initScripts = [];
let handle;
const state = await installOnboardingBoundary({
    clock: { install() {} }, on() {},
    context: () => ({ addInitScript(callback) { initScripts.push(`(${callback.toString()})();`); } }),
    route(_pattern, callback) { handle = callback; },
}, { origin });
process.env.VITE_API_BASE_URL = `${origin}/__scenario_api`;
process.env.VITE_KAKAO_JAVASCRIPT_KEY = '';
process.env.VITE_GLITCHTIP_DSN = '';
const server = await createServer({ root, cacheDir: 'node_modules/.vite-ui-preview', mode: 'development', server: { host: '127.0.0.1', port: 5175, strictPort: true }, plugins: [{
    name: 'explicit-local-preview',
    transformIndexHtml(html) {
        return html.replace(/<script src="https:\/\/developers.kakao.com[^>]+><\/script>/, '')
            .replace('<head>', `<head><script>${initScripts.join('\n')}</script><style>#preview-banner{height:4rem;display:flex;align-items:center;justify-content:center;gap:8px;background:#162660;color:white;font:12px system-ui;padding:0 8px}#preview-banner button{background:#FCCA59;color:#162660;border:0;border-radius:8px;padding:8px;flex-shrink:0}#root>div{height:calc(100dvh - 4rem)}</style>`)
            .replace('<body>', `<body><aside id="preview-banner"><span>가상 데이터 미리보기<br/>실제 로그인·문자 없음</span><button id="preview-approve">가상 승인</button><button id="preview-reset">처음부터</button></aside><script>addEventListener('DOMContentLoaded',()=>{document.getElementById('preview-approve').onclick=async()=>{await fetch('/__preview/approve',{method:'POST'});dispatchEvent(new Event('focus'));};document.getElementById('preview-reset').onclick=async()=>{await fetch('/__preview/reset',{method:'POST'});localStorage.clear();sessionStorage.clear();location.assign('/');};});</script>`);
    },
    configureServer(vite) {
        vite.middlewares.use(async (req, res, next) => {
            if (req.url === '/__preview/reset' && req.method === 'POST') {
                Object.assign(state, { newUser: true, approved: false, applied: false, role: 'CREW_MEMBER', requests: [], invitations: [], groups: [], profileBody: null });
                res.end('{}'); return;
            }
            if (req.url === '/__preview/approve' && req.method === 'POST') {
                state.approved = state.applied || state.requests.length > 0;
                if (state.requests.length) { state.role = 'CREW_CAPTAIN'; state.requests.forEach(item => item.approvalStatus = 'APPROVED'); }
                res.end('{}'); return;
            }
            if (!req.url?.startsWith('/__scenario_api')) return next();
            let body = ''; for await (const chunk of req) body += chunk;
            try {
                await handle({ request: () => ({ url: () => `${origin}${req.url}`, method: () => req.method, headers: () => req.headers, postDataJSON: () => body ? JSON.parse(body) : {} }),
                    fulfill({ status, contentType, body: response }) { res.writeHead(status, { 'Content-Type': contentType }); res.end(response); },
                    abort() { res.writeHead(403); res.end(); }, continue() { res.writeHead(404); res.end(); },
                });
            } catch { res.writeHead(500); res.end('{"message":"Local fixture failed"}'); }
        });
    },
}] });
await server.listen();
console.log(`Local UI sandbox: ${origin} (synthetic data only)`);
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, async () => { await server.close(); process.exit(0); });
