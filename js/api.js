/* ── IP Studio:呼叫 Edge Function 的封裝 ──
   自動帶使用者 JWT(access_token)、429/503 指數退避重試。
   依賴 config.js 的 window.EDGE_FN_BASE 與 auth.js 的 getAccessToken()。 */

async function callFn(fnName, payload, { retries = 6, onRetry = null } = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error('尚未登入');
  const url = `${window.EDGE_FN_BASE}/${fnName}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
    } catch (netErr) {
      if (attempt === retries) throw new Error('網路連線失敗,請稍後再試');
      await sleep(1500 * attempt);
      continue;
    }

    // 系統忙碌 → 退避重試
    if (res.status === 429 || res.status === 503 || res.status === 529) {
      if (attempt === retries) throw new Error('系統忙碌,請稍後再試(已重試多次)');
      const wait = Math.min(3000 * Math.pow(1.5, attempt - 1), 30000) + Math.random() * 1500;
      if (onRetry) onRetry(attempt, retries, Math.round(wait / 1000));
      await sleep(wait);
      continue;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // 把後端錯誤碼翻成中文
      const map = {
        unauthorized: '登入已過期,請重新登入',
        insufficient_credits: '點數不足,請至後台加值',
        no_ip_yet: '請先完成「設定我的 IP」',
        missing_proposal: '缺少提案資料',
      };
      const msg = map[data.error] || data.error || `發生錯誤 (${res.status})`;
      const err = new Error(msg);
      err.code = data.error;
      err.status = res.status;
      throw err;
    }
    return data;
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
