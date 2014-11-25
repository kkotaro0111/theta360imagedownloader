#THETA360 image downloader
RICOH THETA の公式アップローダーを走査して、そこにアップロードされた画像・動画を拾ってくるというなんとも悪質なダウンローダー

## Require
- node.js
 - request
 - cheerio
 - argv

## Usage
アップロードされている1個目の画像( http://theta360.com/s/0 )から13万個目の画像( http://theta360.com/s/Xom )をダウンロードしてくる場合
```bash
$ node downloader.js -s 0 -e 130000
```

##Options
<dl>
  <dt>--start [num], -s</dt>
  <dd>ダウンロードを開始する通し番号。10進数</dd>
  <dt>--end [num], -e</dt>
  <dd>ダウンロードを終了する通し番号。10進数</dd>
  <dt>--start_id [thetaid], -S</dt>
  <dd>ダウンロードを開始するTHETA ID。[0-9A-Za-z]の62進数</dd>
  <dt>--end_id [thetaid], -E</dt>
  <dd>ダウンロードを終了するTHETA ID。[0-9A-Za-z]の62進数</dd>
  <dt>--index [num], -i</dt>
  <dd>10進数の数値を、[0-9A-Za-z]の62進数に変換して表示する</dd>
  <dt>--thetaid [string], -t</dt>
  <dd>[0-9A-Za-z]の62進数を、10進数に変換して表示する</dd>
</dl>

## Omake
THETAの公式アップローダーのURLは基本的に下記の形式をとっている
- http://theta360.com/{s|m}/{thetaid}
<dl>
  <dt>{s|m}</dt>
  <dd>静止画の場合は"s"、動画の場合は"m"。"s"でアクセスした際に、その"thetaid"は動画のものである場合は、302でリダイレクトされる。静止画も動画も存在しなければ、404。</dd>
  <dt>{thetaid}</dt>
  <dd>[0-9A-Za-z]の順で増える62進数の値。アップロードされた順にインクリメントされる。静止画か動画かで区別はされていない。</dd>
</dl>

また、旧仕様として、下記のURLとしてアップロードされていたこともある。
- http://theta360.com/spheres/{index}
<dl>
  <dt>{index}</dt>
  <dd>10進数の通し番号。0から999まで。</dd>
</dl>


