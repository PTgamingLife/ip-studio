/* ── IP Studio:Google OAuth 登入(仿 facialmonitor/js/auth.js)── */

/* Google OAuth 登入 */
async function loginWithGoogle() {
  const btn = document.getElementById('btn-google-login');
  if (btn) { btn.disabled = true; btn.textContent = '連接中…'; }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.href.split('?')[0].split('#')[0]
    }
  });

  if (error) {
    showToast('Google 登入失敗:' + (error.message ?? '請稍後再試'));
    if (btn) { btn.disabled = false; btn.textContent = '使用 Google 帳號登入'; }
  }
  // 無 error → 瀏覽器跳轉至 Google,後續由 onAuthStateChange 接管
}

/* 處理 OAuth 用戶(讀取或首登自建 ipapp_users 列) */
async function handleOAuthUser(session) {
  const authUser = session.user;
  const name = authUser.user_metadata?.full_name
            || authUser.user_metadata?.name
            || authUser.email?.split('@')[0]
            || '用戶';
  const email = authUser.email || '';

  const { data: existing } = await supabase
    .from('ipapp_users')
    .select('*')
    .eq('user_id', authUser.id)
    .maybeSingle();

  if (existing) {
    currentUser = existing;
    onLoggedIn();
    return;
  }

  // 首登 — RLS 只允許建自己的列,且 credits=3、is_admin=false(policy 強制)
  const { data: created, error } = await supabase
    .from('ipapp_users')
    .insert({
      user_id: authUser.id,
      email,
      display_name: name.slice(0, 60),
      credits: 3,
      is_admin: false
    })
    .select()
    .maybeSingle();

  if (error) {
    // 可能是並發已建立 → 重讀一次
    const { data: retry } = await supabase
      .from('ipapp_users')
      .select('*')
      .eq('user_id', authUser.id)
      .maybeSingle();
    if (retry) { currentUser = retry; onLoggedIn(); return; }
    showToast('建立帳號失敗:' + (error.message ?? '請重試'));
    return;
  }

  currentUser = created;
  showToast(`🎉 歡迎加入,${name}!已贈送 3 點免費額度`);
  onLoggedIn();
}

/* 登出 */
async function logout() {
  await supabase.auth.signOut();
  currentUser = null;
  showLogin();
}

/* 取目前 session 的 JWT(呼叫 Edge Function 用) */
async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/* 重新整理點數顯示(Edge Function 扣點後呼叫) */
async function refreshUser() {
  if (!currentUser) return;
  const { data } = await supabase
    .from('ipapp_users')
    .select('*')
    .eq('user_id', currentUser.user_id)
    .maybeSingle();
  if (data) {
    currentUser = data;
    document.querySelectorAll('.credits-num').forEach(el => {
      el.textContent = data.credits;
    });
  }
}

/* ── 初始化:監聽 OAuth 返回 + 還原 session ── */
document.addEventListener('DOMContentLoaded', () => {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session && !currentUser) {
      await handleOAuthUser(session);
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
    }
  });

  supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (currentUser) return;
    if (session) {
      await handleOAuthUser(session);
    } else {
      showLogin();
    }
  }).catch(() => {
    if (!currentUser) showLogin();
  });
});
