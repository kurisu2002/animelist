// ???????????? onclick ???????
// ? app.js ????

    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    function escapeAttr(str) {
      return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

    function openLightbox(url) {
      document.getElementById('lightbox-img').src = url;
      document.getElementById('lightbox').style.display = 'flex';
    }

    function closeLightbox() {
      document.getElementById('lightbox').style.display = 'none';
      document.getElementById('lightbox-img').src = '';
    }

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

