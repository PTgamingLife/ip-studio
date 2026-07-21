/* ── IP Studio:Supabase 連線設定(heart-cards 專案,anon 金鑰可公開)── */
window.SUPABASE_URL = 'https://hhcubvixldieuwdeqnwc.supabase.co';
window.SUPABASE_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoY3Vidml4bGRpZXV3ZGVxbndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NjcyNDYsImV4cCI6MjA5MTE0MzI0Nn0.zkWxfm0FugSEL9zW6pwDFWPqmRJ3ystOZfU8yRL2lPo';
window.EDGE_FN_BASE = window.SUPABASE_URL + '/functions/v1';

/* ── OAuth URL 修正(必須在 createClient 前執行)──
   Google OAuth 有時回傳 %23access_token(URL 編碼的 #),
   Supabase 無法解析,需先還原為正常的 # fragment ── */
(function fixAuthUrl() {
  const href = window.location.href;
  if (href.includes('%23access_token')) {
    const tokenPart = decodeURIComponent(href.split('%23')[1] || '');
    if (tokenPart.includes('access_token')) {
      history.replaceState({}, document.title,
        window.location.pathname + '#' + tokenPart);
    }
  }
})();

/* 建立 Supabase Client(CDN 全域 window.supabase 是 library,覆蓋成 client 實例) */
if (!window.supabase?.from) {
  var _sbLib = window.supabase;
  window.supabase = _sbLib.createClient(window.SUPABASE_URL, window.SUPABASE_ANON);
}

/* ── 全域狀態 ── */
window.currentUser = window.currentUser ?? null; // ipapp_users 的列
