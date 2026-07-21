/* ── IP Studio 共用頂部導覽列(頁面選擇器)──
   自包含:注入樣式 + 連結,標示當前頁,依登入狀態顯示點數/後台。
   需在 config.js(建立 supabase)與 auth.js(定義 logout)之後載入。
   頁面只要放一個 <div id="topnav"></div> 當第一個 body 子元素即可。 */
(function () {
  const PAGES = [
    ['index.html', '主控台'],
    ['onboarding.html', '設定 IP'],
    ['analyze.html', '分析貼文'],
    ['model.html', '我的模型'],
    ['leaderboard.html', '排行榜'],
  ];
  const ADMIN_PAGE = ['admin.html', '後台'];

  // 忽略 .html 後綴比對(dev server 用無副檔名路由 /analyze,GitHub Pages 用 analyze.html)
  function baseName(f) {
    return (String(f || '').split('/').pop().split('?')[0].replace(/\.html$/, '')) || 'index';
  }
  function currentFile() {
    return baseName(location.pathname);
  }

  function injectStyle() {
    if (document.getElementById('ipnav-style')) return;
    const s = document.createElement('style');
    s.id = 'ipnav-style';
    s.textContent = `
    #topnav .ipnav{position:sticky;top:0;z-index:50;background:rgba(255,253,248,.93);
      -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border-bottom:1px solid var(--line,#e6dcc6)}
    #topnav .ipnav-in{max-width:900px;margin:0 auto;display:flex;align-items:center;gap:12px;padding:9px 16px}
    #topnav .brand{font-weight:800;font-size:15px;color:var(--ink,#2f2a20);white-space:nowrap}
    #topnav .brand span{color:var(--accent,#bd982f)}
    #topnav .links{display:flex;gap:3px;overflow-x:auto;flex:1;scrollbar-width:none}
    #topnav .links::-webkit-scrollbar{display:none}
    #topnav a.lk{white-space:nowrap;text-decoration:none;color:var(--ink-soft,#8b8069);font-size:13.5px;
      font-weight:600;padding:6px 11px;border-radius:8px;transition:background .12s,color .12s}
    #topnav a.lk.active{background:var(--accent-soft,rgba(189,152,47,.15));color:var(--accent,#bd982f)}
    #topnav a.lk:hover{color:var(--ink,#2f2a20)}
    #topnav .rt{display:flex;align-items:center;gap:8px;white-space:nowrap}
    #topnav .cr{background:var(--accent-soft,rgba(189,152,47,.15));color:var(--accent,#bd982f);
      border-radius:999px;padding:5px 12px;font-weight:800;font-size:13px}
    #topnav .lo{background:none;border:1px solid var(--line,#e6dcc6);color:var(--ink-soft,#8b8069);
      padding:5px 12px;border-radius:8px;font-size:12.5px;cursor:pointer}
    @media(max-width:560px){#topnav .brand{display:none}}
    `;
    document.head.appendChild(s);
  }

  function render(user) {
    const host = document.getElementById('topnav');
    if (!host) return;
    if (!user) { host.innerHTML = ''; return; } // 未登入:不顯示,讓登入頁 hero 露出
    const cur = currentFile();
    const pages = PAGES.slice();
    if (user.is_admin) pages.push(ADMIN_PAGE);
    const links = pages
      .map(([f, t]) => `<a class="lk${baseName(f) === cur ? ' active' : ''}" href="${f}">${t}</a>`)
      .join('');
    host.innerHTML = `<div class="ipnav"><div class="ipnav-in">
      <div class="brand">🎯 IP <span>Studio</span></div>
      <div class="links">${links}</div>
      <div class="rt">
        <span class="cr">⚡ <span class="credits-num">${user.credits ?? 0}</span> 點</span>
        <button class="lo" onclick="logout()">登出</button>
      </div>
    </div></div>`;
  }

  async function init() {
    if (!document.getElementById('topnav')) return;
    injectStyle();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { render(null); return; }
      const { data: u } = await supabase
        .from('ipapp_users')
        .select('credits,is_admin,display_name')
        .eq('user_id', session.user.id)
        .maybeSingle();
      render(u || { credits: 0, is_admin: false });
    } catch (e) { /* 靜默:導覽列非關鍵路徑 */ }
  }

  document.addEventListener('DOMContentLoaded', init);
  // 登入狀態改變(OAuth 返回、登出)時重繪
  if (window.supabase?.auth?.onAuthStateChange) {
    supabase.auth.onAuthStateChange(() => init());
  }
  window.refreshNav = init;
})();
