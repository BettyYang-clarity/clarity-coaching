const express = require('express');
const router = express.Router();
const { organizeCapture } = require('../services/ai-organizer');
const { getAssistantResponse } = require('../services/ai-assistant');
const { exportAll, importAll, exportCSV } = require('../services/data-export');

// POST /organize — AI organizes a quick capture into structured session record
router.post('/organize', async (req, res) => {
  try {
    const { capture_id } = req.body;
    if (!capture_id) {
      return res.status(400).json({ success: false, error: '需要 capture_id' });
    }

    // Get the capture data
    const capture = req.db.prepare("SELECT * FROM quick_captures WHERE capture_id = ?").get(capture_id);
    if (!capture) {
      return res.status(404).json({ success: false, error: 'Quick capture not found' });
    }

    // Get client data for context
    let clientData = null;
    if (capture.client_id) {
      clientData = req.db.prepare("SELECT * FROM clients WHERE client_id = ?").get(capture.client_id);
    }

    // Check API key
    const apiKeySetting = req.db.prepare("SELECT value FROM settings WHERE key = 'gemini_api_key'").get();
    const apiKey = apiKeySetting?.value || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ success: false, error: '請先在資料管理中設定 Gemini API Key' });
    }

    // Call AI organizer
    const result = await organizeCapture(capture, clientData, apiKey);

    // Save AI log
    req.db.prepare(`
      INSERT INTO ai_logs (capture_id, prompt_type, prompt_sent, ai_response, model_used)
      VALUES (?, 'organize', ?, ?, 'gemini-2.0-flash')
    `).run(capture_id, JSON.stringify(capture), JSON.stringify(result));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('AI organize error:', error);
    res.status(500).json({ success: false, error: `AI 處理錯誤: ${error.message}` });
  }
});

// POST /assist — Real-time AI coaching assistant
router.post('/assist', async (req, res) => {
  try {
    const { message, client_id } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: '請輸入問題' });
    }

    // Get client context if provided
    let clientContext = null;
    if (client_id) {
      const client = req.db.prepare("SELECT * FROM clients WHERE client_id = ?").get(client_id);
      const recentSessions = req.db.prepare(
        "SELECT session_id, date, main_topic, key_insight, pattern_blindspot, method_used FROM sessions WHERE client_id = ? ORDER BY date DESC LIMIT 5"
      ).all(client_id);
      clientContext = { client, recentSessions };
    }

    // Check API key
    const apiKeySetting = req.db.prepare("SELECT value FROM settings WHERE key = 'gemini_api_key'").get();
    const apiKey = apiKeySetting?.value || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ success: false, error: '請先設定 Gemini API Key' });
    }

    const response = await getAssistantResponse(message, clientContext, apiKey);

    // Save AI log
    req.db.prepare(`
      INSERT INTO ai_logs (prompt_type, prompt_sent, ai_response, model_used, client_id)
      VALUES ('assist', ?, ?, 'gemini-2.0-flash', ?)
    `).run(message, response, client_id);

    res.json({ success: true, data: { response } });
  } catch (error) {
    console.error('AI assist error:', error);
    res.status(500).json({ success: false, error: `AI 處理錯誤: ${error.message}` });
  }
});

// GET /logs — AI interaction history
router.get('/logs', (req, res) => {
  try {
    const logs = req.db.prepare(
      "SELECT * FROM ai_logs ORDER BY created_at DESC LIMIT 50"
    ).all();
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /settings — save settings (API key etc.)
router.post('/settings', (req, res) => {
  try {
    const { key, value } = req.body;
    req.db.prepare(
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)"
    ).run(key, value);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /settings/:key — get a setting
router.get('/settings/:key', (req, res) => {
  try {
    const setting = req.db.prepare("SELECT value FROM settings WHERE key = ?").get(req.params.key);
    res.json({ success: true, data: setting?.value || null });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /export — export all data
router.post('/export', (req, res) => {
  try {
    const data = exportAll(req.db);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /import — import data
router.post('/import', (req, res) => {
  try {
    const { data } = req.body;
    importAll(req.db, data);
    res.json({ success: true, message: '資料匯入成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /export-csv/:table — export table as CSV
router.get('/export-csv/:table', (req, res) => {
  try {
    const csv = exportCSV(req.db, req.params.table);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${req.params.table}_${new Date().toISOString().split('T')[0]}.csv`);
    res.send('\uFEFF' + csv); // BOM for Excel 繁體中文 compatibility
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /dashboard-stats — aggregate stats for dashboard
router.get('/dashboard-stats', (req, res) => {
  try {
    const clientCount = req.db.prepare("SELECT COUNT(*) as count FROM clients").get().count;
    const now = new Date();
    const firstOfMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-01`;
    const sessionCount = req.db.prepare("SELECT COUNT(*) as count FROM sessions WHERE date >= ?").get(firstOfMonth).count;
    const openActions = req.db.prepare(
      "SELECT COUNT(*) as count FROM actions WHERE status IN ('not_started', 'in_progress')"
    ).get().count;
    const overdueActions = req.db.prepare(
      "SELECT COUNT(*) as count FROM actions WHERE due_date < date('now','localtime') AND status IN ('not_started', 'in_progress')"
    ).get().count;

    res.json({
      success: true,
      data: { clientCount, sessionCount, openActions, overdueActions }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
