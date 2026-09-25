import { api } from '../utils/api.js';

export function renderQuickCapture(app) {
    const container = document.createElement('div');
    container.className = 'quick-capture-page';

    let captureId = null;
    let saveTimeout = null;
    let clients = [];

    // Basic layout structure
    container.innerHTML = `
        <header class="page-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h1 class="page-title" style="margin: 0;">快速記錄 <span class="en">(Quick Capture)</span></h1>
            <div class="save-indicator" id="saveIndicator" style="color: var(--text-secondary); font-size: 14px;">
                ☁️ 尚未儲存 (Not saved)
            </div>
        </header>

        <form id="captureForm" class="card" style="margin-bottom: 80px;">
            <div class="form-row" style="display: flex; gap: 16px; margin-bottom: 24px;">
                <div class="form-group" style="flex: 1;">
                    <label class="form-label" style="display: block; margin-bottom: 8px; font-weight: bold;">客戶 <span class="en">(Client)</span></label>
                    <select id="client_id" name="client_id" class="form-control" style="width: 100%; padding: 12px; font-size: 16px; border: 1px solid var(--border-color); border-radius: 6px;" required>
                        <option value="">請選擇客戶 (Select client)...</option>
                    </select>
                </div>
                <div class="form-group" style="flex: 1;">
                    <label class="form-label" style="display: block; margin-bottom: 8px; font-weight: bold;">會談日期 <span class="en">(Session Date)</span></label>
                    <input type="date" id="session_date" name="session_date" class="form-control" style="width: 100%; padding: 12px; font-size: 16px; border: 1px solid var(--border-color); border-radius: 6px;" required>
                </div>
                <div class="form-group" style="flex: 1;">
                    <label class="form-label" style="display: block; margin-bottom: 8px; font-weight: bold;">錄音同意 <span class="en">(Recording Consent)</span></label>
                    <select id="recording_consent" name="recording_consent" class="form-control" style="width: 100%; padding: 12px; font-size: 16px; border: 1px solid var(--border-color); border-radius: 6px;">
                        <option value="not_asked">未詢問 (Not Asked)</option>
                        <option value="verbal_yes">口頭同意 (Verbal Yes)</option>
                        <option value="verbal_no">口頭拒絕 (Verbal No)</option>
                        <option value="written_yes">書面同意 (Written Yes)</option>
                    </select>
                </div>
            </div>

            <div class="form-group" style="margin-bottom: 24px;">
                <label class="form-label" style="display: block; margin-bottom: 8px; font-weight: bold;">主要議題 <span class="en">(Main Topic)</span></label>
                <textarea id="main_topic" name="main_topic" class="form-control" style="width: 100%; padding: 16px; font-size: 18px; border: 1px solid var(--border-color); border-radius: 6px; min-height: 120px; line-height: 1.5;" placeholder="這次會談主要討論什麼？"></textarea>
            </div>

            <div class="form-group" style="margin-bottom: 24px;">
                <label class="form-label" style="display: block; margin-bottom: 8px; font-weight: bold;">今日目標 <span class="en">(Goal Today)</span></label>
                <textarea id="goal_today" name="goal_today" class="form-control" style="width: 100%; padding: 16px; font-size: 18px; border: 1px solid var(--border-color); border-radius: 6px; min-height: 120px; line-height: 1.5;" placeholder="客戶希望在這次會談結束時帶走什麼？"></textarea>
            </div>

            <div class="advanced-section">
                <button type="button" id="toggleAdvanced" style="background: none; border: none; color: var(--accent-teal); font-size: 16px; cursor: pointer; padding: 8px 0; display: flex; align-items: center; gap: 8px; font-weight: bold;">
                    <span>▶</span> 進階記錄 <span class="en">(Advanced Details)</span>
                </button>
                <div id="advancedFields" style="display: none; margin-top: 16px; padding-top: 16px; border-top: 1px dashed var(--border-color);">
                    <div class="form-group" style="margin-bottom: 16px;">
                        <label class="form-label" style="display: block; margin-bottom: 8px;">關鍵字標籤 <span class="en">(Keywords)</span> - 逗號分隔</label>
                        <input type="text" id="keywords" name="keywords" class="form-control" style="width: 100%; padding: 10px; font-size: 14px; border: 1px solid var(--border-color); border-radius: 6px;" placeholder="e.g. 職涯轉換, 焦慮, 溝通">
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                        <div class="form-group">
                            <label class="form-label" style="display: block; margin-bottom: 8px;">情緒轉換 <span class="en">(Emotion Shift)</span></label>
                            <input type="text" id="emotion_shift" name="emotion_shift" class="form-control" style="width: 100%; padding: 10px; font-size: 14px; border: 1px solid var(--border-color); border-radius: 6px;" placeholder="e.g. 焦慮 -> 平靜">
                        </div>
                        <div class="form-group">
                            <label class="form-label" style="display: block; margin-bottom: 8px;">發現模式 <span class="en">(Pattern Noticed)</span></label>
                            <input type="text" id="pattern_noticed" name="pattern_noticed" class="form-control" style="width: 100%; padding: 10px; font-size: 14px; border: 1px solid var(--border-color); border-radius: 6px;" placeholder="e.g. 完美主義傾向">
                        </div>
                    </div>

                    <div class="form-group" style="margin-bottom: 16px;">
                        <label class="form-label" style="display: block; margin-bottom: 8px;">使用工具 <span class="en">(Tool Used)</span></label>
                        <input type="text" id="tool_used" name="tool_used" class="form-control" style="width: 100%; padding: 10px; font-size: 14px; border: 1px solid var(--border-color); border-radius: 6px;" placeholder="e.g. GROW, 生命之輪">
                    </div>

                    <div class="form-group" style="margin-bottom: 16px;">
                        <label class="form-label" style="display: block; margin-bottom: 8px;">客戶洞察 <span class="en">(Client Insight)</span></label>
                        <textarea id="client_insight" name="client_insight" class="form-control" style="width: 100%; padding: 10px; font-size: 14px; border: 1px solid var(--border-color); border-radius: 6px; min-height: 80px;"></textarea>
                    </div>

                    <div class="form-group" style="margin-bottom: 16px;">
                        <label class="form-label" style="display: block; margin-bottom: 8px;">討論行動 <span class="en">(Action Discussed)</span></label>
                        <textarea id="action_discussed" name="action_discussed" class="form-control" style="width: 100%; padding: 10px; font-size: 14px; border: 1px solid var(--border-color); border-radius: 6px; min-height: 80px;"></textarea>
                    </div>

                    <div class="form-group" style="margin-bottom: 16px;">
                        <label class="form-label" style="display: block; margin-bottom: 8px;">跟進問題 <span class="en">(Follow-up Question)</span></label>
                        <textarea id="followup_question" name="followup_question" class="form-control" style="width: 100%; padding: 10px; font-size: 14px; border: 1px solid var(--border-color); border-radius: 6px; min-height: 80px;"></textarea>
                    </div>
                </div>
            </div>

            <div class="form-group" style="margin-top: 32px;">
                <label class="form-label" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-weight: bold;">
                    🔒 教練私記 <span class="en">(Coach Memo - Private)</span>
                </label>
                <textarea id="coach_memo" name="coach_memo" class="form-control" style="width: 100%; padding: 16px; font-size: 16px; border: 1px solid var(--border-color); border-radius: 6px; min-height: 120px; line-height: 1.5; background-color: #f9f9f9;" placeholder="不會分享給客戶的私人筆記..."></textarea>
            </div>
        </form>

        <div class="bottom-bar" style="position: fixed; bottom: 0; left: 0; right: 0; background: var(--card-bg); padding: 16px 24px; box-shadow: 0 -2px 10px rgba(0,0,0,0.1); display: flex; justify-content: flex-end; z-index: 100;">
            <button id="btnAiSummary" class="btn btn-primary" style="padding: 12px 24px; font-size: 16px; border-radius: 8px; font-weight: bold; background: var(--accent-teal); color: white; border: none; cursor: pointer;" disabled>
                ✨ AI 整理 <span class="en">(AI Summary)</span>
            </button>
        </div>
    `;

    // DOM Elements
    const form = container.querySelector('#captureForm');
    const toggleAdvanced = container.querySelector('#toggleAdvanced');
    const advancedFields = container.querySelector('#advancedFields');
    const saveIndicator = container.querySelector('#saveIndicator');
    const btnAiSummary = container.querySelector('#btnAiSummary');
    const clientSelect = container.querySelector('#client_id');
    const sessionDateInput = container.querySelector('#session_date');

    // Default date to today
    const today = new Date().toISOString().split('T')[0];
    sessionDateInput.value = today;

    // Toggle advanced section
    toggleAdvanced.addEventListener('click', () => {
        const isHidden = advancedFields.style.display === 'none';
        advancedFields.style.display = isHidden ? 'block' : 'none';
        toggleAdvanced.innerHTML = isHidden 
            ? '<span>▼</span> 進階記錄 <span class="en">(Advanced Details)</span>'
            : '<span>▶</span> 進階記錄 <span class="en">(Advanced Details)</span>';
    });

    // Auto-save logic
    const handleInput = () => {
        saveIndicator.textContent = '☁️ 儲存中... (Saving...)';
        saveIndicator.style.color = '#eab308'; // yellow
        
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            saveCapture();
        }, 2000);
    };

    // Attach input listeners to all form fields
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        input.addEventListener('input', handleInput);
        input.addEventListener('change', handleInput);
    });

    const getFormData = () => {
        const data = {};
        new FormData(form).forEach((value, key) => {
            data[key] = value;
        });
        return data;
    };

    const saveCapture = async () => {
        const data = getFormData();
        if (!data.client_id) {
            saveIndicator.textContent = '⚠️ 請先選擇客戶 (Select client to save)';
            saveIndicator.style.color = 'red';
            return;
        }

        try {
            let res;
            if (captureId) {
                res = await api.put('/captures/' + captureId, data);
            } else {
                res = await api.post('/captures', data);
                if (res.success && res.data && res.data.capture_id) {
                    captureId = res.data.capture_id;
                }
            }

            if (res.success) {
                saveIndicator.textContent = '☁️ 已儲存 (Saved)';
                saveIndicator.style.color = '#22c55e'; // green
                btnAiSummary.disabled = false;
            } else {
                throw new Error('Save failed');
            }
        } catch (error) {
            console.error('Save error:', error);
            saveIndicator.textContent = '❌ 儲存失敗 (Save failed)';
            saveIndicator.style.color = 'red';
            app.showToast('自動儲存失敗，請檢查網路連線', 'error');
        }
    };

    // AI Summary button navigation
    btnAiSummary.addEventListener('click', () => {
        if (captureId) {
            window.location.hash = '#ai?capture_id=' + captureId;
        }
    });

    // Fetch clients on mount
    document.addEventListener('componentMounted', async () => {
        try {
            const res = await api.get('/clients');
            if (res.success && res.data) {
                clients = res.data;
                const clientSelect = container.querySelector('#client_id');
                clients.forEach(client => {
                    const option = document.createElement('option');
                    option.value = client.client_id;
                    option.textContent = client.client_id + ' — ' + client.preferred_name;
                    clientSelect.appendChild(option);
                });
                // Pre-select from session prep if set
                const prepClientId = sessionStorage.getItem('prepClientId');
                if (prepClientId) {
                    clientSelect.value = prepClientId;
                    sessionStorage.removeItem('prepClientId');
                }
            }
        } catch (error) {
            console.error('Error fetching clients:', error);
            app.showToast('無法載入客戶列表', 'error');
        }
    }, { once: true });

    return container;
}
