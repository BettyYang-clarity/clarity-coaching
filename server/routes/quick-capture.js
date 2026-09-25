const express = require('express');
const router = express.Router();

// GET / — list captures with filters
router.get('/', (req, res) => {
  try {
    const { client_id, status } = req.query;
    let query = "SELECT qc.*, c.preferred_name FROM quick_captures qc LEFT JOIN clients c ON qc.client_id = c.client_id WHERE 1=1";
    const params = [];

    if (client_id) {
      query += " AND qc.client_id = ?";
      params.push(client_id);
    }
    if (status) {
      query += " AND qc.status = ?";
      params.push(status);
    }

    query += " ORDER BY qc.updated_at DESC";
    const captures = req.db.prepare(query).all(...params);
    res.json({ success: true, data: captures });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /:id — single capture
router.get('/:id', (req, res) => {
  try {
    const capture = req.db.prepare(
      "SELECT qc.*, c.preferred_name FROM quick_captures qc LEFT JOIN clients c ON qc.client_id = c.client_id WHERE qc.capture_id = ?"
    ).get(req.params.id);
    if (!capture) return res.status(404).json({ success: false, error: 'Capture not found' });
    res.json({ success: true, data: capture });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST / — create new capture
router.post('/', (req, res) => {
  try {
    const {
      client_id, session_date, session_no, main_topic, goal_today,
      keywords, emotion_shift, pattern_noticed, tool_used,
      client_insight, action_discussed, followup_question,
      coach_memo, recording_consent, raw_transcript
    } = req.body;

    const date = session_date || new Date().toISOString().split('T')[0];

    // Auto-calculate session_no if not provided
    let sno = session_no;
    if (!sno && client_id) {
      const last = req.db.prepare(
        "SELECT MAX(session_no) as max_no FROM quick_captures WHERE client_id = ?"
      ).get(client_id);
      sno = (last?.max_no || 0) + 1;
    }

    const result = req.db.prepare(`
      INSERT INTO quick_captures (
        client_id, session_date, session_no, main_topic, goal_today,
        keywords, emotion_shift, pattern_noticed, tool_used,
        client_insight, action_discussed, followup_question,
        coach_memo, recording_consent, raw_transcript
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      client_id, date, sno, main_topic, goal_today,
      keywords, emotion_shift, pattern_noticed, tool_used,
      client_insight, action_discussed, followup_question,
      coach_memo, recording_consent || 'not_asked', raw_transcript
    );

    const capture = req.db.prepare("SELECT * FROM quick_captures WHERE capture_id = ?").get(result.lastInsertRowid);
    res.json({ success: true, data: capture });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /:id — update capture (auto-save from frontend)
router.put('/:id', (req, res) => {
  try {
    const fields = req.body;
    const allowedFields = [
      'client_id', 'session_date', 'session_no', 'main_topic', 'goal_today',
      'keywords', 'emotion_shift', 'pattern_noticed', 'tool_used',
      'client_insight', 'action_discussed', 'followup_question',
      'coach_memo', 'recording_consent', 'raw_transcript'
    ];

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
      req.db.prepare(`UPDATE quick_captures SET ${updates.join(', ')} WHERE capture_id = ?`).run(...values);
    }

    const capture = req.db.prepare("SELECT * FROM quick_captures WHERE capture_id = ?").get(req.params.id);
    res.json({ success: true, data: capture });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /:id/status — mark as processed
router.put('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    req.db.prepare(
      "UPDATE quick_captures SET status = ?, updated_at = datetime('now','localtime') WHERE capture_id = ?"
    ).run(status, req.params.id);
    res.json({ success: true, data: { capture_id: parseInt(req.params.id), status } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
