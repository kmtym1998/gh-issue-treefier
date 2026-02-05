# プロジェクトの構造

このドキュメントは `{{date}}` に作成されました(`{{shortCommitHash}}`)。

## ディレクトリ構造

[あなたのプロジェクトのディレクトリ構造を説明してください。以下は一般的な例です。]

```
Example for a library/package:
project-root/
├── src/                    # Source code
├── tests/                  # Test files
├── docs/                   # Documentation
├── examples/               # Usage examples
└── [build/dist/out]        # Build output

Example for an application:
project-root/
├── [src/app/lib]           # Main source code
├── [assets/resources]      # Static resources
├── [config/settings]       # Configuration
├── [scripts/tools]         # Build/utility scripts
└── [tests/spec]            # Test files

Common patterns:
- Group by feature/module
- Group by layer (UI, business logic, data)
- Group by type (models, controllers, views)
- Flat structure for simple projects
```

## 設計原則

1. 単一責任: 各モジュール/クラスは単一の責任を持つべきです
2. モジュール化: コードは再利用可能なモジュールに整理されるべきです
3. テスト容易性: コードは容易にテスト可能な構造にするべきです
4. 一貫性: コードベースで確立されたパターンに従うべきです
5. [他に足すべき項目があれば追加してください]

## モジュール間の依存関係

[モジュール間の依存関係に関する図を含めるか、説明してください。図を書く場合は mermaid などのツールを使用してください。ノードが 20 以上になり複雑になる場合は drawio 形式の図を作成してください。]

## 命名規則

[あなたのプロジェクトで使用される命名規則を説明してください。以下は一般的な例です。]

### ファイルとディレクトリ

- ファイル名: [e.g., `kebab-case`, `snake_case`, `PascalCase`]
- ディレクトリ名: [e.g., `kebab-case`, `snake_case`, `PascalCase`]
- インポート/エクスポート名 (必要であれば): [e.g., `camelCase`, `PascalCase`, `snake_case`]
- テストファイル: [e.g., `[filename]_test`, `[filename].test`, `[filename]Spec`]

### コード

- クラス/タイプ名: [e.g., `PascalCase`, `CamelCase`, `snake_case`]
- 関数/メソッド名: [e.g., `camelCase`, `snake_case`, `PascalCase`]
- 定数名: [e.g., `UPPER_SNAKE_CASE`, `SCREAMING_CASE`, `PascalCase`]
- 変数名: [e.g., `camelCase`, `snake_case`, `lowercase`]

### インポート/依存関係の順序

Linter やフォーマッタで規定された順序に従います。このプロジェクトとしてはルールを定めません。

## コードサイズのガイドライン

[ファイルや関数のサイズに関するプロジェクトのガイドラインを定義してください]

推奨ガイドライン:

- ファイルサイズ: [大まかな最大行数の目安]
- 関数/メソッドサイズ: [関数ごとの最大行数の目安]
- クラス/モジュールの複雑さ: [循環的複雑度の制限を定義]
- ネストの深さ: [最大ネストレベルの目安]
