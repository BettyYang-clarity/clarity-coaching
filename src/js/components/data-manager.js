import { api } from '../utils/api.js';

export function renderDataManager(app) {
    const container = document.createElement('div');
    container.className = 'data-manager-page';

    container.innerHTML = `
        <header class="page-header">
            <h1 class="page-title">資料管理 <span class="en">Data Management</span></h1>
        </header>

        <div style="display: flex; gap: 24px; flex-wrap: wrap;">
            <div class="card" style="flex: 1; min-width: 300px;">
                <h3 style="margin-bottom: 16px;">資料備份與還原</h3>
                <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px;">
                    所有教練紀錄均存在伺服器資料庫。您可以在此進行備份與還原。
                </p>
                
                <div style="display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;">
                    <button id="btn-export-json" class="btn btn-primary">下載備份 (JSON)</button>
                    <label class="btn btn-secondary" style="cursor: pointer; margin: 0;">
                        還原資料
                        <input type="file" id="input-import-json" accept=".json" style="display: none;">
                    </label>
                </div>

                <h4 style="margin-bottom: 12px;">匯出 CSV</h4>
                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    <select id="csv-table-select" class="form-control" style="max-width: 200px;">
                        <option value="clients">客戶名單</option>
                        <option value="sessions">會談紀錄</option>
                        <option value="actions">行動清單</option>
                        <option value="quick_captures">快速紀錄</option>
                    </select>
                    <button id="btn-export-csv" class="btn btn-secondary">匯出</button>
                </div>
            </div>

            <div class="card" style="flex: 1; min-width: 300px;">
                <h3 style="margin-bottom: 16px;">AI 整合設定</h3>
                
                <div class="form-group" style="margin-bottom: 16px;">
                    <label class="form-label">Gemini API Key</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="password" class="form-control" id="api-key-input" placeholder="AIzaSy..." style="flex: 1;">
                        <button id="btn-toggle-key" class="btn btn-secondary">顯示</button>
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">
                        儲存金鑰以啟用 AI 教練輔助功能。
                    </div>
                </div>
                <button class="btn btn-primary" id="save-key-btn">儲存金鑰</button>

            </div>
        </div>
    `;

    document.addEventListener('componentMounted', async (e) => {
        if (!location.hash.startsWith('#data')) return;
        
        const keyInput = container.querySelector('#api-key-input');
        const saveBtn = container.querySelector('#save-key-btn');
        const toggleKeyBtn = container.querySelector('#btn-toggle-key');
        
        try {
            const res = await api.get('/ai/settings/gemini_api_key');
            if (res.success && res.data) {
                keyInput.value = res.data;  // API returns the value directly as a string
            }
        } catch (err) {
            console.error('Failed to fetch API key', err);
        }

        toggleKeyBtn.addEventListener('click', () => {
            if (keyInput.type === 'password') {
                keyInput.type = 'text';
                toggleKeyBtn.textContent = '隱藏';
            } else {
                keyInput.type = 'password';
                toggleKeyBtn.textContent = '顯示';
            }
        });

        saveBtn.addEventListener('click', async () => {
            const val = keyInput.value.trim();
            if (!val) {
                app.showToast('請輸入 API Key', 'error');
                return;
            }
            const res = await api.post('/ai/settings', { key: 'gemini_api_key', value: val });
            if (res.success) {
                app.showToast('API Key 已儲存', 'success');
            } else {
                app.showToast('儲存失敗', 'error');
            }
        });

        // Export JSON
        container.querySelector('#btn-export-json').addEventListener('click', async () => {
            const res = await api.post('/ai/export');
            if (res.success && res.data) {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", dataStr);
                downloadAnchorNode.setAttribute("download", "clarity_backup.json");
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
                app.showToast('備份已下載', 'success');
            } else {
                app.showToast('備份失敗', 'error');
            }
        });

        // Import JSON
        container.querySelector('#input-import-json').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!confirm('匯入備份將覆蓋現有資料，確定要繼續嗎？')) {
                e.target.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const importedData = JSON.parse(event.target.result);
                    const res = await api.post('/ai/import', { data: importedData });
                    if (res.success) {
                        app.showToast('還原成功', 'success');
                    } else {
                        app.showToast('還原失敗', 'error');
                    }
                } catch (err) {
                    app.showToast('檔案解析失敗', 'error');
                }
                e.target.value = '';
            };
            reader.readAsText(file);
        });

        // Export CSV
        container.querySelector('#btn-export-csv').addEventListener('click', () => {
            const table = container.querySelector('#csv-table-select').value;
            try {
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", '/api/ai/export-csv/' + table);
                downloadAnchorNode.setAttribute("download", table + '_export.csv');
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
                app.showToast('正在下載 CSV', 'success');
            } catch (err) {
                app.showToast('CSV 下載失敗', 'error');
            }
        });

    }, { once: true });

    return container;
}
