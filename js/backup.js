// 数据备份模块：JSON 导出 / 导入
// 依赖全局：supabaseClient、showToast、showConfirm、showAuthModal、loadAnimes

// ===== 导出全部数据为 JSON =====
async function exportBackup() {
  if (!supabaseClient) { showToast('⚠️ 未连接数据库', 'error'); return; }
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { showToast('请先登录', 'error'); showAuthModal(); return; }
  try {
    const { data, error } = await supabaseClient
      .from('animes')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw new Error(error.message);

    const backup = {
      version: 1,
      app: 'animelist',
      exported_at: new Date().toISOString(),
      animes: data || [],
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'animelist-backup-' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    showToast('✅ 已导出 ' + (data?.length || 0) + ' 部番剧', 'success');
  } catch (e) {
    showToast('导出失败: ' + e.message, 'error');
  }
}

// ===== 从 JSON 备份导入 =====
async function importBackup(file) {
  const input = document.getElementById('import-file');
  if (input) input.value = ''; // 允许再次选择同一文件
  if (!file) return;
  if (!supabaseClient) { showToast('⚠️ 未连接数据库', 'error'); return; }
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { showToast('请先登录', 'error'); showAuthModal(); return; }

  let parsed;
  try {
    parsed = JSON.parse(await file.text());
  } catch (e) {
    showToast('❌ 文件不是有效的 JSON', 'error');
    return;
  }

  const animes = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.animes) ? parsed.animes : null);
  if (!animes || animes.length === 0) {
    showToast('⚠️ 备份文件中没有番剧数据', 'error');
    return;
  }

  const ok = await showConfirm(
    '将从备份导入 ' + animes.length + ' 部番剧（同名番剧会重复添加，可导入后手动清理），确定继续？',
    '导入确认',
    '📥'
  );
  if (!ok) return;

  const userId = session.user.id;
  const now = new Date().toISOString();
  const validStatuses = ['想看', '在看', '看完', '搁置'];
  const rows = animes.map((a, i) => ({
    title: String((a && a.title) || '').trim(),
    total_episodes: a && a.total_episodes != null ? Number(a.total_episodes) || null : null,
    watched_episodes: a && a.watched_episodes != null ? Number(a.watched_episodes) || 0 : 0,
    status: a && validStatuses.includes(a.status) ? a.status : '想看',
    rating: a && a.rating != null ? Number(a.rating) || null : null,
    year: a && a.year != null ? Number(a.year) || null : null,
    notes: (a && a.notes) || null,
    poster_url: (a && a.poster_url) || null,
    anilist_id: a && a.anilist_id != null ? Number(a.anilist_id) || null : null,
    is_favorite: !!(a && a.is_favorite),
    sort_order: a && a.sort_order != null ? Number(a.sort_order) : i,
    user_id: userId,
    updated_at: now,
  })).filter(r => r.title);

  if (rows.length === 0) {
    showToast('⚠️ 没有可导入的有效数据（缺少标题）', 'error');
    return;
  }

  showToast('📥 正在导入 ' + rows.length + ' 部番剧...', 'success');
  // 分批插入，避免单次请求过大
  const CHUNK = 200;
  let imported = 0;
  try {
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { error } = await supabaseClient.from('animes').insert(rows.slice(i, i + CHUNK));
      if (error) throw new Error(error.message);
      imported += Math.min(CHUNK, rows.length - i);
    }
    showToast('✅ 已导入 ' + imported + ' 部番剧', 'success');
    await loadAnimes();
  } catch (e) {
    showToast('导入失败（已导入 ' + imported + ' 部）: ' + e.message, 'error');
    loadAnimes();
  }
}
// ===== 备份菜单（导出/导入） =====
function toggleBackupMenu() {
  const menu = document.getElementById('backup-menu');
  if (!menu) return;
  const open = menu.style.display === 'block';
  closeBackupMenu();
  if (!open) menu.style.display = 'block';
}

function closeBackupMenu() {
  const menu = document.getElementById('backup-menu');
  if (menu) menu.style.display = 'none';
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.backup-menu-wrap')) closeBackupMenu();
});
