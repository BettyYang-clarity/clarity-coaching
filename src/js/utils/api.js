/**
 * API Wrapper for Clarity Coaching System
 */
const BASE_URL = '/api';

export const api = {
    /**
     * Generic fetch wrapper
     */
    async request(endpoint, options = {}) {
        const url = `${BASE_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        try {
            const response = await fetch(url, { ...options, headers });
            
            // For 204 No Content
            if (response.status === 204) return null;

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error(`API Error on ${endpoint}:`, error);
            throw error;
        }
    },

    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    async post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    async put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};

/** Mock definitions for development if backend isn't ready */
export const mockApi = {
    async getClients() {
        return [
            { id: 1, preferred_name: 'Alice W.', coaching_purpose: 'Career Transition', last_session_date: '2023-10-15', current_focus: 'Resume revamping' },
            { id: 2, preferred_name: 'Bob C.', coaching_purpose: 'Leadership Skills', last_session_date: '2023-10-10', current_focus: 'Team communication' }
        ];
    },
    async getRecentSessions() {
        return [
            { id: 101, client_name: 'Alice W.', date: '2023-10-15', topic: 'Identifying core values', status: 'green' },
            { id: 102, client_name: 'Bob C.', date: '2023-10-10', topic: 'Delegation roadblocks', status: 'yellow' }
        ];
    }
};
