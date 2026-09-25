import { api } from '../utils/api.js';

export function renderActions(app) {
    const container = document.createElement('div');
    container.className = 'actions-page';

    container.innerHTML = `
        <header class="page-header">
            <h1 class="page-title">行動追蹤 <span class="en">Actions</span></h1>
            <div class="header-actions">
                <button id="btn-toggle-view" class="btn btn-secondary">切換視角 (看板/清單)</button>
                <button id="btn-add-action" class="btn btn-primary">新增行動</button>
            </div>
        </header>

        <div class="card" style="margin-bottom: 24px;">
            <select id="filter-client" class="form-control" style="width: auto;">
                <option value="">所有客戶</option>
            </select>
        </div>

        <div id="actions-content-container">
            <!-- Content will be rendered here -->
        </div>
    `;

    const statuses = [
        { id: 'not_started', label: '未開始', badge: 'badge-yellow', bgColor: '#e2e8f0', color: '#000' },
        { id: 'in_progress', label: '進行中', badge: 'badge-yellow', bgColor: '#ebf8ff', color: '#2b6cb0' },
        { id: 'completed', label: '已完成', badge: 'badge-green', bgColor: '#c6f6d5', color: '#276749' },
        { id: 'cancelled', label: '已取消', badge: 'badge-red', bgColor: '#fed7d7', color: '#9b2c2c' }
    ];

    let currentView = 'kanban';

    document.addEventListener('componentMounted', async (e) => {
        if (!location.hash.startsWith('#actions')) return;

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

        loadActions();

        container.querySelector('#filter-client').addEventListener('change', loadActions);
        container.querySelector('#btn-add-action').addEventListener('click', openAddActionModal);
        container.querySelector('#btn-toggle-view').addEventListener('click', () => {
            currentView = currentView === 'kanban' ? 'list' : 'kanban';
            loadActions();
        });
    }, { once: true });

    async function loadActions() {
        const contentContainer = container.querySelector('#actions-content-container');
        contentContainer.innerHTML = '載入中...';
        
        const clientId = container.querySelector('#filter-client').value;
        const query = clientId ? '?client_id=' + clientId : '';
        
        const res = await api.get('/actions' + query);
        if (!res.success) {
            app.showToast('載入行動清單失敗', 'error');
            contentContainer.innerHTML = '載入失敗';
            return;
        }

        const actions = res.data || [];
        contentContainer.innerHTML = '';

        if (currentView === 'kanban') {
            renderKanban(actions, contentContainer);
        } else {
            renderList(actions, contentContainer);
        }
    }

    function renderKanban(actions, contentContainer) {
        const kanbanWrapper = document.createElement('div');
        kanbanWrapper.className = 'kanban-board';
        kanbanWrapper.style.cssText = 'display: flex; gap: 24px; overflow-x: auto; padding-bottom: 16px; align-items: flex-start;';

        statuses.forEach(statusDef => {
            const colActions = actions.filter(a => a.status === statusDef.id);
            const colDiv = document.createElement('div');
            colDiv.className = 'kanban-column';
            colDiv.style.cssText = 'min-width: 300px; background: var(--bg-main); border-radius: 12px; padding: 16px; flex: 1; border: 1px solid var(--border-color);';
            
            colDiv.innerHTML = `
                <h3 style="font-size: 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
                    ${statusDef.label} <span class="badge ${statusDef.badge}">${colActions.length}</span>
                </h3>
                <div class="kanban-cards" style="display: flex; flex-direction: column; gap: 12px;"></div>
            `;
            
            const cardsContainer = colDiv.querySelector('.kanban-cards');
            
            colActions.forEach(a => {
                const card = document.createElement('div');
                card.className = 'card';
                card.style.cssText = 'margin-bottom: 0; padding: 16px; cursor: pointer; background: var(--card-bg);';
                
                if (statusDef.id === 'completed' || statusDef.id === 'cancelled') {
                    card.style.opacity = '0.7';
                }

                const isOverdue = a.status !== 'completed' && a.status !== 'cancelled' && a.due_date && new Date(a.due_date) < new Date();
                const dueText = isOverdue ? `<span style="color: var(--status-red); font-weight: bold;">⚠️ ${a.due_date}</span>` : `<span style="color: var(--text-secondary);">📅 ${a.due_date || '無'}</span>`;

                card.innerHTML = `
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">${a.preferred_name || 'Unknown'}</div>
                    <div style="font-weight: 500; margin-bottom: 12px; ${statusDef.id === 'completed' || statusDef.id === 'cancelled' ? 'text-decoration: line-through;' : ''}">${a.action}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                        ${dueText}
                        <span class="badge" style="background: ${statusDef.bgColor}; color: ${statusDef.color};">${statusDef.label}</span>
                    </div>
                `;

                card.addEventListener('click', () => openEditActionModal(a));
                cardsContainer.appendChild(card);
            });

            kanbanWrapper.appendChild(colDiv);
        });

        contentContainer.appendChild(kanbanWrapper);
    }

    function renderList(actions, contentContainer) {
        const tableWrapper = document.createElement('div');
        tableWrapper.className = 'card';
        
        tableWrapper.innerHTML = `
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--border-color);">
                        <th style="padding: 12px; font-weight: 500; color: var(--text-secondary);">客戶</th>
                        <th style="padding: 12px; font-weight: 500; color: var(--text-secondary);">行動</th>
                        <th style="padding: 12px; font-weight: 500; color: var(--text-secondary);">狀態</th>
                        <th style="padding: 12px; font-weight: 500; color: var(--text-secondary);">截止日期</th>
                    </tr>
                </thead>
                <tbody id="list-tbody"></tbody>
            </table>
        `;
        
        const tbody = tableWrapper.querySelector('#list-tbody');
        
        if (actions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="padding: 16px; text-align: center;">尚無行動</td></tr>';
        } else {
            actions.forEach(a => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid var(--border-color)';
                tr.style.cursor = 'pointer';
                
                const statusDef = statuses.find(s => s.id === a.status) || statuses[0];
                const isOverdue = a.status !== 'completed' && a.status !== 'cancelled' && a.due_date && new Date(a.due_date) < new Date();
                const dueText = isOverdue ? `<span style="color: var(--status-red); font-weight: bold;">⚠️ ${a.due_date}</span>` : (a.due_date || '無');

                tr.innerHTML = `
                    <td style="padding: 16px 12px; font-weight: 500;">${a.preferred_name || 'Unknown'}</td>
                    <td style="padding: 16px 12px;">${a.action}</td>
                    <td style="padding: 16px 12px;"><span class="badge" style="background: ${statusDef.bgColor}; color: ${statusDef.color};">${statusDef.label}</span></td>
                    <td style="padding: 16px 12px;">${dueText}</td>
                `;
                
                tr.addEventListener('click', () => openEditActionModal(a));
                tbody.appendChild(tr);
            });
        }
        
        contentContainer.appendChild(tableWrapper);
    }

    async function openAddActionModal() {
        const overlay = createModalOverlay();
        const modal = createModalBox();

        let clientOptions = '';
        const clientsRes = await api.get('/clients');
        if (clientsRes.success && clientsRes.data) {
            clientOptions = clientsRes.data.map(c => `<option value="${c.client_id}">${c.preferred_name || c.name}</option>`).join('');
        }

        modal.innerHTML = `
            <h2 style="margin-top: 0; margin-bottom: 24px;">新增行動 <span class="en">New Action</span></h2>
            <form id="add-action-form">
                <div class="form-group" style="margin-bottom: 16px;">
                    <label class="form-label">客戶</label>
                    <select id="new-client_id" class="form-control" required>
                        <option value="">選擇客戶...</option>
                        ${clientOptions}
                    </select>
                </div>
                <div class="form-group" style="margin-bottom: 16px;">
                    <label class="form-label">行動內容</label>
                    <input type="text" id="new-action" class="form-control" required>
                </div>
                <div class="form-group" style="margin-bottom: 16px;">
                    <label class="form-label">截止日期</label>
                    <input type="date" id="new-due_date" class="form-control">
                </div>
                <div class="form-group" style="margin-bottom: 24px;">
                    <label class="form-label">成功指標</label>
                    <input type="text" id="new-success_indicator" class="form-control">
                </div>
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button type="button" class="btn btn-secondary close-btn">取消</button>
                    <button type="submit" class="btn btn-primary">儲存</button>
                </div>
            </form>
        `;

        modal.querySelector('.close-btn').addEventListener('click', () => document.body.removeChild(overlay));
        modal.querySelector('#add-action-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const body = {
                client_id: modal.querySelector('#new-client_id').value,
                action: modal.querySelector('#new-action').value,
                due_date: modal.querySelector('#new-due_date').value,
                success_indicator: modal.querySelector('#new-success_indicator').value,
                status: 'not_started'
            };
            const res = await api.post('/actions', body);
            if (res.success) {
                app.showToast('新增成功', 'success');
                document.body.removeChild(overlay);
                loadActions();
            } else {
                app.showToast('新增失敗', 'error');
            }
        });

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    function openEditActionModal(actionData) {
        const overlay = createModalOverlay();
        const modal = createModalBox();

        let statusOptions = statuses.map(s => `<option value="${s.id}" ${actionData.status === s.id ? 'selected' : ''}>${s.label}</option>`).join('');

        modal.innerHTML = `
            <h2 style="margin-top: 0; margin-bottom: 16px;">編輯行動 <span class="en">Edit Action</span></h2>
            <div style="margin-bottom: 24px; padding: 12px; background: var(--bg-main); border-radius: 8px;">
                <strong>行動:</strong> ${actionData.action} <br>
                <strong>客戶:</strong> ${actionData.preferred_name || 'Unknown'} <br>
                <strong>截止:</strong> ${actionData.due_date || '-'}
            </div>
            <form id="edit-action-form">
                <div class="form-group" style="margin-bottom: 16px;">
                    <label class="form-label">狀態</label>
                    <select id="edit-status" class="form-control">
                        ${statusOptions}
                    </select>
                </div>
                <div class="form-group" style="margin-bottom: 24px;">
                    <label class="form-label">檢討/備註</label>
                    <textarea id="edit-review_note" class="form-control" rows="3">${actionData.review_note || ''}</textarea>
                </div>
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button type="button" class="btn btn-secondary close-btn">取消</button>
                    <button type="submit" class="btn btn-primary">儲存</button>
                </div>
            </form>
        `;

        modal.querySelector('.close-btn').addEventListener('click', () => document.body.removeChild(overlay));
        modal.querySelector('#edit-action-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const body = {
                status: modal.querySelector('#edit-status').value,
                review_note: modal.querySelector('#edit-review_note').value
            };
            const res = await api.put('/actions/' + actionData.action_id, body);
            if (res.success) {
                app.showToast('更新成功', 'success');
                document.body.removeChild(overlay);
                loadActions();
            } else {
                app.showToast('更新失敗', 'error');
            }
        });

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    function createModalOverlay() {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;';
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) document.body.removeChild(overlay);
        });
        return overlay;
    }

    function createModalBox() {
        const modal = document.createElement('div');
        modal.className = 'card';
        modal.style.cssText = 'width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto; background: var(--card-bg); padding: 24px; border-radius: 12px;';
        return modal;
    }

    return container;
}
