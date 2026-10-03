const fs = require('node:fs');
const https = require('node:https');
const os = require('node:os');
const path = require('node:path');
const tls = require('node:tls');
const { execFileSync, spawn } = require('node:child_process');

if (process.argv[2] === '--navigate') {
  (async () => {
    const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
    const origin = `https://localhost:${process.argv[3]}`;
    const dir = process.argv[4];
    const browser = await chromium.launch();
    try {
      const context = await browser.newContext({
        ignoreHTTPSErrors: true,
        clientCertificates: [{
          origin,
          cert: fs.readFileSync(path.join(dir, 'client.crt')),
          key: fs.readFileSync(path.join(dir, 'client.key')),
        }],
      });
      const page = await context.newPage();
      try {
        const response = await page.goto(origin, { timeout: 10000 });
        console.log(`HTTP ${response.status()}: ${await page.textContent('body')}`);
      } catch (error) {
        console.log(error.message.match(/net::[A-Z_]+/)?.[0] || error.message.split('\n')[0]);
      }
    } finally {
      await browser.close();
    }
  })().catch(error => { console.error(error); process.exitCode = 1; });
} else {
  (async () => {
    const runtime = process.argv[2];
    if (!runtime)
      throw new Error('Pass the path to the Node.js or Bun executable');

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-client-cert-'));
    let server;
    try {
      for (const name of ['server', 'client']) {
        execFileSync('openssl', [
          'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
          '-keyout', `${name}.key`, '-out', `${name}.crt`,
          '-days', '1', '-subj', `/CN=${name === 'client' ? 'Bob' : 'localhost'}`,
        ], { cwd: dir, stdio: 'ignore' });
      }
      const read = name => fs.readFileSync(path.join(dir, name));
      const options = {
        key: read('server.key'), cert: read('server.crt'),
        ca: read('server.crt'), requestCert: true,
        rejectUnauthorized: process.env.ACCEPT_UNTRUSTED !== '1',
      };
      server = process.env.ACCEPT_UNTRUSTED === '1'
        ? https.createServer(options, (_request, response) => {
          response.writeHead(403, { 'Content-Type': 'text/plain' });
          response.end('Sorry Bob, certificates from Bob are not welcome here.');
        })
        : tls.createServer(options);
      server.on('tlsClientError', () => {});
      await new Promise(resolve => server.listen(0, '::', resolve));

      const child = spawn(runtime, [__filename, '--navigate', String(server.address().port), dir], {
        env: process.env, stdio: ['ignore', 'pipe', 'inherit'],
      });
      let output = '';
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', chunk => output += chunk);
      const code = await new Promise((resolve, reject) => {
        child.once('exit', resolve);
        child.once('error', reject);
      });
      if (code !== 0)
        throw new Error(`${runtime} exited with code ${code}`);
      console.log(output.trim());
    } finally {
      if (server)
        await new Promise(resolve => server.close(resolve));
      fs.rmSync(dir, { recursive: true, force: true });
    }
  })().catch(error => { console.error(error); process.exitCode = 1; });
}
