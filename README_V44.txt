NINJA AIRS COACH APP v44 完全置き換え版

【Apps Script側】
NINJA AIRS コーチアプリ用Apps Scriptの「コード.gs」を
NINJA_AIRS_COACH_API_v44_Code.gs で完全置き換えます。

必須スクリプトプロパティ:
PLAYER_SPREADSHEET_ID = 選手成長データのスプレッドシートID
SCHEDULE_SPREADSHEET_ID = 1fjebvFkhZiB6xipxtjhHBTE3Is-9L4JMeoR0yxyKlCw

保存後、既存のウェブアプリデプロイを「新しいバージョン」で更新します。
実行ユーザー: 自分
アクセスできるユーザー: 全員

【GitHub側】
ninja-player-data の以下4ファイルを完全上書きします。
index.html
manifest.json
sw.js
icon.svg

【主な修正】
・毎回のシート準備、移行、削除処理を廃止
・doGetで必要なデータだけを読み込み
・選手1名のデータをplayerBundleで一括返却
・予定表の巨大範囲読込を防止
・Service Workerをv44へ更新
・既存LINE入力用Apps Scriptは変更しない
