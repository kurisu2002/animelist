    // ============================================================
    // ⚠️ 请替换为你自己的 Supabase 项目信息
    // ============================================================
    const SUPABASE_URL = 'https://omiaoaricfqqcvihsspe.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9taWFvYXJpY2ZxcWN2aWhzc3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MDczOTgsImV4cCI6MjEwMDM4MzM5OH0.g-bfyuxo_S8Wtkfx8MZSpOpGLrzdeuQKbIHUhgk8dzA';

    // ============================================================
    // 初始化
    // ============================================================
    let supabaseClient = null;
    let allAnimes = [];
    let authMode = 'login'; // 'login' | 'register'

    function showAuthModal() {
      document.getElementById('auth-modal').style.display = 'flex';
      document.getElementById('auth-error').style.display = 'none';
      document.getElementById('auth-error').textContent = '';
      document.getElementById('auth-form').reset();
    }

    function toggleAuthMode() {
      authMode = authMode === 'login' ? 'register' : 'login';
      const isLogin = authMode === 'login';
      document.getElementById('auth-title').textContent = isLogin ? '🔐 登录' : '📝 注册';
      document.getElementById('auth-desc').textContent = isLogin ? '登录以同步你的补番目录' : '创建账号开始记录追番';
      document.getElementById('auth-submit-btn').textContent = isLogin ? '登 录' : '注 册';
      document.getElementById('auth-password2').style.display = isLogin ? 'none' : 'block';
      document.getElementById('auth-toggle-text').textContent = isLogin ? '还没有账号？' : '已有账号？';
      document.getElementById('auth-toggle-link').textContent = isLogin ? '去注册' : '去登录';
      document.getElementById('auth-error').style.display = 'none';
    }

    async function handleAuth() {
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value;
      const errEl = document.getElementById('auth-error');

      if (!email || !password) {
        errEl.textContent = '请填写邮箱和密码';
        errEl.style.display = 'block';
        return;
      }
      if (password.length < 6) {
        errEl.textContent = '密码至少需要6位';
        errEl.style.display = 'block';
        return;
      }

      if (authMode === 'register') {
        const password2 = document.getElementById('auth-password2').value;
        if (password !== password2) {
          errEl.textContent = '两次密码不一致';
          errEl.style.display = 'block';
          return;
        }
      }

      const btn = document.getElementById('auth-submit-btn');
      btn.textContent = '处理中...';
      btn.disabled = true;

      let result;
      if (authMode === 'login') {
        result = await supabaseClient.auth.signInWithPassword({ email, password });
      } else {
        result = await supabaseClient.auth.signUp({ email, password });
      }

      btn.textContent = authMode === 'login' ? '登 录' : '注 册';
      btn.disabled = false;

      if (result.error) {
        errEl.textContent = result.error.message;
        errEl.style.display = 'block';
        return;
      }

      if (authMode === 'register') {
        showToast('注册成功！已自动登录', 'success');
      }

      // 登录/注册成功
      document.getElementById('auth-modal').style.display = 'none';
      updateUserUI();
      loadAnimes();
    }

    async function logout() {
      if (supabaseClient) {
        try { await supabaseClient.auth.signOut(); } catch (e) { /* ignore */ }
      }
      document.getElementById('user-badge').style.display = 'none';
      document.getElementById('user-info-line').style.display = 'none';
      allAnimes = [];
      renderTable();
      showAuthModal();
      showToast('已退出登录', 'success');
    }

    function updateUserUI() {
      if (!supabaseClient) return;
      supabaseClient.auth.getSession().then(({ data }) => {
        const user = data?.session?.user;
        const badge = document.getElementById('user-badge');
        const logoutBtn = document.getElementById('logout-btn');
        const infoLine = document.getElementById('user-info-line');
        if (user) {
          const email = user.email || '';
          const meta = user.user_metadata || {};
          const username = meta.username || email.split('@')[0];
          const avatarUrl = meta.avatar_url || '';
          // Header 用户头像
          const iconEl = document.getElementById('user-icon');
          if (avatarUrl) {
            iconEl.innerHTML = '<img src="' + escapeAttr(avatarUrl) + '" alt="" onerror="this.parentElement.textContent=\'' + (username.charAt(0).toUpperCase()) + '\'">';
          } else {
            iconEl.textContent = username.charAt(0).toUpperCase();
          }
          // Header 用户名（不显示邮箱）
          document.getElementById('user-display').textContent = username;
          document.getElementById('user-email-sub').style.display = 'none';
          badge.style.display = '';
          logoutBtn.style.display = '';
          // 统计区（仅显示用户名）
          document.getElementById('user-info-email').textContent = username;
          infoLine.style.display = '';
        } else {
          badge.style.display = 'none';
          logoutBtn.style.display = 'none';
          infoLine.style.display = 'none';
        }
      });
    }

    // ============================================================
    // 个人资料编辑
    // ============================================================
    function openProfileModal() {
      document.getElementById('profile-error').style.display = 'none';
      document.getElementById('profile-error').textContent = '';
      document.getElementById('profile-avatar-file').value = '';
      supabaseClient.auth.getSession().then(({ data }) => {
        const meta = data?.session?.user?.user_metadata || {};
        const email = data?.session?.user?.email || '';
        document.getElementById('profile-username').value = meta.username || '';
        document.getElementById('profile-email').value = email;
        loadAvatarPreview(meta.avatar_url || '');
      });
      document.getElementById('profile-modal').style.display = 'flex';
    }

    function closeProfileModal() {
      document.getElementById('profile-modal').style.display = 'none';
    }

    function loadAvatarPreview(url) {
      const preview = document.getElementById('profile-avatar-preview');
      if (url) {
        preview.innerHTML = '<img src="' + escapeAttr(url) + '" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.textContent=\'?\';this.parentElement.style.background=\'var(--primary)\';">';
      } else {
        const name = document.getElementById('profile-username').value || document.getElementById('user-display').textContent || '?';
        preview.innerHTML = '';
        preview.textContent = name.charAt(0).toUpperCase();
      }
    }

    function previewAvatarFile(file) {
      const preview = document.getElementById('profile-avatar-preview');
      if (!file) { loadAvatarPreview(''); return; }
      if (file.size > 2 * 1024 * 1024) {
        document.getElementById('profile-error').textContent = '图片不能超过 2MB';
        document.getElementById('profile-error').style.display = 'block';
        return;
      }
      document.getElementById('profile-error').style.display = 'none';
      const reader = new FileReader();
      reader.onload = function(e) {
        preview.innerHTML = '<img src="' + e.target.result + '" style="width:100%;height:100%;object-fit:cover;">';
      };
      reader.readAsDataURL(file);
    }

    async function saveProfile() {
      const username = document.getElementById('profile-username').value.trim();
      const fileInput = document.getElementById('profile-avatar-file');
      const file = fileInput.files[0];
      const errEl = document.getElementById('profile-error');
      const btn = document.querySelector('#profile-modal .btn-primary');

      let avatarUrl = undefined;
      // 保留旧头像（如果没选新文件）
      const { data: { session } } = await supabaseClient.auth.getSession();
      const oldMeta = session?.user?.user_metadata || {};

      if (file) {
        btn.textContent = '上传中...';
        btn.disabled = true;
        try {
          const userId = session.user.id;
          const fileExt = file.name.split('.').pop();
          const filePath = userId + '/' + Date.now() + '.' + fileExt;
          const { data: uploadData, error: uploadError } = await supabaseClient
            .storage.from('avatars')
            .upload(filePath, file, { upsert: false, contentType: file.type });
          if (uploadError) throw new Error(uploadError.message);
          // Get public URL
          const { data: urlData } = supabaseClient.storage.from('avatars').getPublicUrl(filePath);
          avatarUrl = urlData?.publicUrl;
        } catch (e) {
          btn.textContent = '💾 保存';
          btn.disabled = false;
          errEl.textContent = '上传失败: ' + e.message;
          errEl.style.display = 'block';
          return;
        }
      } else {
        // No new file selected, keep old avatar
        avatarUrl = oldMeta.avatar_url || undefined;
      }

      btn.textContent = '💾 保存';
      btn.disabled = false;

      // Remove old avatar if it was on our storage
      if (oldMeta.avatar_url && oldMeta.avatar_url.includes('/avatars/') && avatarUrl !== oldMeta.avatar_url) {
        try {
          const oldPath = oldMeta.avatar_url.split('/avatars/')[1];
          if (oldPath) supabaseClient.storage.from('avatars').remove([oldPath]);
        } catch (e) { /* ignore */ }
      }

      try {
        const { error } = await supabaseClient.auth.updateUser({
          data: { username: username || undefined, avatar_url: avatarUrl }
        });
        if (error) { errEl.textContent = error.message; errEl.style.display = 'block'; return; }
      } catch (e) {
        errEl.textContent = '保存失败: ' + e.message;
        errEl.style.display = 'block';
        return;
      }

      closeProfileModal();
      updateUserUI();
      showToast('个人资料已更新', 'success');
    }

    function initSupabase() {
      // 检查 Supabase 库是否加载成功
      if (!window.supabase) {
        updateConnectionStatus(false);
        showToast('⚠️ Supabase 库加载失败，请检查网络或使用 VPN', 'error');
        document.getElementById('setup-modal').style.display = 'flex';
        const cached = localStorage.getItem('anime-tracker-cache');
        if (cached) {
          allAnimes = JSON.parse(cached);
          const hashFilter = restoreFilterFromHash();
          if (hashFilter !== '全部') { filterByStatus(hashFilter, true); } else { renderTable(); }
        }
        return;
      }

      if (!SUPABASE_URL.includes('xxxxxx') && !SUPABASE_KEY.includes('.....')) {
        try {
          supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: false,
            },
          });
          updateConnectionStatus(true);

          // Auth: 绑定表单提交
          document.getElementById('auth-form').addEventListener('submit', handleAuth);

          // 检查是否已登录
          supabaseClient.auth.getSession().then(({ data }) => {
            if (data.session) {
              updateUserUI();
              loadAnimes().then(() => {
                const hashFilter = restoreFilterFromHash();
                if (hashFilter !== '全部') { filterByStatus(hashFilter, true); }
              });
            } else {
              showAuthModal();
              // 加载本地缓存
              const cached = localStorage.getItem('anime-tracker-cache');
              if (cached) {
                allAnimes = JSON.parse(cached);
                const hashFilter = restoreFilterFromHash();
                if (hashFilter !== '全部') { filterByStatus(hashFilter, true); } else { renderTable(); }
              }
            }
          });

          // 监听 auth 状态变化
          supabaseClient.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') {
              document.getElementById('user-badge').style.display = 'none';
              document.getElementById('logout-btn').style.display = 'none';
              document.getElementById('user-info-line').style.display = 'none';
            }
          });
        } catch (e) {
          updateConnectionStatus(false);
          showToast('⚠️ Supabase 连接失败: ' + e.message, 'error');
        }
      } else {
        updateConnectionStatus(false);
        document.getElementById('setup-modal').style.display = 'flex';
        const cached = localStorage.getItem('anime-tracker-cache');
        if (cached) {
          allAnimes = JSON.parse(cached);
          renderTable();
        }
      }
    }

    function updateConnectionStatus(online) {
      const dot = document.getElementById('conn-dot');
      dot.className = 'connection-dot ' + (online ? 'online' : 'offline');
      dot.title = online ? '已连接 Supabase' : '未配置 Supabase - 请设置你的项目信息';
    }

    // ============================================================
    // 数据操作
    // ============================================================
    async function loadAnimes() {
      if (!supabaseClient) return;
      const { data, error } = await supabaseClient
        .from('animes')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        showToast('加载失败: ' + error.message, 'error');
        return;
      }
      allAnimes = data || [];
      // 缓存到本地
      localStorage.setItem('anime-tracker-cache', JSON.stringify(allAnimes));
      renderTable();
    }

    function autoSetWatched() {
      const status = document.getElementById('input-status').value;
      const total = parseInt(document.getElementById('input-total').value) || 0;
      if (status === '想看') {
        document.getElementById('input-watched').value = 0;
      } else if (status === '看完') {
        document.getElementById('input-watched').value = total;
      }
    }

    let editingId = null;  // 编辑模式下的番剧 ID，null 表示新增模式

    async function addAnime() {
      if (!supabaseClient) {
        showToast('请先配置 Supabase 连接信息', 'error');
        return;
      }
      // 检查登录状态
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) { showToast('请先登录', 'error'); showAuthModal(); return; }
      const title = document.getElementById('input-title').value.trim();
      if (!title) { showToast('请输入番剧名称', 'error'); return; }


      const total = document.getElementById('input-total').value;
      const totalNum = total ? parseInt(total) : 0;
      const status = document.getElementById('input-status').value;

      // 自动调整已看集数：想看 → 0，看完 → 总集数
      let watched;
      if (status === '想看') {
        watched = 0;
      } else if (status === '看完') {
        watched = totalNum || 0;
      } else {
        const w = document.getElementById('input-watched').value;
        watched = w ? parseInt(w) : 0;
      }

      const anilistId = document.getElementById('input-anilist-id').value;
      const year = document.getElementById('input-year').value;
      const rating = document.getElementById('input-rating').value;
      const poster = document.getElementById('input-poster').value.trim();
      const notes = document.getElementById('input-notes').value.trim();

      const saveData = {
        title,
        total_episodes: totalNum || null,
        watched_episodes: watched,
        status,
        rating: rating ? parseFloat(rating) : null,
        updated_at: new Date().toISOString(),
      };
      if (poster) saveData.poster_url = poster;
      if (notes) saveData.notes = notes;
      saveData.year = year ? parseInt(year) : null;
      if (anilistId) saveData.anilist_id = parseInt(anilistId);

      let error;
      const editedId = editingId; // 保存 ID（clearForm 会清掉）
      if (editedId) {
        // 编辑模式：更新已有记录
        ({ error } = await supabaseClient.from('animes').update(saveData).eq('id', editedId));
        if (error) { showToast('修改失败: ' + error.message, 'error'); return; }
        showToast('✅ 修改成功！', 'success');
      } else {
        // 新增模式：插入新记录，sort_order 设为最大值 + 1
        const maxOrder = allAnimes.length > 0 ? Math.max(...allAnimes.map(a => a.sort_order || 0)) : 0;
        saveData.sort_order = maxOrder + 1;
        ({ error } = await supabaseClient.from('animes').insert(saveData));
        if (error) { showToast('添加失败: ' + error.message, 'error'); return; }
        showToast('✅ 添加成功！', 'success');
      }

      clearForm();
      toggleAddPanel(false);
      await loadAnimes();
      if (editedId) moveToTop(editedId); // 静默置顶，下次刷新/切分类后生效
    }

    // 将番剧移到默认排序最上面（仅写 DB，不改本地状态，
    // 等下次 loadAnimes / 刷新 / 切分类后才在新位置显示）
    async function moveToTop(id) {
      const minOrder = allAnimes.length > 0 ? Math.min(...allAnimes.map(a => a.sort_order || 0)) : 0;
      const newOrder = minOrder - 1;
      await supabaseClient.from('animes').update({ sort_order: newOrder }).eq('id', id);
    }

    async function updateField(id, field, value) {
      if (!supabaseClient) return;
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) { showToast('请先登录', 'error'); showAuthModal(); return; }
      const updateData = { updated_at: new Date().toISOString() };

      if (['watched_episodes', 'rating', 'total_episodes'].includes(field)) {
        updateData[field] = value === '' ? null : parseInt(value);
      } else {
        updateData[field] = value;
      }

      // 进度调整时自动切换状态：0→想看 / 中间→在看 / 满→看完
      // 自动状态只写 DB，不更新本地，等切换类别/刷新后才在新分类显示
      let autoStatus = null;
      if (field === 'watched_episodes') {
        const anime = allAnimes.find(a => a.id === id);
        const newWatched = updateData.watched_episodes;
        if (newWatched === 0) {
          autoStatus = '想看';
        } else if (anime && anime.total_episodes && newWatched >= anime.total_episodes) {
          autoStatus = '看完';
        } else if (newWatched > 0) {
          autoStatus = '在看';
        }
        if (autoStatus) updateData.status = autoStatus;
      }

      // 乐观更新本地（不含自动状态，保持在当前分类视图中）
      const localUpdate = { ...updateData };
      if (autoStatus) delete localUpdate.status;
      const idx = allAnimes.findIndex(a => a.id === id);
      if (idx !== -1) {
        allAnimes[idx] = { ...allAnimes[idx], ...localUpdate };
        localStorage.setItem('anime-tracker-cache', JSON.stringify(allAnimes));
        renderTable();
      }
      if (autoStatus && idx !== -1 && allAnimes[idx].status !== autoStatus) {
        showToast('📌 状态已自动改为「' + autoStatus + '」（切分类后生效）', 'success');
      }

      const { error } = await supabaseClient.from('animes').update(updateData).eq('id', id);
      if (error) {
        const rowEl = document.querySelector(`tr[data-id="${id}"]`);
        if (rowEl) { rowEl.classList.add('row-save-failed'); setTimeout(() => rowEl.classList.remove('row-save-failed'), 600); }
        showToast('更新失败: ' + error.message, 'error');
        loadAnimes(); // 回滚
      } else {
        // 静默置顶：只更新 sort_order，不立即重新渲染
        // 等页面刷新 / 切换类别 / 翻页后才在新位置显示
        moveToTop(id);
        const rowEl = document.querySelector(`tr[data-id="${id}"]`);
        if (rowEl) { rowEl.classList.add('row-saved'); setTimeout(() => rowEl.classList.remove('row-saved'), 600); }
      }
    }

    // 自定义确认弹窗（替代原生 confirm，居中美观）
    function showConfirm(message, title = '确认', icon = '⚠️') {
      return new Promise((resolve) => {
        document.getElementById('confirm-icon').textContent = icon;
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        const modal = document.getElementById('confirm-modal');
        const okBtn = document.getElementById('confirm-ok-btn');
        const cancelBtn = document.getElementById('confirm-cancel-btn');

        function cleanup() {
          modal.style.display = 'none';
          okBtn.removeEventListener('click', onOk);
          cancelBtn.removeEventListener('click', onCancel);
        }

        function onOk() { cleanup(); resolve(true); }
        function onCancel() { cleanup(); resolve(false); }

        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        // 点击遮罩层关闭
        modal.onclick = (e) => { if (e.target === modal) onCancel(); };
        modal.style.display = 'flex';
      });
    }

    async function deleteAnime(id) {
      if (!supabaseClient) return;
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) { showToast('请先登录', 'error'); showAuthModal(); return; }
      if (!await showConfirm('确定要删除这部番吗？此操作不可撤销。', '删除确认', '🗑️')) return;

      const { error } = await supabaseClient.from('animes').delete().eq('id', id);
      if (error) { showToast('删除失败: ' + error.message, 'error'); return; }

      showToast('🗑️ 已删除', 'success');
      loadAnimes();
    }

    // ============================================================
    // 渲染
    // ============================================================
    let currentPage = 1;
    let sortColumn = null;   // 当前排序列: 'title'|'progress'|'status'|'rating'|'year'
    let sortDir = 0;         // 0=默认, 1=倒序, 2=正序
    let favFilter = false;   // 是否仅显示收藏
    const PAGE_SIZE = 12;
    let searchDebounceTimer = null;

    function debouncedSearch() {
      clearTimeout(searchDebounceTimer);
      const input = document.getElementById('search-input');
      const clearBtn = document.getElementById('search-clear');
      // 有内容时显示清除按钮
      clearBtn.style.display = input.value.trim() ? 'flex' : 'none';
      searchDebounceTimer = setTimeout(() => {
        // 清空搜索词时重置页码（改写前的值）
        if (!input.value.trim()) { currentPage = 1; clearBtn.style.display = 'none'; }
        renderTable();
      }, 200);
    }

    function toggleInputClear(inputId) {
      const input = document.getElementById(inputId);
      if (!input) return;
      const wrap = input.closest('.input-clear-wrap');
      const btn = wrap ? wrap.querySelector('.input-clear-btn') : null;
      if (btn) btn.style.display = input.value ? 'flex' : 'none';
    }

    function clearInput(inputId) {
      const input = document.getElementById(inputId);
      if (!input) return;
      input.value = '';
      input.focus();
      toggleInputClear(inputId);
      // 如果清空的是主搜索栏，重新渲染表格
      if (inputId === 'search-input') { currentPage = 1; renderTable(); }
      // 如果清空的是添加面板的搜索，关闭搜索结果
      if (inputId === 'anime-search') {
        document.getElementById('search-results').classList.remove('open');
      }
    }

    function fillTitleToSearch() {
      const title = document.getElementById('input-title').value.trim();
      if (!title) { showToast('⚠️ 请先填写番剧名称', 'error'); return; }
      const animeSearch = document.getElementById('anime-search');
      animeSearch.value = title;
      toggleInputClear('anime-search');
      animeSearch.focus();
      // 触发搜索
      const evt = new Event('input', { bubbles: true });
      animeSearch.dispatchEvent(evt);
    }

    // ===== 表头排序 =====
    function toggleSort(column) {
      // 点击同列：0(默认) → 1(倒序) → 2(正序) → 0(默认)
      if (sortColumn === column) {
        sortDir = (sortDir + 1) % 3;
      } else {
        sortColumn = column;
        sortDir = 1; // 首次点击新列：倒序
      }
      currentPage = 1;
      updateSortIndicators();
      renderTable();
    }

    function updateSortIndicators() {
      const arrows = { 0: '', 1: ' ↓', 2: ' ↑' };
      // 桌面端表头
      ['title','progress','status','rating','year'].forEach(col => {
        const el = document.getElementById('sort-' + col);
        if (!el) return;
        const active = col === sortColumn && sortDir > 0;
        el.textContent = active ? arrows[sortDir] : '';
        el.style.opacity = active ? '1' : '0';
        // 手机端排序栏
        const mobileEl = document.getElementById('mobile-sort-' + col);
        if (mobileEl) {
          mobileEl.style.color = active ? 'var(--primary)' : '';
          mobileEl.style.fontWeight = active ? '700' : '';
          mobileEl.textContent = mobileEl.textContent.replace(/ [↓↑]$/, '') + (active ? arrows[sortDir] : '');
        }
      });
    }

    // 排序比较函数
    function applySort(filtered) {
      // 默认排序：按 sort_order 升序
      if (!sortColumn || sortDir === 0) {
        return [...filtered].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      }

      const statusOrder = { '想看': 1, '在看': 2, '看完': 3, '搁置': 4 };
      const sorted = [...filtered];

      sorted.sort((a, b) => {
        let va, vb;
        switch (sortColumn) {
          case 'title':
            va = (a.title || '').toLowerCase();
            vb = (b.title || '').toLowerCase();
            break;
          case 'progress':
            va = a.total_episodes > 0 ? (a.watched_episodes || 0) / a.total_episodes : 0;
            vb = b.total_episodes > 0 ? (b.watched_episodes || 0) / b.total_episodes : 0;
            break;
          case 'status':
            va = statusOrder[a.status] || 0;
            vb = statusOrder[b.status] || 0;
            break;
          case 'rating':
            va = a.rating || 0;
            vb = b.rating || 0;
            break;
          case 'year':
            va = a.year || 0;
            vb = b.year || 0;
            break;
          default:
            return 0;
        }
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return sortDir === 1 ? -cmp : cmp; // 1=倒序, 2=正序
      });

      return sorted;
    }

    // ===== 状态点击弹出下拉选择 =====
    const statusCycle = ['想看', '在看', '看完', '搁置'];
    let statusMenuId = null; // 当前打开状态菜单的番剧ID

    function showStatusMenu(id, event) {
      event.stopPropagation();
      if (statusMenuId === id) { closeStatusMenu(); return; } // 再点关闭
      closeStatusMenu();
      statusMenuId = id;
      const badge = event.currentTarget;
      const rect = badge.getBoundingClientRect();
      const menu = document.createElement('div');
      menu.className = 'status-dropdown-menu';
      menu.id = 'status-dropdown-menu';
      menu.style.top = (rect.bottom + 2) + 'px';
      menu.style.left = Math.min(rect.left, window.innerWidth - 140) + 'px';
      const anime = allAnimes.find(a => a.id === id);
      const icons = { '想看': '👀', '在看': '📺', '看完': '✅', '搁置': '⏸️' };
      statusCycle.forEach(s => {
        const opt = document.createElement('div');
        opt.className = 'status-dropdown-option' + (anime && anime.status === s ? ' current' : '');
        opt.textContent = icons[s] + ' ' + s;
        opt.onclick = (e) => { e.stopPropagation(); selectStatus(id, s); };
        menu.appendChild(opt);
      });
      document.body.appendChild(menu);
      setTimeout(() => document.addEventListener('click', closeStatusMenu, { once: true }), 0);
    }

    function closeStatusMenu() {
      statusMenuId = null;
      const menu = document.getElementById('status-dropdown-menu');
      if (menu) menu.remove();
    }

    async function selectStatus(id, status) {
      closeStatusMenu();
      const anime = allAnimes.find(a => a.id === id);
      if (!anime || anime.status === status) return;
      if (!supabaseClient) { showToast('⚠️ 未连接数据库', 'error'); return; }
      const { error } = await supabaseClient.from('animes').update({ status }).eq('id', id);
      if (error) { showToast('❌ 更新失败', 'error'); return; }
      anime.status = status;
      renderTable();  // 先渲染状态变化（保持原位置）
      moveToTop(id);  // 再静默置顶，下次刷新/切分类后生效
    }

    // ===== 收藏切换 =====
    async function toggleFavorite(id) {
      const anime = allAnimes.find(a => a.id === id);
      if (!anime) return;
      const newFav = !anime.is_favorite;
      if (!supabaseClient) { showToast('⚠️ 未连接数据库', 'error'); return; }
      const { error } = await supabaseClient.from('animes').update({ is_favorite: newFav }).eq('id', id);
      if (error) { showToast('❌ 更新失败', 'error'); return; }
      anime.is_favorite = newFav;
      renderTable();
      showToast(newFav ? '⭐ 已收藏' : '已取消收藏', 'success');
    }

    // ===== AniList 数据更新（评分 + 总集数） =====
    function showUpdatePanel() {
      const old = document.getElementById('update-panel');
      if (old) old.remove();
      const bar = document.createElement('div');
      bar.id = 'update-panel';
      bar.innerHTML = '<div id="update-msg">🔄 准备中...</div><div class="progress-bar-wrap" style="width:100%;height:4px;margin-top:4px;"><div id="update-fill" class="progress-bar-fill" style="width:0%"></div></div><div id="update-detail" style="font-size:.7rem;color:var(--text-secondary);"></div>';
      Object.assign(bar.style, {
        position:'fixed',bottom:'60px',right:'16px',zIndex:'9999',
        background:'var(--card-bg)',border:'1px solid var(--border)',
        borderRadius:'8px',padding:'10px 14px',boxShadow:'var(--shadow-lg)',
        minWidth:'240px',maxWidth:'320px',fontSize:'.82rem'
      });
      document.body.appendChild(bar);
      return {
        set: (i, total, detail, changed) => {
          const pct = total > 0 ? Math.round((i/total)*100) : 0;
          const f = document.getElementById('update-fill');
          if (f) f.style.width = pct+'%';
          const m = document.getElementById('update-msg');
          if (m) m.textContent = `🔄 ${i}/${total} · 已更新 ${changed} 项`;
          const d = document.getElementById('update-detail');
          if (d) d.textContent = detail || '';
        },
        done: (total, changed) => {
          const m = document.getElementById('update-msg');
          if (m) m.textContent = `✅ 完成！${total} 部中更新了 ${changed} 部`;
          const d = document.getElementById('update-detail');
          if (d) d.textContent = '';
          setTimeout(() => bar.remove(), 5000);
        },
        remove: () => bar.remove()
      };
    }

    async function updateFromAniList(ids) {
      if (!supabaseClient) { showToast('⚠️ 未连接数据库', 'error'); return; }
      const panel = showUpdatePanel();
      const items = ids.map(id => allAnimes.find(a => a.id === id)).filter(Boolean);
      if (items.length === 0) { panel.done(0, 0); return; }
      let updated = 0;
      const total = items.length;
      const movedIds = []; // 收集需要置顶的 ID，在 renderTable 之后处理
      panel.set(0, total, '', 0);
      for (let i = 0; i < items.length; i++) {
        const a = items[i];
        panel.set(i + 1, total, '🔍 搜索: ' + a.title, updated);
        try {
          let media = null;
          let aniMedia = null; // AniList 结果（ID精确查 或 标题搜索）

          try {
            if (a.anilist_id) {
              // 有 AniList ID：直接按 ID 精确查询
              const q = `query($id:Int){Media(id:$id,type:ANIME){averageScore episodes seasonYear}}`;
              const res = await fetch('https://graphql.anilist.co', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: q, variables: { id: a.anilist_id } })
              });
              const json = await res.json();
              aniMedia = json?.data?.Media;
              if (!aniMedia) { a.anilist_id = null; } // ID 无效，清除后走搜索
            }
          } catch (e) { /* AniList ID 查询失败，回退搜索 */ }

          if (!aniMedia) {
            try {
              // 无有效 ID：AniList 按标题模糊搜索
              const searchTerms = [a.title];
              const cleaned = a.title.replace(/[（(][^)）]*[)）]/g, '').replace(/\s+/g, ' ').trim();
              if (cleaned && cleaned !== a.title && cleaned.length > 0) searchTerms.push(cleaned);
              const parts = a.title.split(/[\/·\s]+/).filter(p => p.length > 1);
              if (parts.length > 1) searchTerms.push(parts[parts.length - 1]);

              for (const term of searchTerms) {
                if (aniMedia) break;
                const q = `query($s:String){Page(page:1,perPage:1){media(search:$s,type:ANIME){id averageScore episodes seasonYear}}}`;
                const res = await fetch('https://graphql.anilist.co', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ query: q, variables: { s: term } })
                });
                const json = await res.json();
                aniMedia = json?.data?.Page?.media?.[0];
                if (aniMedia) panel.set(i + 1, total, '🔍 AniList: ' + (searchTerms.length > 1 && term !== a.title ? '重试: ' + term : a.title), updated);
              }
            } catch (e) { /* AniList 搜索失败 */ }
          }

          // Bangumi 搜索（始终执行，交叉验证——AniList ID 可能存错了）
          let bgmMedia = null;
          let bgmTitle = '';
          let bgmScore = -999;
          let bgmMatched = false;
          let bgmBestName = '';
          try {
            // 搜索词列表：原标题 + 去掉番季后缀的基础标题（如「第2部分」「Season 2」）
            const baseTitle = a.title.replace(/[（(][^)）]*[)）]/g, '').replace(/\s+/g, ' ').trim();
            const noSuffix = baseTitle.replace(/[-\s]*第[一二三四五六七八九十\d]+[季期部分部弹卷]|[-\s]*[sS]eason\s*\d+|[-\s]*Part\s*\d+|[-]*最终季|[-]*完结篇/g, '').trim();
            const bgmQueries = [a.title];
            if (noSuffix && noSuffix !== a.title && noSuffix.length > 0) bgmQueries.push(noSuffix);

            let items = [];
            for (const query of bgmQueries) {
              // 带重试的 fetch（最多 3 次，静默放弃不抛错）
              let bgmRes, ok = false;
              for (let retry = 0; retry < 3; retry++) {
                try {
                  bgmRes = await fetch('/api/bangumi-proxy?q=' + encodeURIComponent(query));
                  if (bgmRes.ok) { ok = true; break; }
                } catch (e) { /* 网络错误，重试 */ }
                await new Promise(r => setTimeout(r, (retry + 1) * 600));
              }
              if (!ok) continue; // 跳过这个查询，试下一个
              const bgmJson = await bgmRes.json();
              items = bgmJson.list || [];
              if (items.length > 0) break;
            }

            if (items.length > 0) {
              const storedTitle = a.title.replace(/[（(][^)）]*[)）]/g, '').replace(/\s+/g, '').toLowerCase();
              const seasonRe = /第[一二三四五六七八九十\d]+[季期卷部弹]|[sS]eason\s*\d|OVA|剧场版|劇場版|特別篇|总集篇|總集篇|SP\b|OAD|番外|[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]/;
              const allYears = items.map(it => it.air_date ? parseInt(String(it.air_date).substring(0, 4)) : NaN).filter(Boolean);
              const minYear = allYears.length > 0 ? Math.min(...allYears) : null;

              let bestItem = items[0];
              let bestScore = -999;

              for (const item of items) {
                const itemTitle = (item.name_cn || item.name || '').replace(/\s+/g, '').toLowerCase();
                if (itemTitle === storedTitle) { bestItem = item; bestScore = 1.0; break; }
                if (itemTitle.includes(storedTitle) || storedTitle.includes(itemTitle)) {
                  let score = Math.min(itemTitle.length, storedTitle.length) / Math.max(itemTitle.length, storedTitle.length);
                  const extraLen = Math.abs(itemTitle.length - storedTitle.length);
                  score -= extraLen * 0.015;
                  if (!seasonRe.test(storedTitle)) {
                    const extra = itemTitle.replace(storedTitle, '');
                    if (seasonRe.test(extra)) score -= 0.3;
                  }
                  if (a.year && item.air_date) {
                    const itemYear = parseInt(String(item.air_date).substring(0, 4));
                    if (itemYear === parseInt(String(a.year))) score += 0.2;
                  }
                  if (minYear && item.air_date && parseInt(String(item.air_date).substring(0, 4)) === minYear) {
                    score += 0.05;
                  }
                  if (score > bestScore) { bestScore = score; bestItem = item; }
                }
              }
              bgmScore = bestScore;
              if (bestScore > -999) {
                bgmMedia = {
                  averageScore: bestItem.score ? Math.round(parseFloat(bestItem.score) * 10) : null,
                  episodes: bestItem.eps_count || null,
                  seasonYear: bestItem.air_date ? parseInt(String(bestItem.air_date).substring(0, 4)) : null
                };
                bgmTitle = bestItem.name_cn || bestItem.name || a.title;
                bgmMatched = bestItem !== items[0];
                bgmBestName = bestItem.name || '';
              }
            }
          } catch (e) { /* Bangumi 失败静默跳过 */ }

          // 决策：Bangumi 高置信度(≥0.7) 优先于 AniList
          // AniList 的 ID 可能来自之前错误匹配，Bangumi 中文搜索更可靠
          if (bgmMedia && bgmScore >= 0.7) {
            media = bgmMedia;
            // 用 Bangumi 日文名反查 AniList 获取正确 ID
            if (!a.anilist_id && bgmBestName) {
              try {
                const aliasQ = `query($s:String){Page(page:1,perPage:1){media(search:$s,type:ANIME){id}}}`;
                const aliasRes = await fetch('https://graphql.anilist.co', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ query: aliasQ, variables: { s: bgmBestName } })
                });
                const aliasJson = await aliasRes.json();
                const aliasMatch = aliasJson?.data?.Page?.media?.[0];
                if (aliasMatch?.id) media.id = aliasMatch.id;
              } catch (e) { /* 静默跳过 */ }
            }
            // Bangumi 赢 → 清除可能错误的旧 AniList ID，用新获取的正确 ID
            if (a.anilist_id) { a.anilist_id = null; }
            panel.set(i + 1, total, '🔍 Bangumi: ' + bgmTitle + (bgmMatched ? ' (匹配)' : ''), updated);
          } else if (aniMedia) {
            media = aniMedia;
          }

          if (media) {
            const updates = {};
            // 评分：用 AniList 小数评分
            if (media.averageScore) {
              const decimal = parseFloat((media.averageScore / 10).toFixed(1));
              const curr = a.rating ? parseFloat(a.rating) : null;
              if (curr !== decimal) { updates.rating = decimal; }
            }
            // 总集数：用 AniList 数据（如果是有效数字且与现有不同）
            if (media.episodes && media.episodes > 0) {
              const currEp = a.total_episodes || 0;
              if (currEp !== media.episodes) { updates.total_episodes = media.episodes; }
            }
            // 年份更新
            if (media.seasonYear && media.seasonYear > 1900) {
              const currYear = a.year || 0;
              if (currYear !== media.seasonYear) { updates.year = media.seasonYear; }
            }
            // 如果是模糊搜索匹配到的，同时保存 AniList ID 供后续精确查询
            if (!a.anilist_id && media.id) {
              updates.anilist_id = media.id;
              a.anilist_id = media.id;
            }
            if (Object.keys(updates).length > 0) {
              await supabaseClient.from('animes').update(updates).eq('id', a.id);
              // 乐观更新本地
              if (updates.rating !== undefined) a.rating = updates.rating;
              if (updates.total_episodes !== undefined) a.total_episodes = updates.total_episodes;
              if (updates.year !== undefined) a.year = updates.year;
              if (updates.anilist_id !== undefined) a.anilist_id = updates.anilist_id;
              movedIds.push(a.id); // 收集 ID，稍后静默置顶
              updated++;
              const parts = [];
              if (updates.rating !== undefined) parts.push('评分→' + updates.rating);
              if (updates.total_episodes !== undefined) parts.push('总集→' + updates.total_episodes);
              if (updates.year !== undefined) parts.push('年份→' + updates.year);
              panel.set(i + 1, total, '✅ ' + a.title + ' ' + parts.join(', '), updated);
            } else {
              panel.set(i + 1, total, '⏭️ ' + a.title + ' 无需更新', updated);
            }
          } else {
            panel.set(i + 1, total, '❓ ' + a.title + ' 未找到', updated);
          }
        } catch (e) {
          console.error('更新出错: ' + a.title, e);
          panel.set(i + 1, total, '⚠️ ' + a.title + ': ' + (e.message || e), updated);
        }
        // 每 10 个暂停 3s 冷却，避免触发 API 限流
        if ((i + 1) % 10 === 0 && i + 1 < items.length) {
          panel.set(i + 1, total, '⏳ 冷却中...', updated);
          await new Promise(r => setTimeout(r, 3000));
        }
        await new Promise(r => setTimeout(r, 1000));
      }
      panel.done(total, updated);
      renderTable();
      // 静默置顶：渲染完后再更新 sort_order，避免立即跳转
      for (const id of movedIds) {
        moveToTop(id);
      }
    }

    function updateSelectedFromAniList() {
      if (batchSelected.size === 0) { showToast('⚠️ 请先勾选番剧', 'error'); return; }
      updateFromAniList(Array.from(batchSelected));
    }

    async function updateSingleFromAniList(id) {
      updateFromAniList([id]);
    }

    function selectAllBatch() {
      const search = (document.getElementById('search-input').value || '').toLowerCase();
      const filter = getSelectedFilter();
      let filtered = allAnimes;
      if (search) filtered = filtered.filter(a => a.title.toLowerCase().includes(search));
      if (filter !== '全部') filtered = filtered.filter(a => a.status === filter);
      if (favFilter) filtered = filtered.filter(a => a.is_favorite);
      const allIds = new Set(filtered.map(a => a.id));
      const allSelected = filtered.every(a => batchSelected.has(a.id));
      if (allSelected) {
        // 取消全选
        allIds.forEach(id => batchSelected.delete(id));
      } else {
        // 全选
        allIds.forEach(id => batchSelected.add(id));
      }
      updateBatchCount();
      updateSelectAllBtn();
      renderTable();
    }

    function updateSelectAllBtn() {
      const search = (document.getElementById('search-input').value || '').toLowerCase();
      const filter = getSelectedFilter();
      let filtered = allAnimes;
      if (search) filtered = filtered.filter(a => a.title.toLowerCase().includes(search));
      if (filter !== '全部') filtered = filtered.filter(a => a.status === filter);
      if (favFilter) filtered = filtered.filter(a => a.is_favorite);
      const allSelected = filtered.length > 0 && filtered.every(a => batchSelected.has(a.id));
      const btn = document.getElementById('select-all-btn');
      if (btn) {
        btn.textContent = allSelected ? '☑' : '☐';
        btn.title = allSelected ? '取消全选' : '全选';
      }
    }

    // ===== 收藏筛选 =====
    function filterFavorites() {
      favFilter = !favFilter;
      document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('active'));
      const cards = document.querySelectorAll('.stat-card');
      if (favFilter && cards[5]) {
        cards[5].classList.add('active');
      } else {
        favFilter = false;
        // 回到全部
        if (cards[0]) cards[0].classList.add('active');
        document.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
        const allOpt = document.querySelector('.custom-select-option[data-value="全部"]');
        if (allOpt) allOpt.classList.add('selected');
        document.querySelector('.custom-select-trigger').textContent = '📋 全部状态';
      }
      currentPage = 1;
      await loadAnimes(); // 重新拉取 DB，使置顶和自动状态生效
      if (favFilter) showToast('⭐ 已筛选收藏（再点一次取消）', 'success');
    }

    function clearSearch() {
      const input = document.getElementById('search-input');
      input.value = '';
      document.getElementById('search-clear').style.display = 'none';
      currentPage = 1;
      renderTable();
    }

    // ===== 批量操作 =====
    let batchMode = false;
    const batchSelected = new Set();  // 存储已选中的 anime id

    function toggleBatchMode() {
      batchMode = !batchMode;
      const btn = document.getElementById('batch-btn');
      const bar = document.getElementById('batch-bar');

      if (batchMode) {
        btn.classList.add('active');
        btn.innerHTML = '📋 批量';
        bar.style.display = 'flex';
        batchSelected.clear();
      } else {
        btn.classList.remove('active');
        btn.innerHTML = '📋 批量';
        bar.style.display = 'none';
        batchSelected.clear();
      }
      updateBatchCount();
      renderTable();
    }

    function toggleBatchCheck(itemId) {
      if (batchSelected.has(itemId)) {
        batchSelected.delete(itemId);
      } else {
        batchSelected.add(itemId);
      }
      updateBatchCount();
    }

    function updateBatchCount() {
      document.getElementById('batch-count').textContent = '已选 ' + batchSelected.size + ' 项';
      updateSelectAllBtn();
    }

    async function batchSetStatus(status) {
      if (batchSelected.size === 0) {
        showToast('⚠️ 请先勾选番剧', 'error');
        return;
      }
      if (!await showConfirm('确定将已选的 ' + batchSelected.size + ' 部番剧状态改为「' + status + '」？', '批量操作确认', '📋')) return;

      const ids = Array.from(batchSelected);
      let success = 0;
      for (const id of ids) {
        const { error } = await supabaseClient.from('animes').update({ status }).eq('id', id);
        if (!error) success++;
      }
      showToast('✅ 已更新 ' + success + '/' + ids.length + ' 部', 'success');
      batchSelected.clear();
      toggleBatchMode();  // 退出批量模式
      await loadAnimes();
      // 静默置顶：在 loadAnimes 之后更新 sort_order，避免立即跳转
      const minOrder = allAnimes.length > 0 ? Math.min(...allAnimes.map(a => a.sort_order || 0)) : 0;
      for (let i = 0; i < ids.length; i++) {
        moveToTop(ids[i]); // 每次都会重新计算 minOrder
      }
    }

    // ===== 自定义下拉选择器 =====
    function getSelectedFilter() {
      const sel = document.querySelector('.custom-select-option.selected');
      return sel ? sel.dataset.value : '全部';
    }

    function toggleCustomSelect() {
      const dd = document.getElementById('filter-dropdown');
      dd.classList.toggle('open');
    }
    function selectCustomOption(value, label) {
      document.getElementById('filter-dropdown').querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
      const opt = document.querySelector(`.custom-select-option[data-value="${value}"]`);
      if (opt) opt.classList.add('selected');
      document.querySelector('.custom-select-trigger').textContent = label;
      document.getElementById('filter-dropdown').classList.remove('open');
      filterByStatus(value);
    }
    document.addEventListener('click', e => {
      if (!e.target.closest('.custom-select')) {
        document.getElementById('filter-dropdown').classList.remove('open');
      }
    });

    async function filterByStatus(status, skipReload = false) {
      // 点击已激活的卡片 → 取消筛选，回到全部
      const statIndex = { '全部': 0, '在看': 1, '想看': 2, '看完': 3, '搁置': 4, '收藏': 5 };
      const cards = document.querySelectorAll('.stat-card');
      const targetCard = cards[statIndex[status]];
      if (targetCard && targetCard.classList.contains('active') && status !== '全部') {
        status = '全部';
      }

      favFilter = false; // 切换状态筛选时取消收藏筛选
      // 更新 URL hash（可分享链接）
      if (status === '全部') {
        history.replaceState(null, '', location.pathname + location.search);
      } else {
        history.replaceState(null, '', '#' + encodeURIComponent(status));
      }

      // 更新自定义下拉的选中状态
      const labels = { '全部': '📋 全部', '想看': '👀 想看', '在看': '📺 在看', '看完': '✅ 看完', '搁置': '⏸️ 搁置', '收藏': '⭐ 收藏' };
      document.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
      const opt = document.querySelector(`.custom-select-option[data-value="${status}"]`);
      if (opt) opt.classList.add('selected');
      document.querySelector('.custom-select-trigger').textContent = labels[status] || '📋 全部';
      favFilter = (status === '收藏');

      // 更新卡片高亮
      document.querySelectorAll('.stat-card').forEach(card => card.classList.remove('active'));
      if (cards[statIndex[status]]) {
        cards[statIndex[status]].classList.add('active');
      }
      currentPage = 1;
      if (skipReload) {
        renderTable(); // 使用当前缓存数据，不重新拉取
      } else {
        await loadAnimes(); // 重新拉取 DB，使置顶和自动状态生效
      }
    }

    // 页面加载时恢复 URL hash 中的筛选状态
    function restoreFilterFromHash() {
      if (location.hash) {
        const status = decodeURIComponent(location.hash.slice(1));
        const validStatuses = ['全部', '想看', '在看', '看完', '搁置'];
        if (validStatuses.includes(status)) {
          return status;
        }
      }
      return '全部';
    }

    function renderPagination(totalItems) {
      const container = document.getElementById('pagination');
      if (totalItems <= PAGE_SIZE) {
        container.innerHTML = '';
        return;
      }
      const totalPages = Math.ceil(totalItems / PAGE_SIZE);
      let html = '';
      html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(1)" title="第一页">⏮</button>`;
      html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">◀ 上一页</button>`;
      html += `<span class="page-info">${currentPage} / ${totalPages} 页</span>`;
      html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">下一页 ▶</button>`;
      html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${totalPages})" title="最后一页">⏭</button>`;
      html += `<span class="page-jump">跳至 <input type="number" id="page-jump-input" value="${currentPage}" min="1" max="${totalPages}" style="width:50px;text-align:center;" onkeydown="if(event.key==='Enter')jumpToPage()"> 页 <button onclick="jumpToPage()">GO</button></span>`;
      container.innerHTML = html;
    }

    async function goToPage(page) {
      currentPage = page;
      await loadAnimes(); // 重新拉取 DB，使置顶和自动状态生效
      document.querySelector('.table-wrapper').scrollIntoView({ behavior: 'smooth' });
    }

    function jumpToPage() {
      const input = document.getElementById('page-jump-input');
      const search = (document.getElementById('search-input').value || '').toLowerCase();
      const filter = getSelectedFilter();
      let filtered = allAnimes;
      if (search) filtered = filtered.filter(a => a.title.toLowerCase().includes(search));
      if (filter !== '全部') filtered = filtered.filter(a => a.status === filter);
      const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      let page = parseInt(input.value);
      if (isNaN(page) || page < 1) page = 1;
      if (page > totalPages) page = totalPages;
      goToPage(page);
    }

    function renderTable() {
      const search = (document.getElementById('search-input').value || '').toLowerCase();
      const filter = getSelectedFilter();

      let filtered = allAnimes;
      if (search) {
        filtered = filtered.filter(a => a.title.toLowerCase().includes(search));
        currentPage = 1;
      }
      if (filter !== '全部') {
        filtered = filtered.filter(a => a.status === filter);
      }
      if (favFilter) {
        filtered = filtered.filter(a => a.is_favorite);
      }
      // 应用排序（默认排序时保持原始顺序即 sort_order）
      filtered = applySort(filtered);
      // 防止页码越界
      const maxPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      if (currentPage > maxPage) currentPage = maxPage;

      // 更新统计（一次遍历）
      const stats = { total: allAnimes.length, '在看': 0, '想看': 0, '看完': 0, '搁置': 0 };
      let favCount = 0;
      for (const a of allAnimes) {
        if (stats[a.status] !== undefined) stats[a.status]++;
        if (a.is_favorite) favCount++;
      }
      document.getElementById('stat-total').textContent = stats.total;
      document.getElementById('stat-watching').textContent = stats['在看'];
      document.getElementById('stat-want').textContent = stats['想看'];
      document.getElementById('stat-done').textContent = stats['看完'];
      document.getElementById('stat-onhold').textContent = stats['搁置'];
      const favEl = document.getElementById('stat-favorites');
      if (favEl) favEl.textContent = favCount;

      const tbody = document.getElementById('table-body');
      const empty = document.getElementById('empty-state');

      if (filtered.length === 0) {
        tbody.innerHTML = '';
        empty.style.display = 'block';
        renderPagination(0);
      } else {
        empty.style.display = 'none';
        const start = (currentPage - 1) * PAGE_SIZE;
        const pageItems = filtered.slice(start, start + PAGE_SIZE);
        tbody.innerHTML = pageItems.map(item => {
          const maxEp = item.total_episodes || 0;
          const watched = item.watched_episodes || 0;
          const progressPercent = maxEp > 0 ? Math.round((watched / maxEp) * 100) : 0;
          const statusIcons = { '想看': '👀', '在看': '📺', '看完': '✅', '搁置': '⏸️' };
          const statusClassMap = { '想看': 'want', '在看': 'watching', '看完': 'done', '搁置': 'onhold' };
          const statusClass = statusClassMap[item.status] || 'done';
          const statusIcon = statusIcons[item.status] || '✅';
          // 评分颜色：<5绿 5-7蓝 7-8紫 8-9金 9+彩
          const r = parseFloat(item.rating) || 0;
          let ratingColorClass = 'rating-none';
          if (r > 0 && r < 5) ratingColorClass = 'rating-low';
          else if (r >= 5 && r < 7) ratingColorClass = 'rating-mid';
          else if (r >= 7 && r < 8) ratingColorClass = 'rating-high';
          else if (r >= 8 && r < 9) ratingColorClass = 'rating-gold';
          else if (r >= 9) ratingColorClass = 'rating-top';
          const ratingDisplay = item.rating != null ? `<span class="rating-num ${ratingColorClass}">${parseFloat(item.rating).toFixed(1)}</span>` : '<span class="rating-num rating-none">-</span>';
          // 收藏图标（显眼的金色星标）
          const favIcon = item.is_favorite ? ' <span class="fav-star" title="已收藏">⭐</span>' : '';
          const yearSortIndicator = (sortColumn === 'year' && sortDir > 0) ? (sortDir === 1 ? ' ↓' : ' ↑') : '';
const yearHtml = item.year ? `<span class="title-year" onclick="event.stopPropagation();event.preventDefault();toggleSort('year')"${yearSortIndicator ? ' style="color:var(--primary);opacity:1;"' : ''}>${item.year}${yearSortIndicator}</span>` : '';
          const titleDisplay = item.poster_url
            ? `<img src="${escapeHtml(item.poster_url)}" alt="" loading="lazy" decoding="async" class="poster-thumb" style="width:32px;height:45px;object-fit:cover;border-radius:4px;background:var(--border);" onerror="this.style.display='none'" onclick="event.stopPropagation();openLightbox('${escapeAttr(item.poster_url)}')"><div class="title-text-wrap"><span class="title-text">${escapeHtml(item.title)}</span>${yearHtml}</div>`
            : `<div class="title-text-wrap" style="grid-column:1/-1;"><span class="title-text">${escapeHtml(item.title)}</span>${yearHtml}</div>`;

          const checked = batchSelected.has(item.id) ? 'checked' : '';
          const batchCheckHtml = batchMode
            ? `<input type="checkbox" class="batch-checkbox" ${checked} onclick="event.stopPropagation();toggleBatchCheck(${item.id})" title="勾选此项">`
            : '';

          return `
            <tr class="sortable-row" draggable="${batchMode ? 'false' : 'true'}" data-id="${item.id}" data-sort="${item.sort_order || 0}">
              <td>
                <div class="title-cell${batchMode ? ' has-batch' : ''}" title="${escapeHtml(item.title)}">${batchCheckHtml}${titleDisplay}</div>
                ${item.notes ? `<small style="color:var(--text-secondary);">${escapeHtml(item.notes)}</small>` : ''}
              </td>
              <td>
                <div style="display:flex;align-items:center;gap:8px;" class="episode-cell">
                  <span class="episode-display" onclick="editEpisode(this, ${item.id})">${watched}</span>
                  <input type="number" value="${watched}" min="0" max="${maxEp || 9999}"
                    class="episode-input"
                    data-id="${item.id}"
                    onchange="updateField(${item.id}, 'watched_episodes', this.value);hideEpisodeInput(this)"
                    onblur="hideEpisodeInput(this)"
                    onkeydown="if(event.key==='Enter')this.blur()">
                  <span style="font-size:.85rem;color:var(--text-secondary);white-space:nowrap;">
                    / ${maxEp || '?'}
                  </span>
                  ${maxEp > 0 ? `
                    <div class="progress-bar-wrap" title="${progressPercent}%">
                      <div class="progress-bar-fill" style="width:${progressPercent}%"></div>
                    </div>
                  ` : ''}
                </div>
              </td>
              <td>
                <span class="status-badge ${statusClass} clickable-status" onclick="showStatusMenu(${item.id}, event)" title="点击选择状态">
                  ${statusIcon} ${item.status}${favIcon}
                </span>
              </td>
              <td>
                ${ratingDisplay}
              </td>
              <td>
                <div class="actions-cell">
                  <button class="btn btn-outline btn-sm fav-btn${item.is_favorite ? ' active' : ''}" onclick="toggleFavorite(${item.id})" title="${item.is_favorite ? '取消收藏' : '收藏'}">⭐</button>
                  <button class="btn btn-outline btn-sm" onclick="updateSingleFromAniList(${item.id})" title="从 AniList 更新评分和总集数">🔄</button>
                  <button class="btn btn-outline btn-sm" onclick="quickEdit(${item.id})" title="快速编辑">✏️</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteAnime(${item.id})" title="删除">🗑️</button>
                </div>
              </td>
            </tr>
          `;
        }).join('');
        renderPagination(filtered.length);
      }
    }

    // ============================================================
    // 辅助功能
    // ============================================================
    function toggleAddPanel(force) {
      const panel = document.getElementById('add-panel');
      const btn = document.getElementById('add-btn');
      const submitBtn = document.querySelector('#add-panel .btn-primary');
      if (!panel || !btn) return;
      if (typeof force === 'boolean') {
        if (force) panel.classList.add('open');
        else panel.classList.remove('open');
      } else {
        panel.classList.toggle('open');
      }
      if (panel.classList.contains('open')) {
        btn.textContent = '✖ 关闭';
        document.getElementById('input-title').focus();
        // 非编辑模式打开 → 清空表单，防止旧数据残留导致新增变重复
        if (!editingId) {
          clearFormFields();
          if (submitBtn) submitBtn.textContent = '✅ 确认添加';
        }
      } else {
        btn.textContent = '➕ 添加新番';
        editingId = null;
        clearFormFields();
        if (submitBtn) submitBtn.textContent = '✅ 确认添加';
      }
    }

    function clearFormFields() {
      ['input-title','input-year','input-total','input-watched','input-rating','input-poster','input-notes','input-anilist-id','anime-search'].forEach(id => {
        document.getElementById(id).value = '';
      });
      document.getElementById('input-status').value = '想看';
      document.getElementById('input-watched').value = '0';
      // 清空搜索结果下拉
      const results = document.getElementById('search-results');
      if (results) results.innerHTML = '';
      // 刷新搜索框清除按钮状态
      toggleInputClear('anime-search');
    }

    function clearForm() {
      clearFormFields();
      editingId = null;
      const submitBtn = document.querySelector('#add-panel .btn-primary');
      if (submitBtn) submitBtn.textContent = '✅ 确认添加';
    }

    function quickEdit(id) {
      const anime = allAnimes.find(a => a.id === id);
      if (!anime) return;
      document.getElementById('input-title').value = anime.title || '';
      document.getElementById('input-year').value = anime.year || '';
      document.getElementById('input-total').value = anime.total_episodes || '';
      document.getElementById('input-watched').value = anime.watched_episodes || 0;
      document.getElementById('input-status').value = anime.status || '在看';
      document.getElementById('input-rating').value = anime.rating != null ? parseFloat(anime.rating).toFixed(1) : '';
      document.getElementById('input-poster').value = anime.poster_url || '';
      document.getElementById('input-notes').value = anime.notes || '';
      document.getElementById('input-anilist-id').value = anime.anilist_id || '';
      editingId = id;
      const submitBtn = document.querySelector('#add-panel .btn-primary');
      if (submitBtn) submitBtn.textContent = '💾 保存修改';
      toggleAddPanel(true);
      document.getElementById('input-title').focus();
    }

    // 点击显示集数输入框
    function editEpisode(span, id) {
      const cell = span.closest('.episode-cell');
      const input = cell.querySelector('.episode-input');
      span.style.display = 'none';
      input.classList.add('active');
      input.focus();
      input.select();
    }

    // 隐藏集数输入框，更新显示值
    function hideEpisodeInput(input) {
      const cell = input.closest('.episode-cell');
      const span = cell.querySelector('.episode-display');
      input.classList.remove('active');
      span.textContent = input.value || '0';
      span.style.display = '';
    }

    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    function showToast(message, type = 'success') {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      toast.className = 'toast ' + type;
      toast.textContent = message;
      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity .3s';
        setTimeout(() => toast.remove(), 300);
      }, 3000);

      // 限制 toast 数量
      if (container.children.length > 5) {
        container.firstChild.remove();
      }
    }

    // ============================================================
    // 动画数据库搜索 (Bangumi 优先 + AniList 备用)
    // ============================================================
    let searchTimer = null;
    let searchId = 0;  // 请求编号，避免旧请求覆盖新结果
    const animeSearchInput = document.getElementById('anime-search');
    const searchResults = document.getElementById('search-results');

    animeSearchInput.addEventListener('input', function() {
      const query = this.value.trim();
      if (query.length < 2) {
        searchResults.classList.remove('open');
        return;
      }
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        const id = ++searchId;
        searchAnime(query, id);
      }, 300);
    });

    document.addEventListener('click', function(e) {
      if (!e.target.closest('.anime-search-wrap')) {
        searchResults.classList.remove('open');
      }
    });

    async function searchAnime(query, id) {
      searchResults.classList.add('open');
      searchResults.innerHTML = '<div class="search-loading">🔍 搜索中...</div>';

      // 同时请求 Bangumi 和 AniList（合并展示，互补数据）
      const [bgmResult, anilistResult] = await Promise.all([
        searchBangumi(query),
        searchAniList(query)
      ]);
      if (id !== searchId) return;  // 已有新搜索，丢弃旧结果

      const combined = [bgmResult, anilistResult].filter(Boolean).join('');
      if (combined) {
        searchResults.innerHTML = combined;
      } else {
        searchResults.innerHTML = '<div class="search-loading">⚠️ 搜索失败，请检查网络或手动填写</div>';
      }
    }

    async function searchBangumi(query) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        // 通过 Netlify Function 代理访问 Bangumi API（绕过 GFW）
        const res = await fetch(
          '/api/bangumi-proxy?q=' + encodeURIComponent(query),
          { signal: controller.signal }
        );
        clearTimeout(timeout);
        const json = await res.json();
        const items = json.list || [];

        if (items.length === 0) return null;

        return items.map(item => {
          const cnTitle = item.name_cn || '';
          const jpTitle = item.name || '';
          const mainTitle = cnTitle || jpTitle || '未知';
          const subTitle = cnTitle && jpTitle && cnTitle !== jpTitle ? jpTitle : '';
          const eps = item.eps_count || '?';
          const thumb = item.thumb || '';       // 小图：搜索列表显示
          const poster = item.poster || '';     // 大图：选番后填入表单
          const score = item.score || '';
          const date = item.air_date || '';
          const bgmYear = (date || '').substring(0, 4); // 从 "2024-01-15" 提取年份

          return `
            <div class="search-result-item" onclick="selectAnimeBgm(${item.id})"
                 data-id="${item.id}"
                 data-title="${escapeAttr(mainTitle)}"
                 data-episodes="${eps}"
                 data-poster="${escapeAttr(poster)}"
                 data-rating="${score}"
                 data-year="${bgmYear}"
                 data-jp-name="${escapeAttr(jpTitle)}">
              ${thumb ? `<img src="${thumb}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'">` : '<div style="width:40px;height:56px;background:var(--border);border-radius:4px;flex-shrink:0;"></div>'}
              <div class="search-result-info">
                <div class="title">🇨🇳 ${mainTitle}${subTitle ? ' <small style="color:var(--text-secondary);">/ ' + subTitle + '</small>' : ''}</div>
                <div class="meta">📅 ${date || '-'} · 📖 ${eps}集 · ⭐ ${score || '-'}</div>
              </div>
            </div>
          `;
        }).join('');
      } catch (e) {
        return null;
      }
    }

    async function searchAniList(query) {
      try {
        const gqlQuery = `
          query ($s: String) {
            Page(page: 1, perPage: 8) {
              media(search: $s, type: ANIME, sort: POPULARITY_DESC) {
                id title { english romaji native }
                episodes coverImage { large } averageScore seasonYear format
              }
            }
          }`;
        const res = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: gqlQuery, variables: { s: query } })
        });
        const json = await res.json();
        const items = (json.data?.Page?.media || []).filter(m => m.format !== 'MUSIC');

        if (items.length === 0) return null;

        return items.map(item => {
          const nativeTitle = item.title?.native || '';
          const engTitle = item.title?.english || item.title?.romaji || '';
          const mainTitle = nativeTitle || engTitle || '未知';
          const subTitle = nativeTitle && engTitle ? engTitle : '';
          const eps = item.episodes || '?';
          const poster = item.coverImage?.large || '';
          const score = item.averageScore ? (item.averageScore / 10).toFixed(1) : '';

          return `
            <div class="search-result-item" onclick="selectAnime(${item.id})"
                 data-malid="${item.id}"
                 data-title="${escapeAttr(mainTitle)}"
                 data-episodes="${eps}"
                 data-poster="${escapeAttr(poster)}"
                 data-rating="${score}"
                 data-year="${item.seasonYear || ''}">
              ${poster ? `<img src="${poster}" alt="" loading="lazy" decoding="async" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 56%22><rect fill=%22%23ddd%22 width=%2240%22 height=%2256%22/></svg>'">` : '<div style="width:40px;height:56px;background:var(--border);border-radius:4px;"></div>'}
              <div class="search-result-info">
                <div class="title">${mainTitle}${subTitle ? ' <small style="color:var(--text-secondary);">/ ' + subTitle + '</small>' : ''}</div>
                <div class="meta">📺 ${item.format||''} · 📅 ${item.seasonYear||''} · 📖 ${eps}集 · ⭐ ${score||'-'}</div>
              </div>
            </div>
          `;
        }).join('');
      } catch (e) {
        return null;
      }
    }

    // Bangumi 点击选择
    function selectAnimeBgm(id) {
      const item = document.querySelector(`.search-result-item[data-id="${id}"]`);
      if (!item) return;
      document.getElementById('input-title').value = item.dataset.title;
      document.getElementById('input-total').value = item.dataset.episodes !== '?' ? item.dataset.episodes : '';
      document.getElementById('input-poster').value = item.dataset.poster || '';
      if (item.dataset.year) {
        document.getElementById('input-year').value = item.dataset.year;
      }
      if (item.dataset.rating) {
        document.getElementById('input-rating').value = parseFloat(item.dataset.rating).toFixed(1);
      }
      // 清空旧的 AniList ID（Bangumi 结果需重新反查）
      document.getElementById('input-anilist-id').value = '';
      searchResults.classList.remove('open');
      animeSearchInput.value = '';
      // 用 Bangumi 日文名反查 AniList ID（供后续精确更新）
      if (item.dataset.jpName) {
        fetchAniListId(item.dataset.jpName).then(alid => {
          if (alid) document.getElementById('input-anilist-id').value = alid;
        });
      }
      showToast('✅ 已自动填充「' + item.dataset.title + '」', 'success');
    }

    async function fetchAniListId(name) {
      try {
        const q = `query($s:String){Page(page:1,perPage:1){media(search:$s,type:ANIME){id}}}`;
        const res = await fetch('https://graphql.anilist.co', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, variables: { s: name } })
        });
        const json = await res.json();
        return json?.data?.Page?.media?.[0]?.id || null;
      } catch (e) { return null; }
    }

    function selectAnime(malId) {
      const item = document.querySelector(`.search-result-item[data-malid="${malId}"]`);
      if (!item) return;

      document.getElementById('input-title').value = item.dataset.title;
      document.getElementById('input-total').value = item.dataset.episodes !== '?' ? item.dataset.episodes : '';
      document.getElementById('input-poster').value = item.dataset.poster || '';
      if (item.dataset.year) {
        document.getElementById('input-year').value = item.dataset.year;
      }
      if (item.dataset.rating) {
        document.getElementById('input-rating').value = parseFloat(item.dataset.rating).toFixed(1);
      }
      if (item.dataset.synopsis) {
        document.getElementById('input-notes').value = item.dataset.synopsis.substring(0, 200);
      }
      // 存储 AniList ID 供后续精确更新
      document.getElementById('input-anilist-id').value = item.dataset.malid || '';

      searchResults.classList.remove('open');
      animeSearchInput.value = '';
      showToast('✅ 已自动填充「' + item.dataset.title + '」', 'success');
    }

    function escapeAttr(str) {
      return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // ============================================================
    // Lightbox - 封面大图预览
    // ============================================================
    function openLightbox(url) {
      document.getElementById('lightbox-img').src = url;
      document.getElementById('lightbox').style.display = 'flex';
    }
    function closeLightbox() {
      document.getElementById('lightbox').style.display = 'none';
      document.getElementById('lightbox-img').src = '';
    }

    // ============================================================
    // 拖动排序（桌面拖动 + 移动端长按拖动）
    // ============================================================
    let draggedRow = null;
    let touchRow = null;
    let touchStartY = 0;
    let touchStartTime = 0;
    let touchDragging = false;
    let longPressTimer = null;

    function initDragEvents(tbody) {
      // ===== 桌面端：直接拖动 =====
      tbody.addEventListener('dragstart', e => {
        const row = e.target.closest('.sortable-row');
        if (!row) { e.preventDefault(); return; }
        if (e.target.closest('input,select,button,a')) { e.preventDefault(); return; }
        draggedRow = row;
        row.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
      });

      tbody.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });

      tbody.addEventListener('dragenter', e => {
        e.preventDefault();
        const row = e.target.closest('.sortable-row');
        if (row && row !== draggedRow) {
          document.querySelectorAll('.sortable-row.drag-over').forEach(r => r.classList.remove('drag-over'));
          row.classList.add('drag-over');
        }
      });

      tbody.addEventListener('dragleave', e => {
        const row = e.target.closest('.sortable-row');
        if (row) row.classList.remove('drag-over');
      });

      tbody.addEventListener('drop', async e => {
        e.preventDefault();
        const targetRow = e.target.closest('.sortable-row');
        document.querySelectorAll('.sortable-row.drag-over').forEach(r => r.classList.remove('drag-over'));
        try {
          if (targetRow && draggedRow && targetRow !== draggedRow) {
            await moveRow(draggedRow, targetRow);
          }
        } catch (err) {
          console.error('moveRow error:', err);
        }
        if (draggedRow) { draggedRow.classList.remove('dragging'); }
        draggedRow = null;
      });

      tbody.addEventListener('dragend', () => {
        if (draggedRow) draggedRow.classList.remove('dragging');
        draggedRow = null;
      });

      // ===== 移动端：长按 500ms 后触发拖动 =====
      tbody.addEventListener('touchstart', e => {
        const row = e.target.closest('.sortable-row');
        if (!row) return;
        if (e.target.closest('input,select,button,a')) return;
        touchRow = row;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
        touchDragging = false;
        clearTimeout(longPressTimer);
        longPressTimer = setTimeout(() => {
          touchDragging = true;
          touchRow.classList.add('dragging');
        }, 500);
      }, { passive: false });

      tbody.addEventListener('touchmove', e => {
        clearTimeout(longPressTimer);
        if (!touchRow) return;
        if (!touchDragging) {
          // 还没到长按时间就移动了，取消
          const dy = Math.abs(e.touches[0].clientY - touchStartY);
          if (dy > 8) { touchRow = null; }
          return;
        }
        e.preventDefault();
        const touchY = e.touches[0].clientY;
        const rows = [...tbody.querySelectorAll('.sortable-row')];
        for (const row of rows) {
          if (row === touchRow) continue;
          const rect = row.getBoundingClientRect();
          if (touchY > rect.top && touchY < rect.bottom) {
            rows.forEach(r => r.classList.remove('drag-over'));
            row.classList.add('drag-over');
            break;
          }
        }
      }, { passive: false });

      tbody.addEventListener('touchend', async () => {
        clearTimeout(longPressTimer);
        if (!touchRow) return;
        touchRow.classList.remove('dragging');
        const targetRow = tbody.querySelector('.sortable-row.drag-over');
        document.querySelectorAll('.sortable-row.drag-over').forEach(r => r.classList.remove('drag-over'));
        try {
          if (touchDragging && targetRow && targetRow !== touchRow) {
            await moveRow(touchRow, targetRow);
          }
        } catch (err) {
          console.error('moveRow error:', err);
        }
        touchRow = null;
        touchDragging = false;
      });
    }

    async function moveRow(fromRow, toRow) {
      const fromId = parseInt(fromRow.dataset.id);
      const toId = parseInt(toRow.dataset.id);
      if (fromId === toId) return;

      // 从当前页面显示的过滤后数据中获取排序信息
      const search = (document.getElementById('search-input').value || '').toLowerCase();
      const filter = getSelectedFilter();
      let filtered = allAnimes;
      if (search) filtered = filtered.filter(a => a.title.toLowerCase().includes(search));
      if (filter !== '全部') filtered = filtered.filter(a => a.status === filter);

      const fromIdx = filtered.findIndex(a => a.id === fromId);
      const toIdx = filtered.findIndex(a => a.id === toId);
      if (fromIdx === -1 || toIdx === -1) return;

      let newOrder;
      if (toIdx === 0) {
        // 放到最前面
        newOrder = (filtered[0].sort_order || 0) - 1;
      } else if (toIdx >= filtered.length - 1) {
        // 放到最后面
        newOrder = (filtered[filtered.length - 1].sort_order || 0) + 1;
      } else if (toIdx > fromIdx) {
        // 往下移：取目标行和下一行的中间值
        const prev = filtered[toIdx].sort_order || 0;
        const next = filtered[toIdx + 1].sort_order || 0;
        newOrder = (prev + next) / 2;
      } else {
        // 往上移：取目标行和上一行的中间值
        const prev = filtered[toIdx - 1].sort_order || 0;
        const next = filtered[toIdx].sort_order || 0;
        newOrder = (prev + next) / 2;
      }

      // 乐观更新本地数据
      const item = allAnimes.find(a => a.id === fromId);
      if (item) item.sort_order = newOrder;
      allAnimes.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      renderTable();

      // 更新数据库
      if (supabaseClient) {
        await supabaseClient.from('animes').update({ sort_order: newOrder }).eq('id', fromId);
      }

    }

    // ============================================================
    // 键盘快捷键
    // ============================================================
    document.addEventListener('keydown', e => {
      // Ctrl+N 或 Cmd+N：打开添加面板
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        toggleAddPanel(true);
      }
      // Escape：先关灯箱，再关添加面板
      if (e.key === 'Escape') {
        if (document.getElementById('lightbox').style.display === 'flex') {
          closeLightbox();
        } else {
          toggleAddPanel(false);
        }
      }
      // 左右箭头翻页（不在输入框内时）
      if (!e.target.closest('input,select,textarea')) {
        const search = (document.getElementById('search-input').value || '').toLowerCase();
        const filter = getSelectedFilter();
        let filtered = allAnimes;
        if (search) filtered = filtered.filter(a => a.title.toLowerCase().includes(search));
        if (filter !== '全部') filtered = filtered.filter(a => a.status === filter);
        const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
        if (e.key === 'ArrowLeft' && currentPage > 1) { e.preventDefault(); goToPage(currentPage - 1); }
        if (e.key === 'ArrowRight' && currentPage < totalPages) { e.preventDefault(); goToPage(currentPage + 1); }
      }
    });

    // ============================================================
    // 启动
    // ============================================================
    try {
      initSupabase();
    } catch (e) {
      console.error('初始化失败:', e);
    }

    // 初始化拖动排序
    initDragEvents(document.getElementById('table-body'));

    // 回到顶部按钮显示/隐藏
    window.addEventListener('scroll', () => {
      const btn = document.getElementById('back-to-top');
      if (btn) {
        btn.classList.toggle('visible', window.scrollY > 400);
      }
    }, { passive: true });

    // 注册 Service Worker (PWA)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    // ============================================================
    // 每日一言
    // ============================================================
    let quoteAborter = null;  // 取消进行中的请求，防止快速连点冲突

    async function fetchQuote(signal) {
      if (signal && signal.aborted) return;

      try {
        const res = await fetch('/api/random-quote?_t=' + Date.now(), {
          cache: 'no-store',
          signal: signal || null
        });
        const data = await res.json();
        if (signal && signal.aborted) return;
        if (data && data.hitokoto) {
          document.getElementById('daily-text').textContent = data.hitokoto;
          document.getElementById('daily-from').textContent = data.from || '';
          // 缓存最新一条作为离线回退
          localStorage.setItem('anime-quote-fallback', JSON.stringify({ hitokoto: data.hitokoto, from: data.from || '' }));
        }
      } catch (e) {
        if (e.name === 'AbortError') return;
        // 网络失败时用上次缓存兜底
        const fb = localStorage.getItem('anime-quote-fallback');
        if (fb) {
          try {
            const q = JSON.parse(fb);
            document.getElementById('daily-text').textContent = q.hitokoto;
            document.getElementById('daily-from').textContent = q.from;
          } catch (_) { /* ignore */ }
        }
      }
    }

    function refreshQuote() {
      if (quoteAborter) { quoteAborter.abort(); }
      quoteAborter = new AbortController();

      document.getElementById('daily-text').textContent = '加载中...';
      document.getElementById('daily-from').textContent = '';
      fetchQuote(quoteAborter.signal);
    }

    // 初始化
    (function initDailyQuote() {
      const now = new Date();
      const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const dateStr = now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日 · ' + weekDays[now.getDay()];
      document.getElementById('daily-date').textContent = '📅 ' + dateStr;
      refreshQuote();

    })();
