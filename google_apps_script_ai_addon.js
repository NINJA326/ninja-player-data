/**
 * NINJA PLAYER DATA v9 - AIプロジェクト設定対応
 *
 * 【準備】
 * Apps Script「プロジェクトの設定」→「スクリプト プロパティ」
 * OPENAI_API_KEY = OpenAI APIキー
 *
 * 既存doGet(e)のaction分岐へ追加：
 * case 'generateCoachComment':
 *   return jsonp_(e, generateCoachComment_(e.parameter.payload));
 */

function generateCoachComment_(payloadText) {
  try {
    const payload = JSON.parse(payloadText || '{}');
    const config = payload.aiConfig || {};
    const apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEYが設定されていません。');

    const lengthMap = {
      short: '全体で150〜220文字程度',
      standard: '全体で220〜320文字程度',
      detailed: '全体で350〜500文字程度'
    };
    const audienceMap = {
      coach: 'コーチが指導計画に使える、客観的で具体的な表現',
      player: '中学生本人が理解でき、次の行動が分かる表現',
      parent: '保護者へ共有しやすい、丁寧で分かりやすい表現'
    };
    const toneMap = {
      balanced: '標準的で客観的な表現',
      encouraging: '前向きで選手を励ます表現',
      direct: '改善課題を明確にした表現。ただし威圧的にしない',
      parent: '保護者へ共有しやすい丁寧な表現'
    };

    const systemPrompt = [
      'あなたは中学生バスケットボールチームの育成コーチです。',
      '以下は、このアプリに登録されたChatGPTプロジェクト相当の運用設定です。',
      '',
      '【チーム育成方針】',
      config.teamPolicy || '選手の主体性と段階的な成長を重視する。',
      '',
      '【評価基準】',
      config.evaluationRules || '数値だけで断定せず、継続性とデータ量を考慮する。',
      '',
      '【文章ルール】',
      config.writingRules || '成長、強み、今後の重点の3段落で作成する。',
      '',
      '【禁止表現・注意事項】',
      config.prohibited || '否定的、医学的、人格的な断定をしない。',
      '',
      '対象: ' + (audienceMap[config.audience] || audienceMap.coach),
      '文章量: ' + (lengthMap[config.length] || lengthMap.standard),
      '表現方針: ' + (toneMap[payload.tone] || toneMap.balanced),
      '',
      '数値から確認できる事実と、そこから考えられる推測を混同しないでください。',
      'データがない項目や記録数が少ない項目は、無理に評価しないでください。',
      '最後は具体的で前向きな次の行動につながる一文で締めてください。'
    ].join('\n');

    const analysisData = JSON.parse(JSON.stringify(payload));
    delete analysisData.aiConfig;
    delete analysisData.tone;

    const userPrompt = [
      '次の選手データから所見を作成してください。',
      '登録設定を最優先し、データに存在しない内容は作らないでください。',
      JSON.stringify(analysisData, null, 2)
    ].join('\n\n');

    const requestBody = {
      model: 'gpt-5-mini',
      input: [
        { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
        { role: 'user', content: [{ type: 'input_text', text: userPrompt }] }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'coach_comment',
          strict: true,
          schema: {
            type: 'object',
            properties: { comment: { type: 'string' } },
            required: ['comment'],
            additionalProperties: false
          }
        }
      }
    };

    const response = UrlFetchApp.fetch('https://api.openai.com/v1/responses', {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + apiKey },
      payload: JSON.stringify(requestBody),
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    const raw = response.getContentText();
    const body = JSON.parse(raw);
    if (code < 200 || code >= 300) {
      throw new Error(body.error && body.error.message ? body.error.message : 'OpenAI APIエラー');
    }

    let outputText = body.output_text || '';
    if (!outputText && Array.isArray(body.output)) {
      body.output.forEach(function(item) {
        (item.content || []).forEach(function(content) {
          if (content.type === 'output_text' && content.text) outputText += content.text;
        });
      });
    }
    if (!outputText) throw new Error('AIから所見が返されませんでした。');

    const parsed = JSON.parse(outputText);
    return { status: 'ok', comment: parsed.comment };
  } catch (err) {
    return { status: 'error', message: String(err.message || err) };
  }
}

function jsonp_(e, data) {
  const callback = (e.parameter.callback || 'callback').replace(/[^\w$.]/g, '');
  return ContentService
    .createTextOutput(callback + '(' + JSON.stringify(data) + ')')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}


/**
 * いいところ・改善点・方向性を個別生成
 * doGet(e) の action 分岐へ追加：
 * case 'generatePlayerFeedback':
 *   return jsonp_(e, generatePlayerFeedback_(e.parameter.payload));
 */
function generatePlayerFeedback_(payloadText) {
  try {
    const payload = JSON.parse(payloadText || '{}');
    const config = payload.aiConfig || {};
    const apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEYが設定されていません。');

    const audienceMap = {
      coach: 'コーチが指導計画に使える表現',
      player: '中学生本人に直接伝えられる、分かりやすく前向きな表現',
      parent: '保護者へ共有しやすい丁寧な表現'
    };

    const systemPrompt = [
      'あなたは中学生バスケットボールチームの育成コーチです。',
      '選手データから、所見とは別に「いいところ」「改善点」「方向性」の3項目を作成してください。',
      '',
      '【チーム育成方針】',
      config.teamPolicy || '主体性と段階的な成長を重視する。',
      '',
      '【評価基準】',
      config.evaluationRules || '数値だけで断定せず、継続性とデータ量を考慮する。',
      '',
      '【文章ルール】',
      config.writingRules || '具体的で前向きに記述する。',
      '',
      '【禁止表現・注意事項】',
      config.prohibited || '人格否定、医学的判断、根拠のない断定をしない。',
      '',
      '出力対象: ' + (audienceMap[config.audience] || audienceMap.coach),
      '',
      '作成ルール:',
      '1. いいところ：確認できる強み、成長、継続できている点を2〜4文で示す。',
      '2. 改善点：否定ではなく、次に伸ばす具体的課題を1〜3項目に絞る。',
      '3. 方向性：改善点に対して、練習や試合で何を意識するかを具体的に示す。',
      '4. データに存在しない内容は作らない。',
      '5. データ量が少ない場合は断定しない。',
      '6. 3項目は内容が重複しないようにする。'
    ].join('\n');

    const analysisData = JSON.parse(JSON.stringify(payload));
    delete analysisData.aiConfig;
    delete analysisData.tone;

    const requestBody = {
      model: 'gpt-5-mini',
      input: [
        { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
        { role: 'user', content: [{ type: 'input_text', text: JSON.stringify(analysisData, null, 2) }] }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'player_feedback',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              goodPoints: { type: 'string' },
              improvementPoints: { type: 'string' },
              futureDirection: { type: 'string' }
            },
            required: ['goodPoints', 'improvementPoints', 'futureDirection'],
            additionalProperties: false
          }
        }
      }
    };

    const response = UrlFetchApp.fetch('https://api.openai.com/v1/responses', {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + apiKey },
      payload: JSON.stringify(requestBody),
      muteHttpExceptions: true
    });

    const code = response.getResponseCode();
    const raw = response.getContentText();
    const body = JSON.parse(raw);
    if (code < 200 || code >= 300) {
      throw new Error(body.error && body.error.message ? body.error.message : 'OpenAI APIエラー');
    }

    let outputText = body.output_text || '';
    if (!outputText && Array.isArray(body.output)) {
      body.output.forEach(function(item) {
        (item.content || []).forEach(function(content) {
          if (content.type === 'output_text' && content.text) outputText += content.text;
        });
      });
    }
    if (!outputText) throw new Error('AIから結果が返されませんでした。');

    const parsed = JSON.parse(outputText);
    return {
      status: 'ok',
      goodPoints: parsed.goodPoints,
      improvementPoints: parsed.improvementPoints,
      futureDirection: parsed.futureDirection
    };
  } catch (err) {
    return { status: 'error', message: String(err.message || err) };
  }
}
