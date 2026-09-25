import { api } from '../utils/api.js';

export function renderSessionPrep(app) {
  const container = document.createElement('div');
  container.className = 'session-prep-page fade-in';

  container.innerHTML = `
    <header class="page-header">
      <h1 class="page-title">會談準備 <span class="en">Session Prep</span></h1>
    </header>

    <div class="card" style="margin-bottom: 24px;">
      <div class="form-group" style="margin-bottom: 0;">
        <label class="form-label">選擇客戶 <span class="en">Select Client</span></label>
        <select id="prep-client-select" class="form-control" style="max-width: 400px;">
          <option value="">-- 請選擇客戶 --</option>
        </select>
      </div>
    </div>

    <div id="prep-content" style="display: none;">
      <!-- Client Snapshot -->
      <div class="grid-3" style="margin-bottom: 24px;">
        <div class="card" style="border-left: 4px solid var(--accent-teal);">
          <h4 style="margin-bottom: 12px; color: var(--text-secondary); font-size: 13px;">📋 最新 Snapshot</h4>
          <div id="prep-snapshot">
            <div class="prep-field"><span class="prep-label">上次主題</span><span id="prep-topic">—</span></div>
            <div class="prep-field"><span class="prep-label">上次目標</span><span id="prep-goal">—</span></div>
            <div class="prep-field"><span class="prep-label">關鍵洞察</span><span id="prep-insight">—</span></div>
            <div class="prep-field"><span class="prep-label">發現模式</span><span id="prep-pattern">—</span></div>
            <div class="prep-field"><span class="prep-label">行動承諾</span><span id="prep-action">—</span></div>
            <div class="prep-field"><span class="prep-label">下次焦點</span><span id="prep-focus">—</span></div>
          </div>
        </div>

        <div class="card" style="border-left: 4px solid #ecc94b;">
          <h4 style="margin-bottom: 12px; color: var(--text-secondary); font-size: 13px;">📊 客戶資訊</h4>
          <div id="prep-client-info">
            <div class="prep-field"><span class="prep-label">Coaching 目標</span><span id="prep-purpose">—</span></div>
            <div class="prep-field"><span class="prep-label">MBTI</span><span id="prep-mbti">—</span></div>
            <div class="prep-field"><span class="prep-label">累計會談</span><span id="prep-total">0</span></div>
            <div class="prep-field"><span class="prep-label">開始日期</span><span id="prep-start">—</span></div>
          </div>
        </div>

        <div class="card" style="border-left: 4px solid #f56565;">
          <h4 style="margin-bottom: 12px; color: var(--text-secondary); font-size: 13px;">✅ 未完成行動</h4>
          <div id="prep-actions-list" style="font-size: 14px;">
            <p style="color: var(--text-secondary);">載入中...</p>
          </div>
        </div>
      </div>

      <!-- Prep Checklist -->
      <div class="card">
        <h3 style="margin-bottom: 20px;">📝 會前檢查 <span class="en" style="font-size: 14px; font-weight: 400;">Pre-Session Checklist</span></h3>
        <div id="prep-checklist" style="display: grid; gap: 12px;">
          <label class="prep-check-item"><input type="checkbox"> <span>回顧上次會談紀錄與客戶 snapshot</span></label>
          <label class="prep-check-item"><input type="checkbox"> <span>檢查未完成的行動項目狀態</span></label>
          <label class="prep-check-item"><input type="checkbox"> <span>確認今天的會談目標（由客戶引導）</span></label>
          <label class="prep-check-item"><input type="checkbox"> <span>準備可能需要的工具或提問方向</span></label>
          <label class="prep-check-item"><input type="checkbox"> <span>確認錄音/紀錄同意狀態</span></label>
          <label class="prep-check-item"><input type="checkbox"> <span>調整自己的狀態，準備好傾聽</span></label>
        </div>
      </div>

      <!-- Start Session Button -->
      <div style="text-align: center; margin-top: 32px;">
        <button id="start-capture-btn" class="btn btn-primary" style="padding: 14px 40px; font-size: 16px; border-radius: 12px;">
          ✏️ 開始記錄 / Start Capture
        </button>
      </div>
    </div>

    <div id="prep-empty" class="card" style="text-align: center; padding: 60px 24px; color: var(--text-secondary);">
      <div style="font-size: 48px; margin-bottom: 16px;">📋</div>
      <p style="font-size: 16px;">請先選擇客戶以查看會談準備資料</p>
      <p style="font-size: 14px; margin-top: 8px;">Select a client above to prepare for the session</p>
    </div>
  `;

  // Style for prep fields
  const style = document.createElement('style');
  style.textContent = `
    .prep-field { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color); font-size: 14px; }
    .prep-field:last-child { border-bottom: none; }
    .prep-label { color: var(--text-secondary); font-size: 13px; min-width: 80px; }
    .prep-check-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--bg-main); border-radius: 8px; cursor: pointer; transition: var(--transition-fast); font-size: 14px; }
    .prep-check-item:hover { background: var(--accent-light); }
    .prep-check-item input[type="checkbox"] { width: 18px; height: 18px; accent-color: var(--accent-teal); cursor: pointer; }
  `;
  container.prepend(style);

  // Load clients for selector
  document.addEventListener('componentMounted', async (e) => {
    if (e.detail.hash !== '#prep') return;

    try {
      const res = await api.get('/clients');
      const select = container.querySelector('#prep-client-select');
      if (res.success && res.data.length > 0) {
        res.data.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.client_id;
          opt.textContent = `${c.client_id} — ${c.preferred_name}`;
          select.appendChild(opt);
        });
      }
    } catch (err) {
      console.error('Failed to load clients:', err);
    }

    // Client select handler
    container.querySelector('#prep-client-select').addEventListener('change', async (e) => {
      const clientId = e.target.value;
      if (!clientId) {
        container.querySelector('#prep-content').style.display = 'none';
        container.querySelector('#prep-empty').style.display = 'block';
        return;
      }

      container.querySelector('#prep-content').style.display = 'block';
      container.querySelector('#prep-empty').style.display = 'none';

      try {
        // Fetch client data
        const clientRes = await api.get(`/clients/${clientId}`);
        const c = clientRes.data;

        container.querySelector('#prep-topic').textContent = c.latest_topic || '—';
        container.querySelector('#prep-goal').textContent = c.latest_goal || '—';
        container.querySelector('#prep-insight').textContent = c.latest_insight || '—';
        container.querySelector('#prep-pattern').textContent = c.latest_pattern || '—';
        container.querySelector('#prep-action').textContent = c.latest_action || '—';
        container.querySelector('#prep-focus').textContent = c.next_focus || '—';
        container.querySelector('#prep-purpose').textContent = c.coaching_purpose || '—';
        container.querySelector('#prep-mbti').textContent = c.mbti_type || '未記錄';
        container.querySelector('#prep-total').textContent = c.total_sessions || '0';
        container.querySelector('#prep-start').textContent = c.start_date || '—';

        // Fetch open actions for this client
        const actionsRes = await api.get(`/actions?client_id=${clientId}&status=not_started`);
        const actionsList = container.querySelector('#prep-actions-list');

        if (actionsRes.success && actionsRes.data.length > 0) {
          actionsList.innerHTML = actionsRes.data.map(a => {
            const overdue = a.due_date && new Date(a.due_date) < new Date();
            return `<div style="padding: 8px 0; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
              <span>${a.action}</span>
              ${overdue ? '<span class="badge badge-red" style="font-size: 11px;">逾期</span>' : (a.due_date ? `<span style="font-size: 12px; color: var(--text-secondary);">${a.due_date}</span>` : '')}
            </div>`;
          }).join('');
        } else {
          actionsList.innerHTML = '<p style="color: var(--text-secondary); font-size: 13px;">✅ 無未完成行動</p>';
        }
      } catch (err) {
        console.error('Failed to load prep data:', err);
        app.showToast('載入準備資料失敗', 'error');
      }
    });

    // Start capture button
    container.querySelector('#start-capture-btn').addEventListener('click', () => {
      const clientId = container.querySelector('#prep-client-select').value;
      if (clientId) {
        // Store selected client for quick-capture
        sessionStorage.setItem('prepClientId', clientId);
      }
      window.location.hash = '#capture';
    });
  }, { once: true });

  return container;
}
