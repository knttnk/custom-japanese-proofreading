# カスタム日本語校正の例

ファイルだけを見るのではなく、実際に拡張機能をインストールして、エラーの表示を見ていただいたほうがいいと思います。

## 個別ルール

### [@textlint-ja/no-synonyms](https://github.com/textlint-ja/textlint-rule-no-synonyms)

サーバとサーバーの表記揺れがある。
この雇入と雇入れの違いを見つける。

### [@textlint-ja/textlint-rule-no-dropping-i](https://github.com/textlint-ja/textlint-rule-no-dropping-i)

開発している。開発してる。
勉強していない。勉強してない。

### [@textlint-ja/textlint-rule-no-insert-dropping-sa](https://github.com/textlint-ja/textlint-rule-no-insert-dropping-sa)

早く終わらせて帰りたさそうなのがおかしかった。
寿司が美味しさそう。
辛さそうな様子だ。
これは問題無そう。
これは良そう。

### [@textlint-ja/textlint-rule-no-insert-re](https://github.com/textlint-ja/textlint-rule-no-insert-re)

お酒は飲めない。お酒は飲めれない。

### [ja-joyo-or-jinmeiyo-kanji](https://github.com/textlint-ja/textlint-rule-ja-joyo-or-jinmeiyo-kanji)

未来に繋ぐ。

### [ja-no-inappropriate-words](https://github.com/textlint-ja/textlint-rule-ja-no-inappropriate-words)

エッチな話。

### [ja-no-orthographic-variants](https://github.com/textlint-ja/textlint-rule-ja-no-orthographic-variants)

この手順は組み立て法1と組立法2に従う。

### [prefer-tari-tari](https://github.com/textlint-ja/textlint-rule-prefer-tari-tari)

階段を上がったり、下がる。

### [preset-jtf-style](https://github.com/textlint-ja/textlint-rule-preset-JTF-style)

重要なのは、 risk management である。

### [prh](https://github.com/prh/prh)

cookieを保存するか。s

## [preset-japanese](https://github.com/textlint-ja/textlint-rule-preset-japanese)

### max-ten

さすがに、これは、いくらなんでも、点が、多すぎるよ。

### no-doubled-conjunctive-particle-ga

今日は早朝から出発したが、定刻には間に合わなかったが、無事会場に到着した。

### no-doubled-conjunction

かな漢字変換により漢字が多用される。しかし漢字の多用が読みにくさをもたらす側面は否定できない。しかし、平仮名が多い文は間延びした印象を与える恐れもある。

### no-double-negative-ja

それが事件の発端だったといえなくもない。
確かにそういった懸念はない事はない。

### no-doubled-joshi

材料不足で代替素材で製品を作った。
あれやこれやの例外はある。
すもももももももものうち。

### sentence-length

春の穏やかな日差しが窓辺に差し込み、読みかけの本のページを優しく照らし出す午後、遠くから聞こえる子供たちの楽しそうな笑い声と、時折吹く心地よい風がカーテンを揺らす音だけが、静かな部屋に満ちる豊かな時間の中でゆっくりと過ぎていく。

### no-dropping-the-ra

お刺身を食べれない。
人が出れないんだ。
この距離からでも見れる。
今日は来れる？
人が来れないんだ。

### no-mix-dearu-desumasu

今日はいい天気ですが、明日は悪天候である。

### no-nfd

ホ゜ケット エンシ゛ン。

### no-invalid-control-character

変な文字。

### no-zero-width-spaces

テキ​スト。

### no-kangxi-radicals

⾒る。
見る。

## [preset-ja-technical-writing](https://github.com/textlint-ja/textlint-rule-preset-ja-technical-writing)

### sentence-length

重複。

### max-comma

This, is, an, unbelievable, pen.

### max-ten

重複。

### max-kanji-continuous-len

災害時要援護者避難支援対策調査結果を発表する。

### arabic-kanji-numbers

1石2鳥（一石二鳥）とは、一つの事柄で２つのメリットを得られること。

### no-mix-dearu-desumasu

重複。

### ja-no-mixed-period

使えない場合もある
末尾に句点がない

### no-double-negative-ja

重複。

### no-dropping-the-ra

重複。

### no-doubled-conjunctive-particle-ga

重複。

### no-doubled-conjunction

重複。

### no-doubled-joshi

重複。

### no-nfd

重複。

### no-invalid-control-character

重複。

### no-zero-width-spaces

重複。

### no-exclamation-question-mark

Yahoo!は素晴らしい企業だ！

### no-hankaku-kana

ｺﾜｸﾅｲﾖ。

### ja-no-weak-phrase

良いかもしれない。

### ja-no-successive-word

カクカクしているのは大丈夫。これはは問題がある。

### ja-no-abusage

設定を適応する。

### ja-no-redundant-expression

実験を行なうという表現は、冗長な表現であると考えている。
実験を行なう。

### ja-unnatural-alphabet

リイr−ス
対応でｋない。

### no-unmatched-pair

これは（秘密)だよ。
John said "Hello World'.

## 個別フィルター

### [comments](https://github.com/textlint/textlint-filter-rule-comments)

Markdownのソースコードを見ること。
リイｒースはエラーだ。
<!-- textlint-disable ja-technical-writing/ja-unnatural-alphabet -->
リイｒースはエラーではない。
<!-- textlint-enable ja-technical-writing/ja-unnatural-alphabet -->
再びリイｒースはエラーだ。