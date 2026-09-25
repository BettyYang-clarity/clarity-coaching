export function renderAiPanel(app) {
    const container = document.createElement('div');
    container.className = 'ai-panel-page';

    container.innerHTML = `
        <header class="page-header">
            <h1 class="page-title">AI 助手 <span class="en">AI Assistant</span></h1>
            <div class="header-actions">
                <div style="background: white; border-radius: 8px; padding: 4px; display: inline-flex; border: 1px solid var(--border-color);">
                    <button class="btn" style="background: var(--accent-teal); color: white; border: none; padding: 6px 12px;">整理模式 Organize</button>
                    <button class="btn" style="background: transparent; color: var(--text-secondary); border: none; padding: 6px 12px;">對話模式 Chat</button>
                </div>
            </div>
        </header>

        <div class="grid-2" style="display: grid; grid-template-columns: 1fr 2fr; gap: 24px;">
            <div class="card" style="height: fit-content;">
                <h3 style="margin-bottom: 16px;">待整理記錄 <span class="en">Unprocessed Captures</span></h3>
                <div style="padding: 12px; border: 1px solid var(--accent-teal); border-radius: 8px; background: var(--accent-light); margin-bottom: 12px; cursor: pointer;">
                    <div style="font-weight: 500;">Alice W. - 職涯價值觀</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">今天 14:30</div>
                </div>
                <div style="padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 12px; cursor: pointer;">
                    <div style="font-weight: 500;">Bob C. - 授權挑戰</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">昨天 10:00</div>
                </div>
            </div>

            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0;">AI 整理結果 <span class="en">Processed Summary</span></h3>
                    <button class="btn btn-primary">確認並儲存</button>
                </div>

                <div style="background: var(--bg-main); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                    <h4 style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                        會談摘要 <span class="privacy-icon">👤</span>
                    </h4>
                    <textarea class="form-control" style="min-height: 100px;">本次會談主要探討了 Alice 在尋找新工作時，對於「成就感」與「生活平衡」的價值觀排序。她意識到過去在科技業的高壓環境雖然帶來高薪，但犧牲了健康，因此決定未來的職缺將以彈性工時為首要考量。</textarea>
                </div>

                <div style="background: var(--bg-main); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                    <h4 style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                        教練洞察 & 模式 <span class="privacy-icon">🔒</span>
                    </h4>
                    <textarea class="form-control" style="min-height: 100px;">Alice 在談到前主管時，語速明顯加快且帶有防衛心。她有一個 pattern：遇到權威型人物時，容易先自我否定，而非客觀評估狀況。這可能是下次可以深入探討的主題。</textarea>
                </div>

                <div style="background: var(--bg-main); padding: 16px; border-radius: 8px;">
                    <h4 style="margin-bottom: 8px;">萃取出的行動 <span class="en">Extracted Actions</span></h4>
                    <div style="display: flex; gap: 12px; margin-bottom: 8px;">
                        <input type="text" class="form-control" value="列出 3 個能接受的彈性工時條件" style="flex: 1;">
                        <input type="date" class="form-control" value="2023-10-30" style="width: 150px;">
                        <button class="btn btn-secondary">❌</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    return container;
}
