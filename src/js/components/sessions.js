import { api } from '../utils/api.js';

export function renderSessions(app) {
    const container = document.createElement('div');
    container.className = 'sessions-page';

    container.innerHTML = `
        <header class="page-header">
            <h1 class="page-title">會談歷史 <span class="en">Sessions</span></h1>
        </header>

        <div class="card" style="display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;">
            <select id="filter-client" class="form-control" style="width: auto; min-width: 120px;">
                <option value="">所有客戶</option>
            </select>
            <input type="date" id="filter-date-from" class="form-control" style="width: auto;" title="開始日期">
            <input type="date" id="filter-date-to" class="form-control" style="width: auto;" title="結束日期">
            <input type="text" id="filter-topic" class="form-control" placeholder="搜尋主題..." style="flex: 1; min-width: 150px;">
            <select id="filter-referral" class="form-control" style="width: auto;">
                <option value="">所有轉介狀態</option>
                <option value="none">無</option>
                <option value="coach_review">教練檢討</option>
                <option value="consider_referral">考慮轉介</option>
            </select>
            <button id="btn-filter" class="btn btn-secondary">篩選</button>
        </div>

        <div class="card">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--border-color);">
                        <th style="padding: 12px; font-weight: 500; color: var(--text-secondary);">日期</th>
                        <th style="padding: 12px; font-weight: 500; color: var(--text-secondary);">客戶</th>
                        <th style="padding: 12px; font-weight: 500; color: var(--text-secondary);">主題</th>
                        <th style="padding: 12px; font-weight: 500; color: var(--text-secondary);">GROW 狀態</th>
                        <th style="padding: 12px; font-weight: 500; color: var(--text-secondary);">關鍵洞察</th>
                        <th style="padding: 12px; font-weight: 500; color: var(--text-secondary);">轉介</th>
                        <th style="padding: 12px; font-weight: 500; color: var(--text-secondary);">操作</th>
                    </tr>
                </thead>
                <tbody id="sessions-tbody">
                    <tr><td colspan="7" style="padding: 16px; text-align: center;">載入中...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    document.addEventListener('componentMounted', async (e) => {
        if (!location.hash.startsWith('#sessions')) return;

        try {
            const clientsRes = await api.get('/clients');
            if (clientsRes.success && clientsRes.data) {
                const select = container.querySelector('#filter-client');
                clientsRes.data.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.client_id;
                    opt.textContent = c.preferred_name || c.name || `Client #${c.client_id}`;
                    select.appendChild(opt);
                });
            }
        } catch (err) {
            console.error('Failed to load clients', err);
        }

        loadSessions();

        container.querySelector('#btn-filter').addEventListener('click', loadSessions);
    }, { once: true });

    async function loadSessions() {
        const tbody = container.querySelector('#sessions-tbody');
        tbody.innerHTML = '<tr><td colspan="7" style="padding: 16px; text-align: center;">載入中...</td></tr>';
        
        const params = new URLSearchParams();
        const clientId = container.querySelector('#filter-client').value;
        const dateFrom = container.querySelector('#filter-date-from').value;
        const dateTo = container.querySelector('#filter-date-to').value;
        const topic = container.querySelector('#filter-topic').value;
        const referral = container.querySelector('#filter-referral').value;

        if (clientId) params.append('client_id', clientId);
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);
        if (topic) params.append('topic', topic);
        if (referral) params.append('referral_flag', referral);

        const res = await api.get('/sessions?' + params.toString());
        if (res.success) {
            renderTable(res.data);
        } else {
            app.showToast('載入失敗', 'error');
            tbody.innerHTML = '<tr><td colspan="7" style="padding: 16px; text-align: center; color: red;">載入失敗</td></tr>';
        }
    }

    function renderTable(sessions) {
        const tbody = container.querySelector('#sessions-tbody');
        tbody.innerHTML = '';
        if (!sessions || sessions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="padding: 16px; text-align: center;">尚無紀錄</td></tr>';
            return;
        }

        sessions.forEach(s => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border-color)';
            
            let growBadge = '';
            if (s.grow_status === 'complete') growBadge = '<span class="badge badge-green">Complete</span>';
            else if (s.grow_status === 'partial') growBadge = '<span class="badge badge-yellow">Partial</span>';
            else if (s.grow_status === 'unclear') growBadge = '<span class="badge badge-red">Unclear</span>';
            else growBadge = '<span class="badge">N/A</span>';

            let referralBadge = '';
            if (s.referral_flag === 'consider_referral') referralBadge = '<span class="badge badge-red" title="考慮轉介">⚠️ 轉介</span>';
            else if (s.referral_flag === 'coach_review') referralBadge = '<span class="badge badge-yellow" title="教練檢討">📝 檢討</span>';
            else referralBadge = '<span style="color: var(--text-secondary)">-</span>';

            tr.innerHTML = `
                <td style="padding: 16px 12px;">${s.date || ''}</td>
                <td style="padding: 16px 12px; font-weight: 500;">${s.preferred_name || 'Unknown'}</td>
                <td style="padding: 16px 12px;">${s.main_topic || ''}</td>
                <td style="padding: 16px 12px;">${growBadge}</td>
                <td style="padding: 16px 12px;">${s.key_insight || ''}</td>
                <td style="padding: 16px 12px;">${referralBadge}</td>
                <td style="padding: 16px 12px;">
                    <button class="btn btn-secondary view-btn" style="padding: 4px 8px; font-size: 12px;" data-id="${s.session_id}">查看</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                openSessionModal(id);
            });
        });
    }

    async function openSessionModal(id) {
        const res = await api.get('/sessions/' + id);
        if (!res.success) {
            app.showToast('無法載入會談詳情', 'error');
            return;
        }
        const s = res.data;
        
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '1000';

        const modal = document.createElement('div');
        modal.className = 'card';
        modal.style.width = '90%';
        modal.style.maxWidth = '800px';
        modal.style.maxHeight = '90vh';
        modal.style.overflowY = 'auto';
        modal.style.background = 'var(--bg-main)';

        modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2 style="margin: 0;">會談詳情 - ${s.preferred_name || 'Unknown'} (${s.date || ''})</h2>
                <button class="btn btn-secondary close-btn">關閉</button>
            </div>
            
            <div style="display: flex; gap: 24px; margin-bottom: 24px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 250px;">
                    <h3 style="margin-bottom: 8px;">主題</h3>
                    <p>${s.main_topic || '-'}</p>
                </div>
                <div style="flex: 1; min-width: 250px;">
                    <h3 style="margin-bottom: 8px;">目標</h3>
                    <p>${s.goal || '-'}</p>
                </div>
            </div>

            <h3 style="margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">GROW 分析</h3>
            <div style="margin-bottom: 24px;">
                <p><strong>Goal (目標):</strong> ${s.grow_goal || '-'}</p>
                <p><strong>Reality (現況):</strong> ${s.grow_reality || '-'}</p>
                <p><strong>Options (選項):</strong> ${s.grow_options || '-'}</p>
                <p><strong>Will (意願/行動):</strong> ${s.grow_will || '-'}</p>
            </div>

            <h3 style="margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                教練反思 <span title="Private">🔒</span>
            </h3>
            <div style="margin-bottom: 24px; background: rgba(255, 235, 59, 0.1); padding: 16px; border-radius: 8px;">
                <p><strong>反思:</strong> ${s.coach_reflection || '-'}</p>
                <p><strong>私人細節:</strong> ${s.private_detail || '-'}</p>
                <p><strong>模式與盲點:</strong> ${s.pattern_blindspot || '-'}</p>
                <p><strong>轉介註記:</strong> ${s.referral_note || '-'}</p>
            </div>

            <h3 style="margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">客戶總結與行動</h3>
            <div style="margin-bottom: 24px;">
                <p><strong>總結:</strong> ${s.client_summary || '-'}</p>
                <p><strong>行動:</strong> ${s.client_action || '-'}</p>
                <p><strong>後續焦點:</strong> ${s.next_focus || '-'}</p>
            </div>

            <h3 style="margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">後續追蹤問題</h3>
            <div>
                <p>${s.followup_questions || '-'}</p>
            </div>
        `;

        modal.querySelector('.close-btn').addEventListener('click', () => document.body.removeChild(overlay));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) document.body.removeChild(overlay);
        });

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    return container;
}
