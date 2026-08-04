// ??????????Bangumi ?? + AniList ???
// ? app.js ????


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

