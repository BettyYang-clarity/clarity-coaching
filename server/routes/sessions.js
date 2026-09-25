const express = require('express');
const router = express.Router();
// Generate next Session ID
function getNextSessionId(db) {
  const row = db.prepare(
    "SELECT session_id FROM sessions ORDER BY CAST(SUBSTR(session_id, 3) AS INTEGER) DESC LIMIT 1"
  ).get();
  if (!row) return 'S-001';
  const num = parseInt(row.session_id.split('-')[1]) + 1;
  return `S-${num.toString().padStart(3, '0')}`;
}

// GET / — list sessions with filters
router.get('/', (req, res) => {
  try {
    const { client_id, date_from, date_to, topic, method, referral_flag } = req.query;
    let query = `
      SELECT s.*, c.preferred_name 
      FROM sessions s 
      LEFT JOIN clients c ON s.client_id = c.client_id 
      WHERE 1=1
    `;
    const params = [];

    if (client_id) { query += " AND s.client_id = ?"; params.push(client_id); }
    if (date_from) { query += " AND s.date >= ?"; params.push(date_from); }
    if (date_to) { query += " AND s.date <= ?"; params.push(date_to); }
    if (topic) { query += " AND s.main_topic LIKE ?"; params.push(`%${topic}%`); }
    if (method) { query += " AND s.method_used LIKE ?"; params.push(`%${method}%`); }
    if (referral_flag) { query += " AND s.referral_flag = ?"; params.push(referral_flag); }

    query += " ORDER BY s.date DESC";
    const sessions = req.db.prepare(query).all(...params);
    res.json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /recent — last N sessions for dashboard
router.get('/recent', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const sessions = req.db.prepare(`
      SELECT s.session_id, s.date, s.main_topic, s.grow_status, s.key_insight, s.referral_flag, c.preferred_name
      FROM sessions s
      LEFT JOIN clients c ON s.client_id = c.client_id
      ORDER BY s.date DESC LIMIT ?
    `).all(limit);
    res.json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /:id — single session
router.get('/:id', (req, res) => {
  try {
    const session = req.db.prepare(`
      SELECT s.*, c.preferred_name 
      FROM sessions s 
      LEFT JOIN clients c ON s.client_id = c.client_id 
      WHERE s.session_id = ?
    `).get(req.params.id);
    if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

    // Also get related actions
    const actions = req.db.prepare(
      "SELECT * FROM actions WHERE session_id = ?"
    ).all(req.params.id);

    res.json({ success: true, data: { ...session, actions } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST / — create session (also updates client snapshot)
router.post('/', (req, res) => {
  try {
    const {
      client_id, capture_id, date, session_no, main_topic, goal,
      grow_goal, grow_reality, grow_options, grow_will, grow_status,
      key_insight, pattern_blindspot, method_used, method_review,
      client_statements, facts_context, issues_triggers,
      patterns_detail, blind_spots, underlying_factors,
      coach_reflection, private_detail,
      client_action, next_focus, client_summary,
      referral_flag, referral_note, followup_questions,
      actions: actionsList  // Array of action objects to create
    } = req.body;

    const session_id = getNextSessionId(req.db);

    // Insert session
    req.db.prepare(`
      INSERT INTO sessions (
        session_id, client_id, capture_id, date, session_no, main_topic, goal,
        grow_goal, grow_reality, grow_options, grow_will, grow_status,
        key_insight, pattern_blindspot, method_used, method_review,
        client_statements, facts_context, issues_triggers,
        patterns_detail, blind_spots, underlying_factors,
        coach_reflection, private_detail,
        client_action, next_focus, client_summary,
        referral_flag, referral_note, followup_questions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      session_id, client_id, capture_id, date, session_no, main_topic, goal,
      grow_goal, grow_reality, grow_options, grow_will, grow_status || 'unclear',
      key_insight, pattern_blindspot, method_used,
      typeof method_review === 'object' ? JSON.stringify(method_review) : method_review,
      client_statements, facts_context, issues_triggers,
      patterns_detail, blind_spots, underlying_factors,
      coach_reflection, private_detail,
      client_action, next_focus, client_summary,
      referral_flag || 'none', referral_note,
      typeof followup_questions === 'object' ? JSON.stringify(followup_questions) : followup_questions
    );

    // Create actions if provided
    const createdActions = [];
    if (actionsList && Array.isArray(actionsList)) {
      for (const act of actionsList) {
        const lastAction = req.db.prepare(
          "SELECT action_id FROM actions ORDER BY CAST(SUBSTR(action_id, 3) AS INTEGER) DESC LIMIT 1"
        ).get();
        const nextNum = lastAction ? parseInt(lastAction.action_id.split('-')[1]) + 1 : 1;
        const action_id = `A-${nextNum.toString().padStart(3, '0')}`;

        req.db.prepare(`
          INSERT INTO actions (action_id, client_id, session_id, action, due_date, success_indicator, status, obstacle_support)
          VALUES (?, ?, ?, ?, ?, ?, 'not_started', ?)
        `).run(action_id, client_id, session_id, act.action, act.due_date, act.success_indicator, act.obstacle_support);

        createdActions.push({ action_id, ...act });
      }
    }

    // Update client snapshot
    const totalSessions = req.db.prepare("SELECT COUNT(*) as count FROM sessions WHERE client_id = ?").get(client_id);
    req.db.prepare(`
      UPDATE clients SET
        latest_topic = ?, latest_goal = ?, latest_insight = ?,
        latest_pattern = ?, latest_action = ?, next_focus = ?,
        last_session_id = ?, last_session_date = ?,
        total_sessions = ?,
        updated_at = datetime('now','localtime')
      WHERE client_id = ?
    `).run(
      main_topic, goal, key_insight,
      pattern_blindspot, client_action, next_focus,
      session_id, date,
      totalSessions.count,
      client_id
    );

    // Mark capture as processed if linked
    if (capture_id) {
      req.db.prepare("UPDATE quick_captures SET status = 'processed', updated_at = datetime('now','localtime') WHERE capture_id = ?").run(capture_id);
    }

    res.json({ success: true, data: { session_id, actions: createdActions } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /:id — update session
router.put('/:id', (req, res) => {
  try {
    const fields = req.body;
    const allowedFields = [
      'main_topic', 'goal', 'grow_goal', 'grow_reality', 'grow_options', 'grow_will', 'grow_status',
      'key_insight', 'pattern_blindspot', 'method_used', 'method_review',
      'client_statements', 'facts_context', 'issues_triggers',
      'patterns_detail', 'blind_spots', 'underlying_factors',
      'coach_reflection', 'private_detail',
      'client_action', 'next_focus', 'client_summary',
      'referral_flag', 'referral_note', 'followup_questions'
    ];

    const updates = [];
    const values = [];
    for (const [key, value] of Object.entries(fields)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(typeof value === 'object' ? JSON.stringify(value) : value);
      }
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now','localtime')");
      values.push(req.params.id);
      req.db.prepare(`UPDATE sessions SET ${updates.join(', ')} WHERE session_id = ?`).run(...values);
    }

    const session = req.db.prepare("SELECT * FROM sessions WHERE session_id = ?").get(req.params.id);
    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
