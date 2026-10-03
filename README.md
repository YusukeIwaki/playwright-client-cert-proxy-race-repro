# Reproduction

Requires Node.js 20+, OpenSSL, and Bun `1.4.3-canary.1+bc7a813b1`.

```sh
npm ci
npm run install-browser
```

## Node.js output

```console
$ npm test

> test
> playwright test tests/client-certificates.spec.js --workers=1

Running 1 test using 1 worker

Driver runtime: Node.js v23.7.0
  ✓  1 tests/client-certificates.spec.js:8:1 › should fail with self-signed client certificates (375ms)

  1 passed (806ms)
```

## Bun output

```console
$ bun --revision
1.4.3-canary.1+bc7a813b1

$ npm run test:bun

> test:bun
> bun node_modules/@playwright/test/cli.js test tests/client-certificates.spec.js --workers=1

Running 1 test using 1 worker

Driver runtime: Bun 1.4.3
  ✘  1 tests/client-certificates.spec.js:8:0 › should fail with self-signed client certificates (376ms)

  1) tests/client-certificates.spec.js:8:0 › should fail with self-signed client certificates ──────

    Error: expect(received).toMatch(expected)

    Expected pattern: /net::ERR_EMPTY_RESPONSE|The network connection was lost|Connection terminated unexpectedly/
    Received string:  "goto: net::ERR_SOCKET_NOT_CONNECTED at https://localhost:60925/
    Call log:
      - navigating to \"https://localhost:60925/\", waiting until \"load\"
    "

      41 |     });
      42 |     const response = await page.goto(serverURL).catch(error => {
    > 43 |       expect(error.message).toMatch(/net::ERR_EMPTY_RESPONSE|The network connection was lost|Connection terminated unexpectedly/);
         |                            ^
      44 |       return null;
      45 |     });
      46 |     if (response) {
        at /private/tmp/playwright-client-cert-race-repro/tests/client-certificates.spec.js:43:28

    Error Context: test-results/tests-client-certificates--cf818--signed-client-certificates/error-context.md

  1 failed
    tests/client-certificates.spec.js:8:0 › should fail with self-signed client certificates ───────
```
