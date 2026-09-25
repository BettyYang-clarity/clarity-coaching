import { api } from '../utils/api.js';

export function renderClients(app) {
  const container = document.createElement('div');
  container.className = 'clients-page';

  container.innerHTML = `
    <header class="page-header">
      <h1 class="page-title">客戶管理 <span class="en">Clients</span></h1>
      <div class="header-actions">
        <button id="btn-add-client" class="btn btn-primary">
          <span>➕</span> 新增客戶
        </button>
      </div>
    </header>

    <div class="card" style="margin-bottom: 24px;">
      <input type="text" id="search-client" class="form-control"
        placeholder="搜尋客戶名稱或目標..." style="max-width: 400px;">
    </div>

    <div id="clients-grid" class="grid-3">
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">
        載入中...
      </div>
    </div>
  `;

  const grid = container.querySelector('#clients-grid');
  const searchInput = container.querySelector('#search-client');

  // ─── Avatar colour palette ───────────────────────────────────────────────
  const PALETTE = [
    { bg: 'var(--accent-light)', color: 'var(--accent-teal)' },
    { bg: '#ebf8ff',             color: '#2b6cb0' },
    { bg: '#fefce8',             color: '#b45309' },
    { bg: '#fdf2f8',             color: '#9d174d' },
    { bg: '#f0fdf4',             color: '#166534' },
  ];

  function avatarStyle(name) {
    const idx = (name.charCodeAt(0) || 0) % PALETTE.length;
    return PALETTE[idx];
  }

  function initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return name.slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // ─── Render client cards ─────────────────────────────────────────────────
  function renderCards(clients) {
    grid.innerHTML = '';
    if (!clients.length) {
      grid.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:60px 24px; color:var(--text-secondary);">
          <div style="font-size:48px; margin-bottom:16px;">👤</div>
          <p style="font-size:16px;">尚無客戶資料</p>
          <p style="font-size:14px; margin-top:8px;">點擊「新增客戶」開始建立第一位客戶</p>
        </div>`;
      return;
    }

    clients.forEach(c => {
      const av = avatarStyle(c.preferred_name || '');
      const card = document.createElement('div');
      card.className = 'card client-card';
      card.style.cssText = 'cursor:pointer; transition:transform 0.2s, box-shadow 0.2s;';

      card.innerHTML =
        '<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">' +
          '<div style="display:flex; align-items:center; gap:12px;">' +
            '<div style="width:48px; height:48px; background:' + av.bg + '; color:' + av.color + '; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:700; flex-shrink:0;">' +
              initials(c.preferred_name) +
            '</div>' +
            '<div>' +
              '<h3 style="margin:0; font-size:17px;">' + (c.preferred_name || '—') + '</h3>' +
              '<div style="font-size:12px; color:var(--text-secondary);">會談次數: ' + (c.total_sessions || 0) + '</div>' +
            '</div>' +
          '</div>' +
          '<span class="badge badge-green">' + c.client_id + '</span>' +
        '</div>' +
        '<div style="margin-bottom:12px;">' +
          '<div style="font-size:12px; color:var(--text-secondary);">教練目標 <span class="en">Purpose</span></div>' +
          '<div style="font-weight:500; font-size:14px;">' + (c.coaching_purpose || '—') + '</div>' +
        '</div>' +
        (c.current_focus
          ? '<div style="margin-bottom:16px;"><div style="font-size:12px; color:var(--text-secondary);">當前焦點 <span class="en">Focus</span></div><div style="font-size:13px;">' + c.current_focus + '</div></div>'
          : '') +
        '<div style="font-size:12px; color:var(--text-secondary); border-top:1px solid var(--border-color); padding-top:12px;">' +
          '上次會談: ' + (c.last_session_date || '—') +
        '</div>';

      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-3px)';
        card.style.boxShadow = 'var(--shadow-lg)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        card.style.boxShadow = '';
      });
      card.addEventListener('click', () => openDetailModal(c));
      grid.appendChild(card);
    });
  }

  // ─── Fetch clients ────────────────────────────────────────────────────────
  async function fetchClients(search) {
    try {
      const endpoint = search ? '/clients?search=' + encodeURIComponent(search) : '/clients';
      const res = await api.get(endpoint);
      if (res.success) renderCards(res.data || []);
    } catch (err) {
      app.showToast('載入客戶失敗', 'error');
      console.error(err);
    }
  }

  // ─── Modal helper ─────────────────────────────────────────────────────────
  function createModal() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:1000; display:flex; align-items:center; justify-content:center; padding:16px;';
    const box = document.createElement('div');
    box.style.cssText = 'background:var(--card-bg); border-radius:16px; max-width:560px; width:100%; max-height:85vh; overflow-y:auto; padding:32px; box-shadow:0 20px 60px rgba(0,0,0,0.3); opacity:0; transform:scale(0.95); transition:all 0.2s;';
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => { box.style.opacity = '1'; box.style.transform = 'scale(1)'; });

    const close = () => {
      box.style.opacity = '0';
      box.style.transform = 'scale(0.95)';
      setTimeout(() => overlay.remove(), 200);
    };
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    return { overlay, box, close };
  }

  // ─── Client form (create/edit) ────────────────────────────────────────────
  function openClientModal(client) {
    const isEdit = !!client;
    const { box, close } = createModal();

    box.innerHTML =
      '<h2 style="margin:0 0 24px; font-size:20px;">' + (isEdit ? '✏️ 編輯客戶' : '➕ 新增客戶') + '</h2>' +
      '<form id="client-form">' +
        '<div class="form-group" style="margin-bottom:16px;">' +
          '<label class="form-label">姓名 / Name <span style="color:#ef4444;">*</span></label>' +
          '<input class="form-control" name="preferred_name" value="' + (isEdit ? (client.preferred_name || '') : '') + '" required placeholder="客戶稱呼..." style="width:100%;">' +
        '</div>' +
        '<div class="form-group" style="margin-bottom:16px;">' +
          '<label class="form-label">Coaching 目標 / Purpose</label>' +
          '<input class="form-control" name="coaching_purpose" value="' + (isEdit ? (client.coaching_purpose || '') : '') + '" placeholder="例：職涯轉換、領導力提升" style="width:100%;">' +
        '</div>' +
        '<div class="form-group" style="margin-bottom:16px;">' +
          '<label class="form-label">MBTI 類型</label>' +
          '<input class="form-control" name="mbti_type" value="' + (isEdit ? (client.mbti_type || '') : '') + '" placeholder="例：INTJ、ENFP" style="width:100%;">' +
        '</div>' +
        '<div class="form-group" style="margin-bottom:16px;">' +
          '<label class="form-label">當前焦點 / Current Focus</label>' +
          '<textarea class="form-control" name="current_focus" rows="2" placeholder="這位客戶目前正在關注什麼？" style="width:100%;">' + (isEdit ? (client.current_focus || '') : '') + '</textarea>' +
        '</div>' +
        '<div class="form-group" style="margin-bottom:24px;">' +
          '<label class="form-label">同意備註 / Consent Note</label>' +
          '<textarea class="form-control" name="consent_note" rows="2" placeholder="記錄紀錄/錄音的同意狀態..." style="width:100%;">' + (isEdit ? (client.consent_note || '') : '') + '</textarea>' +
        '</div>' +
        '<div style="display:flex; gap:12px; justify-content:flex-end;">' +
          '<button type="button" id="btn-cancel" class="btn btn-secondary">取消</button>' +
          '<button type="submit" class="btn btn-primary" id="btn-save">' + (isEdit ? '更新' : '新增') + '</button>' +
        '</div>' +
      '</form>';

    box.querySelector('#btn-cancel').addEventListener('click', close);

    box.querySelector('#client-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd.entries());
      const saveBtn = box.querySelector('#btn-save');
      saveBtn.disabled = true;
      saveBtn.textContent = '儲存中...';

      try {
        let res;
        if (isEdit) {
          res = await api.put('/clients/' + client.client_id, data);
        } else {
          res = await api.post('/clients', data);
        }
        if (res.success) {
          app.showToast(isEdit ? '客戶資料已更新 ✓' : '客戶已新增 ✓', 'success');
          close();
          fetchClients(searchInput.value.trim());
        } else {
          throw new Error(res.message || '操作失敗');
        }
      } catch (err) {
        app.showToast('儲存失敗：' + err.message, 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = isEdit ? '更新' : '新增';
      }
    });
  }

  // ─── Client detail modal ──────────────────────────────────────────────────
  function openDetailModal(client) {
    const { box, close } = createModal();
    const av = avatarStyle(client.preferred_name || '');

    box.innerHTML =
      '<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">' +
        '<div style="display:flex; align-items:center; gap:16px;">' +
          '<div style="width:56px; height:56px; background:' + av.bg + '; color:' + av.color + '; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:700;">' +
            initials(client.preferred_name) +
          '</div>' +
          '<div>' +
            '<h2 style="margin:0; font-size:22px;">' + (client.preferred_name || '—') + '</h2>' +
            '<div style="font-size:13px; color:var(--text-secondary);">' + client.client_id + ' · 共 ' + (client.total_sessions || 0) + ' 次會談</div>' +
          '</div>' +
        '</div>' +
        '<button id="btn-edit-client" class="btn btn-secondary" style="font-size:13px; padding:6px 14px;">✏️ 編輯</button>' +
      '</div>' +

      '<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">' +
        field('教練目標', client.coaching_purpose) +
        field('MBTI', client.mbti_type) +
        field('開始日期', client.start_date) +
        field('當前焦點', client.current_focus) +
        field('同意備註', client.consent_note) +
        field('上次會談', client.last_session_date) +
      '</div>' +

      (client.latest_topic ? (
        '<div class="card" style="background:var(--accent-light); border:none; padding:16px; margin-bottom:16px;">' +
          '<div style="font-size:12px; color:var(--text-secondary); margin-bottom:8px;">📋 最新 Snapshot</div>' +
          snapshotField('上次主題', client.latest_topic) +
          snapshotField('關鍵洞察', client.latest_insight) +
          snapshotField('下次焦點', client.next_focus) +
        '</div>'
      ) : '') +

      '<div>' +
        '<h4 style="margin:0 0 12px; font-size:14px; color:var(--text-secondary);">📁 會談紀錄</h4>' +
        '<div id="timeline-container"><p style="color:var(--text-secondary); font-size:13px;">載入中...</p></div>' +
      '</div>';

    box.querySelector('#btn-edit-client').addEventListener('click', () => {
      close();
      openClientModal(client);
    });

    // Load timeline
    api.get('/clients/' + client.client_id + '/timeline').then(res => {
      const tc = box.querySelector('#timeline-container');
      if (!tc) return;
      if (res.success && res.data && res.data.length > 0) {
        tc.innerHTML = res.data.map(s =>
          '<div style="padding:12px 16px; border-left:3px solid var(--accent-teal); margin-left:8px; margin-bottom:12px; background:var(--bg-main); border-radius:0 8px 8px 0;">' +
            '<div style="font-size:12px; color:var(--text-secondary); margin-bottom:4px;">' + (s.date || '') + ' — 第 ' + (s.session_no || '?') + ' 次</div>' +
            '<div style="font-size:14px; font-weight:500;">' + (s.main_topic || s.goal || '—') + '</div>' +
          '</div>'
        ).join('');
      } else {
        tc.innerHTML = '<p style="color:var(--text-secondary); font-size:13px;">尚無會談紀錄</p>';
      }
    }).catch(() => {
      const tc = box.querySelector('#timeline-container');
      if (tc) tc.innerHTML = '<p style="color:var(--text-secondary); font-size:13px;">無法載入會談紀錄</p>';
    });
  }

  function field(label, value) {
    return '<div style="padding:10px 12px; background:var(--bg-main); border-radius:8px;">' +
      '<div style="font-size:11px; color:var(--text-secondary); margin-bottom:4px;">' + label + '</div>' +
      '<div style="font-size:14px;">' + (value || '—') + '</div>' +
    '</div>';
  }

  function snapshotField(label, value) {
    if (!value) return '';
    return '<div style="margin-bottom:6px; font-size:13px;"><span style="color:var(--text-secondary);">' + label + ':</span> ' + value + '</div>';
  }

  // ─── Event bindings ───────────────────────────────────────────────────────
  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => fetchClients(searchInput.value.trim()), 350);
  });

  container.querySelector('#btn-add-client').addEventListener('click', () => openClientModal(null));

  // ─── Initial load ─────────────────────────────────────────────────────────
  document.addEventListener('componentMounted', e => {
    if (e.detail.hash !== '#clients') return;
    fetchClients('');
  }, { once: true });

  return container;
}
