import { api } from '../utils/api.js';

export function renderToolLibrary(app) {
    const container = document.createElement('div');
    container.className = 'tool-library-page';

    container.innerHTML = `
        <header class="page-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h1 class="page-title" style="margin: 0;">工具庫 <span class="en">(Tool Library)</span></h1>
            <div class="header-actions">
                <button id="btnAddTool" class="btn btn-primary" style="padding: 8px 16px; background: var(--accent-teal); color: white; border: none; border-radius: 4px; cursor: pointer;">
                    <span>➕</span> 新增自訂工具
                </button>
            </div>
        </header>

        <div id="toolsGrid" class="grid-3" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
            <div style="text-align: center; grid-column: 1 / -1; padding: 40px; color: var(--text-secondary);">
                載入中... (Loading...)
            </div>
        </div>
    `;

    const toolsGrid = container.querySelector('#toolsGrid');
    const btnAddTool = container.querySelector('#btnAddTool');

    let tools = [];

    const loadTools = async () => {
        try {
            const res = await api.get('/tools');
            if (res.success && res.data) {
                tools = res.data;
                renderTools();
            } else {
                throw new Error('Failed to load tools');
            }
        } catch (error) {
            console.error(error);
            app.showToast('無法載入工具列表', 'error');
            toolsGrid.innerHTML = '<div style="grid-column: 1 / -1; color: red;">載入失敗</div>';
        }
    };

    const renderTools = () => {
        toolsGrid.innerHTML = '';
        if (tools.length === 0) {
            toolsGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center;">尚無工具 (No tools found)</div>';
            return;
        }

        tools.forEach(tool => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.cssText = 'padding: 20px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--card-bg); cursor: pointer; transition: box-shadow 0.2s; position: relative;';
            
            // Expand/collapse logic
            let isExpanded = false;

            const isCustom = tool.is_custom == 1 || tool.is_custom === true;
            
            let questionsHtml = '';
            try {
                const questions = typeof tool.typical_questions === 'string' ? JSON.parse(tool.typical_questions) : (tool.typical_questions || []);
                if (Array.isArray(questions) && questions.length > 0) {
                    questionsHtml = questions.map(q => `<li>${q}</li>`).join('');
                }
            } catch (e) {
                console.warn('Could not parse typical_questions for tool', tool.id);
            }

            const updateCardHtml = () => {
                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; align-items: flex-start;">
                        <h3 style="margin: 0; font-size: 18px;">${tool.name_zh} <br><span class="en" style="font-size: 14px; font-weight: normal; color: var(--text-secondary);">${tool.name_en || ''}</span></h3>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                            ${isCustom ? '<span class="badge badge-yellow" style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: #fef08a; color: #854d0e;">Custom</span>' : '<span class="badge badge-green" style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: #bbf7d0; color: #166534;">Built-in</span>'}
                            ${tool.consent_required === 'yes' ? '<span class="badge badge-red" style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: #fecaca; color: #991b1b;">需同意 (Consent Req)</span>' : ''}
                        </div>
                    </div>
                    <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: ${isExpanded ? '16px' : '0'}; line-height: 1.5;">
                        ${tool.purpose || ''}
                    </p>
                    
                    ${isExpanded ? `
                        <div style="font-size: 13px; line-height: 1.6; border-top: 1px dashed var(--border-color); padding-top: 16px; margin-top: 16px;">
                            ${questionsHtml ? `<strong>典型提問 (Typical Questions)：</strong><ul style="margin-top: 4px; padding-left: 20px;">${questionsHtml}</ul>` : ''}
                            ${tool.scope_note ? `<div style="margin-top: 12px;"><strong>應用範圍 (Scope Note)：</strong><br>${tool.scope_note}</div>` : ''}
                            
                            ${isCustom ? `
                                <div style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 8px;">
                                    <button class="btn-delete" style="background: none; border: 1px solid #ef4444; color: #ef4444; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">刪除 (Delete)</button>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                `;

                // Add delete event listener if custom and expanded
                if (isExpanded && isCustom) {
                    const btnDelete = card.querySelector('.btn-delete');
                    if (btnDelete) {
                        btnDelete.addEventListener('click', async (e) => {
                            e.stopPropagation(); // prevent card click
                            if (confirm('確定要刪除「' + tool.name_zh + '」嗎？')) {
                                try {
                                    const res = await api.delete('/tools/' + (tool.tool_id || tool.id));
                                    if (res.success) {
                                        app.showToast('刪除成功', 'success');
                                        loadTools();
                                    } else {
                                        throw new Error('Delete failed');
                                    }
                                } catch (err) {
                                    console.error(err);
                                    app.showToast('刪除失敗', 'error');
                                }
                            }
                        });
                    }
                }
            };

            updateCardHtml();

            // Toggle expansion on card click
            card.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    isExpanded = !isExpanded;
                    updateCardHtml();
                }
            });

            // Hover effect
            card.addEventListener('mouseenter', () => card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)');
            card.addEventListener('mouseleave', () => card.style.boxShadow = 'none');

            toolsGrid.appendChild(card);
        });
    };

    const showAddToolModal = () => {
        const modalOverlay = document.createElement('div');
        modalOverlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;';
        
        const modal = document.createElement('div');
        modal.className = 'card';
        modal.style.cssText = 'background: var(--card-bg); padding: 24px; border-radius: 8px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;';

        modal.innerHTML = `
            <h2 style="margin-top: 0; margin-bottom: 20px;">新增自訂工具 <span class="en">(Add Custom Tool)</span></h2>
            <form id="addToolForm">
                <div class="form-group" style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">中文名稱 (Name ZH) *</label>
                    <input type="text" name="name_zh" class="form-control" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;" required>
                </div>
                <div class="form-group" style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">英文名稱 (Name EN)</label>
                    <input type="text" name="name_en" class="form-control" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;">
                </div>
                <div class="form-group" style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">用途目的 (Purpose) *</label>
                    <textarea name="purpose" class="form-control" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; min-height: 80px;" required></textarea>
                </div>
                <div class="form-group" style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">典型提問 (Typical Questions) - 每行一個</label>
                    <textarea name="typical_questions_text" class="form-control" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; min-height: 80px;"></textarea>
                </div>
                <div class="form-group" style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">應用範圍備註 (Scope Note)</label>
                    <textarea name="scope_note" class="form-control" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; min-height: 60px;"></textarea>
                </div>
                <div class="form-group" style="margin-bottom: 24px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: bold;">是否需要同意 (Consent Required)</label>
                    <select name="consent_required" class="form-control" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;">
                        <option value="no">否 (No)</option>
                        <option value="yes">是 (Yes)</option>
                    </select>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 12px;">
                    <button type="button" id="btnCancel" style="padding: 8px 16px; border: 1px solid var(--border-color); background: none; border-radius: 4px; cursor: pointer;">取消</button>
                    <button type="submit" style="padding: 8px 16px; background: var(--accent-teal); color: white; border: none; border-radius: 4px; cursor: pointer;">儲存 (Save)</button>
                </div>
            </form>
        `;

        modalOverlay.appendChild(modal);
        document.body.appendChild(modalOverlay);

        const form = modal.querySelector('#addToolForm');
        const btnCancel = modal.querySelector('#btnCancel');

        const closeModal = () => {
            document.body.removeChild(modalOverlay);
        };

        btnCancel.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            // Process questions text to JSON string
            const questions = data.typical_questions_text
                .split('\n')
                .map(q => q.trim())
                .filter(q => q.length > 0);
            
            data.typical_questions = JSON.stringify(questions);
            delete data.typical_questions_text;
            data.is_custom = 1;

            try {
                const res = await api.post('/tools', data);
                if (res.success) {
                    app.showToast('工具新增成功', 'success');
                    closeModal();
                    loadTools(); // Reload grid
                } else {
                    throw new Error('Add failed');
                }
            } catch (err) {
                console.error(err);
                app.showToast('新增失敗', 'error');
            }
        });
    };

    btnAddTool.addEventListener('click', showAddToolModal);

    // Fetch on mount
    document.addEventListener('componentMounted', () => {
        loadTools();
    }, { once: true });

    return container;
}
