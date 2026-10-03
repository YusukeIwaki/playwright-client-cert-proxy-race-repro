# Reproduction

Requires Node.js 20+, OpenSSL, and Bun `1.4.3-canary.1+bc7a813b1`.

```sh
npm ci
npm run install-browser

node repro.cjs "$(command -v node)"       # net::ERR_EMPTY_RESPONSE
node repro.cjs /absolute/path/to/bun-canary # net::ERR_SOCKET_NOT_CONNECTED
```
