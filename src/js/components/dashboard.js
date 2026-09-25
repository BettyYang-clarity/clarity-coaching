// D:\yang\My project\Coaching 工具\clarity-coaching\src\js\components\dashboard.js
import { api } from '../utils/api.js';

export function renderDashboard(app) {
    const container = document.createElement('div');
    container.className = 'dashboard-container';
    
    // Initial skeleton layout
    container.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">總覽 (Dashboard)</h1>
            <p class="text-secondary">歡迎回來，這是您的教練進度概況。</p>
        </div>
        
        <div class="dashboard-stats grid-4 skeleton-container" id="stats-container" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 24px;">
            ${Array(4).fill('<div class="card stat-card skeleton" style="height: 100px; background: #e5e7eb; border-radius: 8px;"></div>').join('')}
        </div>
        
        <div class="dashboard-grid grid-2" style="display: grid; grid-template-columns: 1fr 1fr; margin-top: 32px; gap: 24px;">
            <div class="card" style="padding: 24px; border-radius: 12px; border: 1px solid var(--border-color, #e5e7eb); background: var(--card-bg, #ffffff);">
                <h2 style="margin-top: 0; margin-bottom: 16px;">近期會談 (Recent Sessions)</h2>
                <div id="recent-sessions" class="skeleton-container">
                    ${Array(3).fill('<div class="skeleton" style="height: 60px; margin-bottom: 12px; background: #e5e7eb; border-radius: 8px;"></div>').join('')}
                </div>
            </div>
            
            <div class="card" style="padding: 24px; border-radius: 12px; border: 1px solid var(--border-color, #e5e7eb); background: var(--card-bg, #ffffff);">
                <h2 style="margin-top: 0; margin-bottom: 16px;">待辦行動 (Pending Actions)</h2>
                <div id="pending-actions" class="skeleton-container">
                    ${Array(3).fill('<div class="skeleton" style="height: 60px; margin-bottom: 12px; background: #e5e7eb; border-radius: 8px;"></div>').join('')}
                </div>
            </div>
        </div>
    `;

    document.addEventListener('componentMounted', async () => {
        await loadDashboardData(container, app);
    }, { once: true });

    return container;
}

async function loadDashboardData(container, app) {
    try {
        // Fetch data in parallel
        const [statsRes, sessionsRes, actionsRes] = await Promise.all([
            api.get('/ai/dashboard-stats'),
            api.get('/sessions/recent?limit=5'),
            api.get('/actions?status=not_started')
        ]);

        if (statsRes.success) {
            renderStats(container.querySelector('#stats-container'), statsRes.data);
        } else {
            app.showToast('無法載入統計數據', 'error');
        }

        if (sessionsRes.success) {
            renderRecentSessions(container.querySelector('#recent-sessions'), sessionsRes.data);
        } else {
            app.showToast('無法載入近期會談', 'error');
        }

        if (actionsRes.success) {
            renderPendingActions(container.querySelector('#pending-actions'), actionsRes.data);
        } else {
            app.showToast('無法載入待辦行動', 'error');
        }

    } catch (err) {
        console.error('Dashboard error:', err);
        app.showToast('載入總覽資料發生錯誤', 'error');
    }
}

function renderStats(container, data) {
    const { clientCount = 0, sessionCount = 0, openActions = 0, overdueActions = 0 } = data;
    
    container.classList.remove('skeleton-container');
    container.innerHTML = `
        <div class="card stat-card" style="padding: 24px; text-align: center; border-radius: 12px; border: 1px solid var(--border-color, #e5e7eb); background: var(--card-bg, #ffffff);">
            <div class="text-secondary" style="font-size: 14px; margin-bottom: 8px; color: var(--text-secondary, #6b7280);">總客戶數 (Clients)</div>
            <div class="stat-value" style="font-size: 32px; font-weight: bold; color: var(--accent-teal, #0d9488);" data-target="${clientCount}">0</div>
        </div>
        <div class="card stat-card" style="padding: 24px; text-align: center; border-radius: 12px; border: 1px solid var(--border-color, #e5e7eb); background: var(--card-bg, #ffffff);">
            <div class="text-secondary" style="font-size: 14px; margin-bottom: 8px; color: var(--text-secondary, #6b7280);">總會談數 (Sessions)</div>
            <div class="stat-value" style="font-size: 32px; font-weight: bold; color: var(--accent-teal, #0d9488);" data-target="${sessionCount}">0</div>
        </div>
        <div class="card stat-card" style="padding: 24px; text-align: center; border-radius: 12px; border: 1px solid var(--border-color, #e5e7eb); background: var(--card-bg, #ffffff);">
            <div class="text-secondary" style="font-size: 14px; margin-bottom: 8px; color: var(--text-secondary, #6b7280);">待辦行動 (Open)</div>
            <div class="stat-value" style="font-size: 32px; font-weight: bold; color: var(--accent-teal, #0d9488);" data-target="${openActions}">0</div>
        </div>
        <div class="card stat-card" style="padding: 24px; text-align: center; border-radius: 12px; border: 1px solid var(--border-color, #e5e7eb); background: var(--card-bg, #ffffff);">
            <div class="text-secondary" style="font-size: 14px; margin-bottom: 8px; color: var(--text-secondary, #6b7280);">逾期行動 (Overdue)</div>
            <div class="stat-value" style="font-size: 32px; font-weight: bold; color: #ef4444;" data-target="${overdueActions}">0</div>
        </div>
    `;

    // Animate count up
    container.querySelectorAll('.stat-value').forEach(el => {
        const target = parseInt(el.getAttribute('data-target'), 10) || 0;
        let current = 0;
        const duration = 800; // ms
        const steps = 20;
        const increment = target / steps;
        
        if (target === 0) return;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                el.innerText = target;
                clearInterval(timer);
            } else {
                el.innerText = Math.ceil(current);
            }
        }, duration / steps);
    });
}

function getGrowStatusBadge(status) {
    const badges = {
        'Goal': '<span class="badge" style="background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">G</span>',
        'Reality': '<span class="badge" style="background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">R</span>',
        'Options': '<span class="badge" style="background: #e0e7ff; color: #3730a3; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">O</span>',
        'Will': '<span class="badge" style="background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">W</span>'
    };
    return badges[status] || `<span class="badge" style="background: #f3f4f6; color: #374151; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">${status || '-'}</span>`;
}

function renderRecentSessions(container, sessions) {
    container.classList.remove('skeleton-container');
    if (!sessions || sessions.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 24px; color: var(--text-secondary, #6b7280);">目前沒有近期會談 (No recent sessions)</div>';
        return;
    }

    container.innerHTML = sessions.map(session => `
        <div class="session-item" style="padding: 12px 0; border-bottom: 1px solid var(--border-color, #e5e7eb); display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="font-weight: 500; color: var(--text-primary, #111827);">${session.preferred_name || '未命名'} <span style="color: var(--text-secondary, #6b7280); font-size: 12px; font-weight: normal; margin-left: 8px;">${session.date || ''}</span></div>
                <div style="font-size: 14px; color: var(--text-secondary, #6b7280); margin-top: 4px;">${session.main_topic || '無主題'}</div>
            </div>
            <div>
                ${session.grow_status ? getGrowStatusBadge(session.grow_status) : ''}
            </div>
        </div>
    `).join('');
}

function renderPendingActions(container, actions) {
    container.classList.remove('skeleton-container');
    if (!actions || actions.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 24px; color: var(--text-secondary, #6b7280);">目前沒有待辦行動 (No pending actions)</div>';
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    container.innerHTML = actions.map(action => {
        const dueDate = action.due_date ? new Date(action.due_date) : null;
        const isOverdue = dueDate && dueDate < today;
        const badgeColor = isOverdue ? '#fef2f2' : '#f0fdf4';
        const textColor = isOverdue ? '#991b1b' : '#166534';
        const badgeText = isOverdue ? '逾期 (Overdue)' : '待辦 (Pending)';

        return `
            <div class="action-item" style="padding: 12px 0; border-bottom: 1px solid var(--border-color, #e5e7eb);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px; align-items: center;">
                    <span style="font-weight: 500; color: var(--text-primary, #111827);">${action.preferred_name || '未知客戶'}</span>
                    <span class="badge" style="background: ${badgeColor}; color: ${textColor}; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-weight: 500;">${badgeText}</span>
                </div>
                <div style="font-size: 14px; color: var(--text-primary, #374151); margin-top: 4px;">${action.action}</div>
                <div style="font-size: 12px; color: var(--text-secondary, #6b7280); margin-top: 6px;">到期日: ${action.due_date || '未定'}</div>
            </div>
        `;
    }).join('');
}
