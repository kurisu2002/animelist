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
          if (hashFilter !== '全部') { filterByStatus(hashFilter); } else { renderTable(); }
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
              loadAnimes();
            } else {
              showAuthModal();
              // 加载本地缓存
              const cached = localStorage.getItem('anime-tracker-cache');
              if (cached) {
                allAnimes = JSON.parse(cached);
                const hashFilter = restoreFilterFromHash();
                if (hashFilter !== '全部') { filterByStatus(hashFilter); } else { renderTable(); }
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
      // 恢复 URL hash 中的筛选状态
      const hashFilter = restoreFilterFromHash();
      if (hashFilter !== '全部') {
        filterByStatus(hashFilter);
      } else {
        renderTable();
      }
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

      const year = document.getElementById('input-year').value;
      const rating = document.getElementById('input-rating').value;
      const poster = document.getElementById('input-poster').value.trim();
      const notes = document.getElementById('input-notes').value.trim();

      const saveData = {
        title,
        total_episodes: totalNum || null,
        watched_episodes: watched,
        status,
        rating: rating ? parseInt(rating) : null,
        updated_at: new Date().toISOString(),
      };
      if (poster) saveData.poster_url = poster;
      if (notes) saveData.notes = notes;
      saveData.year = year ? parseInt(year) : null;

      let error;
      if (editingId) {
        // 编辑模式：更新已有记录
        ({ error } = await supabaseClient.from('animes').update(saveData).eq('id', editingId));
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
      loadAnimes();
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

      // 乐观更新（先更新本地再同步）
      const idx = allAnimes.findIndex(a => a.id === id);
      if (idx !== -1) {
        allAnimes[idx] = { ...allAnimes[idx], ...updateData };
        localStorage.setItem('anime-tracker-cache', JSON.stringify(allAnimes));
        renderTable();
      }

      const { error } = await supabaseClient.from('animes').update(updateData).eq('id', id);
      if (error) {
        const rowEl = document.querySelector(`tr[data-id="${id}"]`);
        if (rowEl) { rowEl.classList.add('row-save-failed'); setTimeout(() => rowEl.classList.remove('row-save-failed'), 600); }
        showToast('更新失败: ' + error.message, 'error');
        loadAnimes(); // 回滚
      } else {
        const rowEl = document.querySelector(`tr[data-id="${id}"]`);
        if (rowEl) { rowEl.classList.add('row-saved'); setTimeout(() => rowEl.classList.remove('row-saved'), 600); }
      }
    }

    async function deleteAnime(id) {
      if (!supabaseClient) return;
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) { showToast('请先登录', 'error'); showAuthModal(); return; }
      if (!confirm('确定要删除这部番吗？此操作不可撤销。')) return;

      const { error } = await supabaseClient.from('animes').delete().eq('id', id);
      if (error) { showToast('删除失败: ' + error.message, 'error'); return; }

      showToast('🗑️ 已删除', 'success');
      loadAnimes();
    }

    // ============================================================
    // 渲染
    // ============================================================
    let currentPage = 1;
    const PAGE_SIZE = 20;
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
    }

    async function batchSetStatus(status) {
      if (batchSelected.size === 0) {
        showToast('⚠️ 请先勾选番剧', 'error');
        return;
      }
      if (!confirm('确定将已选的 ' + batchSelected.size + ' 部番剧状态改为「' + status + '」？')) return;

      const ids = Array.from(batchSelected);
      let success = 0;
      for (const id of ids) {
        const { err } = await supabaseClient.from('animes').update({ status: status }).eq('id', id);
        if (!err) success++;
      }
      showToast('✅ 已更新 ' + success + '/' + ids.length + ' 部', 'success');
      batchSelected.clear();
      toggleBatchMode();  // 退出批量模式
      loadAnimes();
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

    function filterByStatus(status) {
      // 更新 URL hash（可分享链接）
      if (status === '全部') {
        history.replaceState(null, '', location.pathname + location.search);
      } else {
        history.replaceState(null, '', '#' + encodeURIComponent(status));
      }

      // 更新自定义下拉的选中状态
      const labels = { '全部': '📋 全部状态', '想看': '👀 想看', '在看': '📺 在看', '看完': '✅ 看完', '搁置': '⏸️ 搁置', '弃番': '🚫 弃番' };
      document.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
      const opt = document.querySelector(`.custom-select-option[data-value="${status}"]`);
      if (opt) opt.classList.add('selected');
      document.querySelector('.custom-select-trigger').textContent = labels[status] || '📋 全部状态';

      // 更新卡片高亮
      document.querySelectorAll('.stat-card').forEach(card => card.classList.remove('active'));
      const statIndex = { '全部': 0, '在看': 1, '想看': 2, '看完': 3, '搁置': 4, '弃番': 5 };
      const cards = document.querySelectorAll('.stat-card');
      if (statIndex[status] !== undefined && cards[statIndex[status]]) {
        cards[statIndex[status]].classList.add('active');
      }
      currentPage = 1;
      renderTable();
    }

    // 页面加载时恢复 URL hash 中的筛选状态
    function restoreFilterFromHash() {
      if (location.hash) {
        const status = decodeURIComponent(location.hash.slice(1));
        const validStatuses = ['全部', '想看', '在看', '看完', '搁置', '弃番'];
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

    function goToPage(page) {
      currentPage = page;
      renderTable();
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
      // 防止页码越界
      const maxPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      if (currentPage > maxPage) currentPage = maxPage;

      // 更新统计（一次遍历）
      const stats = { total: allAnimes.length, '在看': 0, '想看': 0, '看完': 0, '搁置': 0, '弃番': 0 };
      for (const a of allAnimes) { if (stats[a.status] !== undefined) stats[a.status]++; }
      document.getElementById('stat-total').textContent = stats.total;
      document.getElementById('stat-watching').textContent = stats['在看'];
      document.getElementById('stat-want').textContent = stats['想看'];
      document.getElementById('stat-done').textContent = stats['看完'];
      document.getElementById('stat-onhold').textContent = stats['搁置'];
      document.getElementById('stat-dropped').textContent = stats['弃番'];

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
          const statusIcons = { '想看': '👀', '在看': '📺', '看完': '✅', '搁置': '⏸️', '弃番': '🚫' };
          const statusClassMap = { '想看': 'want', '在看': 'watching', '看完': 'done', '搁置': 'onhold', '弃番': 'dropped' };
          const statusClass = statusClassMap[item.status] || 'done';
          const statusIcon = statusIcons[item.status] || '✅';
          const stars = item.rating ? '⭐'.repeat(Math.min(item.rating, 10)) : '-';
          const yearHtml = item.year ? `<span class="title-year">📅 ${item.year}</span>` : '';
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
                <span class="status-badge ${statusClass}">
                  ${statusIcon} ${item.status}
                </span>
              </td>
              <td>
                <span class="rating-stars" title="${item.rating || '未评分'} / 10">${stars}</span>
              </td>
              <td>
                <div class="actions-cell">
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
      ['input-title','input-year','input-total','input-watched','input-rating','input-poster','input-notes'].forEach(id => {
        document.getElementById(id).value = '';
      });
      document.getElementById('input-status').value = '在看';
      document.getElementById('input-watched').value = '0';
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
      document.getElementById('input-rating').value = anime.rating || '';
      document.getElementById('input-poster').value = anime.poster_url || '';
      document.getElementById('input-notes').value = anime.notes || '';
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

      // 先尝试 Bangumi（中文名），失败则用 AniList
      const bgmResult = await searchBangumi(query);
      if (id !== searchId) return;  // 已有新搜索，丢弃旧结果
      if (bgmResult) {
        searchResults.innerHTML = bgmResult;
        return;
      }

      const anilistResult = await searchAniList(query);
      if (id !== searchId) return;
      if (anilistResult) {
        searchResults.innerHTML = anilistResult;
        return;
      }

      if (id === searchId) {
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

          return `
            <div class="search-result-item" onclick="selectAnimeBgm(${item.id})"
                 data-id="${item.id}"
                 data-title="${escapeAttr(mainTitle)}"
                 data-episodes="${eps}"
                 data-poster="${escapeAttr(poster)}"
                 data-rating="${score}">
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
      if (item.dataset.rating && !document.getElementById('input-rating').value) {
        document.getElementById('input-rating').value = Math.round(parseFloat(item.dataset.rating));
      }
      searchResults.classList.remove('open');
      animeSearchInput.value = '';
      showToast('✅ 已自动填充「' + item.dataset.title + '」', 'success');
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
      if (item.dataset.rating && !document.getElementById('input-rating').value) {
        document.getElementById('input-rating').value = Math.round(parseFloat(item.dataset.rating));
      }
      if (item.dataset.synopsis && !document.getElementById('input-notes').value) {
        document.getElementById('input-notes').value = item.dataset.synopsis.substring(0, 200);
      }

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

      // 在搜索或筛选模式下提醒用户
      if (search || filter !== '全部') {
        showToast('💡 排序已在当前「' + (search ? '搜索' : '') + (search && filter !== '全部' ? ' + ' : '') + (filter !== '全部' ? filter : '') + '」视图中更新，全局排序可能不同', 'success');
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
