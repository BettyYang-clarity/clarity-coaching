const express = require('express');
const router = express.Router();
// Generate next Action ID
function getNextActionId(db) {
  const row = db.prepare(
    "SELECT action_id FROM actions ORDER BY CAST(SUBSTR(action_id, 3) AS INTEGER) DESC LIMIT 1"
  ).get();
  if (!row) return 'A-001';
  const num = parseInt(row.action_id.split('-')[1]) + 1;
  return `A-${num.toString().padStart(3, '0')}`;
}

// GET / — list actions with filters
router.get('/', (req, res) => {
  try {
    const { client_id, status, overdue } = req.query;
    let query = `
      SELECT a.*, c.preferred_name 
      FROM actions a 
      LEFT JOIN clients c ON a.client_id = c.client_id 
      WHERE 1=1
    `;
    const params = [];

    if (client_id) { query += " AND a.client_id = ?"; params.push(client_id); }
    if (status) { query += " AND a.status = ?"; params.push(status); }
    if (overdue === 'true') {
      query += " AND a.due_date < date('now','localtime') AND a.status IN ('not_started', 'in_progress')";
    }

    query += " ORDER BY a.created_at DESC";
    const actions = req.db.prepare(query).all(...params);
    res.json({ success: true, data: actions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /stats — dashboard statistics
router.get('/stats', (req, res) => {
  try {
    const total = req.db.prepare("SELECT COUNT(*) as count FROM actions").get().count;
    const byStatus = req.db.prepare(`
      SELECT status, COUNT(*) as count FROM actions GROUP BY status
    `).all();
    const overdue = req.db.prepare(`
      SELECT COUNT(*) as count FROM actions 
      WHERE due_date < date('now','localtime') AND status IN ('not_started', 'in_progress')
    `).get().count;

    const stats = { total, overdue, byStatus: {} };
    byStatus.forEach(row => { stats.byStatus[row.status] = row.count; });

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /:id — single action
router.get('/:id', (req, res) => {
  try {
    const action = req.db.prepare("SELECT * FROM actions WHERE action_id = ?").get(req.params.id);
    if (!action) return res.status(404).json({ success: false, error: 'Action not found' });
    res.json({ success: true, data: action });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST / — create action
router.post('/', (req, res) => {
  try {
    const { client_id, session_id, action, due_date, success_indicator, obstacle_support } = req.body;
    if (!action || !client_id) {
      return res.status(400).json({ success: false, error: '需要客戶 ID 與行動內容' });
    }

    const action_id = getNextActionId(req.db);
    req.db.prepare(`
      INSERT INTO actions (action_id, client_id, session_id, action, due_date, success_indicator, obstacle_support)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(action_id, client_id, session_id, action, due_date, success_indicator, obstacle_support);

    const created = req.db.prepare("SELECT * FROM actions WHERE action_id = ?").get(action_id);
    res.json({ success: true, data: created });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /:id — update action
router.put('/:id', (req, res) => {
  try {
    const fields = req.body;
    const allowedFields = ['action', 'due_date', 'success_indicator', 'status', 'obstacle_support', 'review_note'];

    const updates = [];
    const values = [];
    for (const [key, value] of Object.entries(fields)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now','localtime')");
      values.push(req.params.id);
      req.db.prepare(`UPDATE actions SET ${updates.join(', ')} WHERE action_id = ?`).run(...values);
    }

    const action = req.db.prepare("SELECT * FROM actions WHERE action_id = ?").get(req.params.id);
    res.json({ success: true, data: action });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
