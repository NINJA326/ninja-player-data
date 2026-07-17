/**
 * NINJA PLAYER DATA v24 バックエンド差し替え部分
 *
 * 1. 既存の doGet(e) を下記 doGet(e) に置き換える
 * 2. playerBundle_ / prepareReadSheets_ をコード末尾へ追加する
 * 3. 保存後「デプロイを管理」→編集→新しいバージョン→デプロイ
 *
 * 既存関数:
 * listPlayers_ / playerDetail_ / growthRecords_ / agilityRecords_
 * setupSheets_ / json_ / log_
 * をそのまま利用します。
 */

function doGet(e) {
  const p = e && e.parameter ? e.parameter : {};
  const callback = p.callback;
  let result;

  try {
    const action = String(p.action || '');

    // 読み取りのたびに移行・並べ替え処理を実行しない。
    // 必須シートがない初回だけ setupSheets_ を実行する。
    prepareReadSheets_();

    if (action === 'coachAddPlayer') result = coachAddPlayer_(p);
    else if (action === 'loginPlayer') result = loginPlayer_(p);
    else if (action === 'changePassword') result = changePassword_(p);
    else if (action === 'rankings') result = getRankings_();
    else if (action === 'listPlayers' || action === 'players') result = listPlayers_();
    else if (action === 'playerBundle') result = playerBundle_(p.playerId);
    else if (action === 'playerDetail') result = playerDetail_(p.playerId);
    else if (action === 'playerRecords') result = playerRecords_(p.playerId);
    else if (action === 'growthRecords') result = growthRecords_(p.playerId);
    else if (action === 'growthSummary') result = growthSummary_();
    else if (action === 'agilityRecords') result = agilityRecords_(p.playerId);
    else if (action === 'agilityRankings') result = agilityRankings_();
    else if (action === 'agilitySummary') result = agilitySummary_();
    else if (action === 'updatePlayerCategory') result = updatePlayerCategory_(p);
    else if (action === 'dashboard') result = dashboard_();
    else if (action === 'setup') {
      setupSheets_();
      result = { status:'ok', app:'NINJA PLAYER DATA v24', setup:true };
    } else {
      result = { status:'ok', app:'NINJA PLAYER DATA v24' };
    }
  } catch (err) {
    try { log_('GET_ERROR', String(err)); } catch (_) {}
    result = { status:'error', message:String(err && err.message || err) };
  }

  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${JSON.stringify(result)})`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return json_(result);
}

function prepareReadSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const required = [
    SHEET_PLAYERS,
    SHEET_RECORDS,
    SHEET_SUMMARY,
    SHEET_BODY_MATRIX,
    SHEET_AGILITY_MATRIX
  ];
  const missing = required.some(name => !ss.getSheetByName(name));
  if (missing) setupSheets_();
}

function playerBundle_(playerId) {
  const id = String(playerId || '').trim();
  if (!id) return { status:'error', message:'選手IDがありません。' };

  // 1回のWeb通信内で必要データをまとめて返す。
  const shooting = playerDetail_(id);
  if (!shooting || shooting.status !== 'ok') return shooting || { status:'error', message:'シューティングデータ取得失敗' };

  const growth = growthRecords_(id);
  if (!growth || growth.status !== 'ok') return growth || { status:'error', message:'身体測定データ取得失敗' };

  const agility = agilityRecords_(id);
  if (!agility || agility.status !== 'ok') return agility || { status:'error', message:'アジリティデータ取得失敗' };

  return {
    status:'ok',
    playerId:id,
    player:shooting.player || growth.player || agility.player || null,
    shooting:shooting,
    growth:{ records:growth.records || [] },
    agility:{ records:agility.records || [] },
    generatedAt:new Date().toISOString()
  };
}
