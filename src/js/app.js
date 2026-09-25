import { renderDashboard } from './components/dashboard.js';
import { renderQuickCapture } from './components/quick-capture.js';
import { renderSessionPrep } from './components/session-prep.js';
import { renderSessions } from './components/sessions.js';
import { renderActions } from './components/actions.js';
import { renderClients } from './components/clients.js';
import { renderAiPanel } from './components/ai-panel.js';
import { renderToolLibrary } from './components/tool-library.js';
import { renderCaseStudy } from './components/case-study.js';
import { renderDataManager } from './components/data-manager.js';

class App {
    constructor() {
        this.mainContent = document.getElementById('main-content');
        this.toastContainer = document.getElementById('toast-container');
        this.routes = {
            '': renderDashboard,
            '#dashboard': renderDashboard,
            '#capture': renderQuickCapture,
            '#prep': renderSessionPrep,
            '#sessions': renderSessions,
            '#actions': renderActions,
            '#clients': renderClients,
            '#ai': renderAiPanel,
            '#tools': renderToolLibrary,
            '#case-study': renderCaseStudy,
            '#data': renderDataManager
        };

        this.init();
    }

    init() {
        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute(); // initial load
    }

    handleRoute() {
        const hash = window.location.hash;
        const renderer = this.routes[hash] || this.routes['#dashboard'];
        
        // Update navigation active state
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === (hash || '#dashboard')) {
                link.classList.add('active');
            }
        });

        // Fade out slightly, render, fade in
        this.mainContent.style.opacity = 0;
        
        setTimeout(() => {
            this.mainContent.innerHTML = '';
            const content = renderer(this); // Pass app context for utilities
            
            if (content instanceof HTMLElement) {
                this.mainContent.appendChild(content);
            } else if (typeof content === 'string') {
                this.mainContent.innerHTML = content;
            }
            
            // Re-trigger reflow for animation
            void this.mainContent.offsetWidth; 
            this.mainContent.style.opacity = 1;
            this.mainContent.classList.add('fade-in');
            setTimeout(() => this.mainContent.classList.remove('fade-in'), 400);

            // Trigger mount event for the component if it needs to bind events
            document.dispatchEvent(new CustomEvent('componentMounted', { detail: { hash } }));
        }, 150);
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        
        this.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
