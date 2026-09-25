export function renderCaseStudy(app) {
    const container = document.createElement('div');
    container.className = 'case-study-page';

    container.innerHTML = `
        <header class="page-header">
            <h1 class="page-title">案例分析 <span class="en">Case Study</span></h1>
            <button class="btn btn-secondary">匯出案例 (去識別化)</button>
        </header>

        <div class="card" style="margin-bottom: 24px;">
            <select class="form-control" style="max-width: 300px;">
                <option value="">選擇要分析的客戶...</option>
                <option value="1">Alice W.</option>
            </select>
        </div>

        <div class="grid-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
            <div class="card">
                <h3 style="margin-bottom: 16px;">主題頻率 <span class="en">Topic Frequency</span></h3>
                <ul style="list-style: none;">
                    <li style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border-color);">
                        <span>職涯方向探索</span>
                        <span style="font-weight: 500;">3 次</span>
                    </li>
                    <li style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border-color);">
                        <span>自信心/冒牌者症候群</span>
                        <span style="font-weight: 500;">2 次</span>
                    </li>
                </ul>
            </div>

            <div class="card">
                <h3 style="margin-bottom: 16px;">行動完成率 <span class="en">Action Completion</span></h3>
                <div style="display: flex; align-items: center; justify-content: center; height: 150px;">
                    <div style="text-align: center;">
                        <div style="font-size: 48px; font-weight: 600; color: var(--accent-teal);">85%</div>
                        <div style="color: var(--text-secondary);">6/7 項行動已完成</div>
                    </div>
                </div>
            </div>

            <div class="card" style="grid-column: 1 / -1;">
                <h3 style="margin-bottom: 16px;">模式演進 <span class="en">Pattern Evolution</span></h3>
                <div style="position: relative; padding-left: 24px; border-left: 2px solid var(--accent-teal);">
                    <div style="margin-bottom: 24px; position: relative;">
                        <div style="position: absolute; left: -31px; top: 0; width: 14px; height: 14px; border-radius: 50%; background: var(--accent-teal);"></div>
                        <div style="font-size: 12px; color: var(--text-secondary);">Session 1-2 (探索期)</div>
                        <div>傾向將職涯停滯歸咎於外部環境（公司文化、主管風格）。</div>
                    </div>
                    <div style="position: relative;">
                        <div style="position: absolute; left: -31px; top: 0; width: 14px; height: 14px; border-radius: 50%; background: var(--accent-teal);"></div>
                        <div style="font-size: 12px; color: var(--text-secondary);">Session 4-5 (覺察期)</div>
                        <div>開始意識到自己對於「要求加薪或升遷」有內在恐懼，並嘗試練習自我倡議。</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    return container;
}
