# カスタム日本語校正

## 開発環境の構築

### 1. Node.jsの準備

`.node-version`にあるバージョンNode.jsをインストール。[fnm](https://github.com/Schniz/fnm)の利用を推奨します。

### 2. npmで必要なパッケージをインストール

```shell
npm i
```

### 3. 開発

VS Codeで[F5]キーを押下しデバッグ実行を行うと、開発中の拡張機能がインストールされた状態でVS Codeが立ち上がります。

ルールを追加したいときは、`@custom-japanese-proofreading/server`ワークスペースにインストールします。例えば、

```shell
npm install --workspace @custom-japanese-proofreading/server @textlint-ja/textlint-rule-no-synonyms
```

### 4. 拡張機能の公開

公開ツールをインストール。

```shell
npm i --save-dev @vscode/vsce
```

拡張機能のパッケージング。

拡張機能を公開せずにパッケージ化できます。公開前に内部確認する際に利用します。

```shell
vsce package
```

拡張機能の公開。

Visual Studio Team Servicesを活用して、拡張機能の公開を行います。
公開するには、Personal Access Tokensが必要であるため、以下のサイトの通り設定をしてください。

<https://vscode-doc-jp.github.io/docs/extensions/publish-extension.html>

1. `package.json`のバージョン番号（version）を更新します。

2. `CHANGELOG.md`に更新するバージョンの変更履歴を追記します。

3. 以下のコマンドを実行し公開処理を行います。  
  コマンド実行後、マーケット側でverifyが行われ、問題なければ数分後マーケットに反映されます。

  ```shell
  vsce publish
  ```
