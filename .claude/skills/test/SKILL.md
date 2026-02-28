---
name: test
description: Go と Web (vitest) のユニットテストを実行して結果を確認する
disable-model-invocation: true
---

ユニットテストを実行して結果を確認してください。

- 以下のテストを並列で実行する
  - CLI - unit test: `go test ./...`
  - Web - unit test: `cd web && npm test`
  - Web - Storybook: `cd web && npm run test:storybook`
- テスト結果を確認し、失敗したテストがあればその内容を報告する
  - 失敗した原因を調べ、可能であれば修正方法も提案する
- 全テストが成功した場合はその旨を報告する
