# Playwright client-certificate proxy close-order reproduction

This reproduces a close-order race in Playwright's client-certificate proxy without Ruby. The local mTLS server always runs under Node.js. Only the Playwright driver process switches between Node.js and Bun.

The scenario is derived from Playwright's [self-signed client-certificate test](https://github.com/microsoft/playwright/blob/v1.63.0/tests/library/client-certificates.spec.ts#L379-L392). Its [server fixture](https://github.com/microsoft/playwright/blob/v1.63.0/tests/library/client-certificates.spec.ts#L42-L68) accepts the certificate at the TLS layer and returns HTTP 403. This reproduction also covers a server that rejects the untrusted certificate during TLS, which exposed the race while porting the test to Ruby.

Requirements: Node.js 20+, Bun 1.4.3-canary.1, OpenSSL, and a Chromium installation supported by Playwright 1.63.0.

```sh
npm ci
npm run install-browser
node repro.cjs "$(command -v node)"
node repro.cjs /absolute/path/to/bun-canary
```

Pass the path to the Bun canary whose revision you intend to test; the `bun` on `PATH` may be a different version. The default server rejects the self-signed client certificate during the TLS handshake. On the macOS arm64 test machine, unmodified Playwright 1.63.0 reports `ERR_EMPTY_RESPONSE` under Node.js v23.7.0 and `ERR_SOCKET_NOT_CONNECTED` under Bun `1.4.3-canary.1+bc7a813b1`.

Playwright's upstream `should fail with self-signed client certificates` test uses a different fixture: it accepts the certificate at the TLS layer and returns HTTP 403. To model that behavior, run:

```sh
ACCEPT_UNTRUSTED=1 node repro.cjs "$(command -v node)"
ACCEPT_UNTRUSTED=1 node repro.cjs /absolute/path/to/bun-canary
```

Both runtimes return HTTP 403 in this mode. The TLS-rejection mode exposes the race; it is not a claim that the unchanged upstream test fails under Bun.

To test a locally patched `playwright-core` package without changing this reproduction, set `PLAYWRIGHT_CORE_PATH` to that package's absolute path. A diagnostic change that waits for the in-flight browser-side TLS handshake before destroying the browser-facing transport yielded `ERR_EMPTY_RESPONSE` under both runtimes. That change is not a production-ready fix: a final implementation also needs to handle an aborted or never-completing handshake.
