const express = require('express');
const router = express.Router();
// Generate next Client ID (CL-001, CL-002, ...)
function getNextClientId(db) {
  const row = db.prepare(
    "SELECT client_id FROM clients ORDER BY CAST(SUBSTR(client_id, 4) AS INTEGER) DESC LIMIT 1"
  ).get();
  if (!row) return 'CL-001';
  const num = parseInt(row.client_id.split('-')[1]) + 1;
  return `CL-${num.toString().padStart(3, '0')}`;
}

// GET / — list all clients
router.get('/', (req, res) => {
  try {
    const { search } = req.query;
    let clients;
    if (search) {
      clients = req.db.prepare(
        "SELECT * FROM clients WHERE preferred_name LIKE ? OR client_id LIKE ? OR coaching_purpose LIKE ? ORDER BY updated_at DESC"
      ).all(`%${search}%`, `%${search}%`, `%${search}%`);
    } else {
      clients = req.db.prepare("SELECT * FROM clients ORDER BY updated_at DESC").all();
    }
    res.json({ success: true, data: clients });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /:id — single client with snapshot
router.get('/:id', (req, res) => {
  try {
    const client = req.db.prepare("SELECT * FROM clients WHERE client_id = ?").get(req.params.id);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });
    res.json({ success: true, data: client });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST / — create new client
router.post('/', (req, res) => {
  try {
    const {
      preferred_name, language, coaching_purpose,
      mbti_source, mbti_type, current_focus, consent_note
    } = req.body;

    if (!preferred_name) {
      return res.status(400).json({ success: false, error: '請輸入客戶名稱 / Name is required' });
    }

    const client_id = getNextClientId(req.db);
    const start_date = new Date().toISOString().split('T')[0];

    req.db.prepare(`
      INSERT INTO clients (client_id, preferred_name, language, coaching_purpose, mbti_source, mbti_type, start_date, current_focus, consent_note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(client_id, preferred_name, language || '繁體中文', coaching_purpose, mbti_source || 'unknown', mbti_type, start_date, current_focus, consent_note);

    const client = req.db.prepare("SELECT * FROM clients WHERE client_id = ?").get(client_id);
    res.json({ success: true, data: client });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /:id — update client
router.put('/:id', (req, res) => {
  try {
    const fields = req.body;
    const allowedFields = [
      'preferred_name', 'language', 'coaching_purpose', 'mbti_source', 'mbti_type',
      'current_focus', 'consent_note', 'latest_topic', 'latest_goal', 'latest_insight',
      'latest_pattern', 'latest_action', 'next_focus', 'last_session_id', 'last_session_date',
      'total_sessions'
    ];

    const updates = [];
    const values = [];
    for (const [key, value] of Object.entries(fields)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    updates.push("updated_at = datetime('now','localtime')");
    values.push(req.params.id);

    req.db.prepare(`UPDATE clients SET ${updates.join(', ')} WHERE client_id = ?`).run(...values);
    const client = req.db.prepare("SELECT * FROM clients WHERE client_id = ?").get(req.params.id);
    res.json({ success: true, data: client });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /:id/timeline — full timeline for a client
router.get('/:id/timeline', (req, res) => {
  try {
    const sessions = req.db.prepare(
      "SELECT session_id, date, session_no, main_topic, goal, grow_status, key_insight, method_used, client_action, referral_flag FROM sessions WHERE client_id = ? ORDER BY date DESC"
    ).all(req.params.id);
    const actions = req.db.prepare(
      "SELECT * FROM actions WHERE client_id = ? ORDER BY created_at DESC"
    ).all(req.params.id);
    const sessionCount = sessions.length;
    res.json({ success: true, data: { sessions, actions, sessionCount } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
