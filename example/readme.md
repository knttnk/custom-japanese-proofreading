# example の説明

<!-- textlint-disable japanese/no-mix-dearu-desumasu -->
いずれも、VS Codeで開いてテストできます。

## all-rules.md

すべてのサポートしているルールを載せたものです。settings.jsonを以下の様にしてルールを有効化してください。
```json
{
    "customJapaneseProofreading.textlintrcPaths": [
        "./.textlintrc.json",
    ],
}
```

## sice-test.md

計測自動制御学会の定めるルールから、例文を作りました。
`.textlintrc-sice.json`、`sice-morpheme-match.json`、`sice-prh.yml`は、計測自動制御学会のルールを解釈したものです。settings.jsonを以下のようにして、ルールを有効化してください。
```json
{
    "customJapaneseProofreading.textlintrcPaths": [
        "./.textlintrc-sice.json",
    ],
}
```
