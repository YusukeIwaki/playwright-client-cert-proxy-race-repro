# Reproduction

Requires Node.js 20+, OpenSSL, and Bun `1.4.3-canary.1+bc7a813b1`.

```sh
npm ci
npm run install-browser

npm test # passes
npm run test:bun # fails
```
