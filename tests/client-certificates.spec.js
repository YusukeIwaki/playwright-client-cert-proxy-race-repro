const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const https = require('node:https');
const os = require('node:os');
const path = require('node:path');

test('should fail with self-signed client certificates', async ({ browser }) => {
  console.log(`Driver runtime: ${process.versions.bun ? `Bun ${process.versions.bun}` : `Node.js ${process.version}`}`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-client-cert-'));
  let server;
  let page;
  try {
    for (const name of ['server', 'client']) {
      execFileSync('openssl', [
        'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
        '-keyout', `${name}.key`, '-out', `${name}.crt`,
        '-days', '1', '-subj', `/CN=${name === 'client' ? 'Bob' : 'localhost'}`,
      ], { cwd: dir, stdio: 'ignore' });
    }
    const read = name => fs.readFileSync(path.join(dir, name));
    server = https.createServer({
      key: read('server.key'),
      cert: read('server.crt'),
      ca: [read('server.crt')],
      requestCert: true,
      // Like the Ruby test's force_peer server, reject the untrusted client during TLS.
      rejectUnauthorized: true,
    }, (_request, response) => response.end('unexpected response'));
    server.on('tlsClientError', () => {});
    await new Promise(resolve => server.listen(0, '::', resolve));
    const serverURL = `https://localhost:${server.address().port}`;

    page = await browser.newPage({
      ignoreHTTPSErrors: true,
      clientCertificates: [{
        origin: serverURL,
        certPath: path.join(dir, 'client.crt'),
        keyPath: path.join(dir, 'client.key'),
      }],
    });
    const response = await page.goto(serverURL).catch(error => {
      expect(error.message).toMatch(/net::ERR_EMPTY_RESPONSE|The network connection was lost|Connection terminated unexpectedly/);
      return null;
    });
    if (response) {
      expect(response.status()).toBe(503);
      await expect(page.locator('body')).toContainText(/self-signed certificate|Playwright client-certificate error/);
    }
  } finally {
    await page?.close();
    if (server)
      await new Promise(resolve => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
