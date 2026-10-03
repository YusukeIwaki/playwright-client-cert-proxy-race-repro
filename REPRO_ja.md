# 再現結果メモ

## 結果

Bunサーバー＋Nodeドライバーの混成構成は **`net::ERR_EMPTY_RESPONSE`** になり、Node.js単体と同じ期待通りの挙動でした。3回実行して安定しています。

対照実験として全4通りを試した結果、挙動はサーバーではなく**ドライバー側のランタイム**に従いました。

| TLSサーバー | Playwrightドライバー | 結果 |
|---|---|---|
| Node | Node | `ERR_EMPTY_RESPONSE`（期待通り・pass） |
| Bun | Bun | `ERR_SOCKET_NOT_CONNECTED`（再現・fail） |
| **Bun** | **Node** | **`ERR_EMPTY_RESPONSE`（期待通り）** |
| Node | Bun | `ERR_SOCKET_NOT_CONNECTED`（再現） |

## 示唆

- この非互換はBunのTLSサーバー実装の問題ではなさそうです。サーバーをBunにしてもNodeドライバーなら正常系になります。
- 原因はPlaywrightドライバー側（client-cert処理まわり）がBun上で動いたときの挙動にある可能性が高いです。なお、エラーメッセージの接頭辞（`page.goto:` vs `goto:`）の違いもドライバー側に従っていたため、エラー整形も含めドライバー側ランタイム依存と見られます。

補足: この環境のBunは1.4.0（README記載の1.4.3-canaryではありません）が、全Bun構成での `ERR_SOCKET_NOT_CONNECTED` は再現しました。
