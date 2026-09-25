const express = require('express');
const router = express.Router();

// GET / — list all tools
router.get('/', (req, res) => {
  try {
    const tools = req.db.prepare("SELECT * FROM tool_library ORDER BY is_custom ASC, tool_id ASC").all();
    res.json({ success: true, data: tools });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST / — add custom tool
router.post('/', (req, res) => {
  try {
    const { name_en, name_zh, purpose, typical_questions, consent_required, scope_note } = req.body;
    if (!name_en || !name_zh) {
      return res.status(400).json({ success: false, error: '需要工具名稱（中英文）' });
    }

    const result = req.db.prepare(`
      INSERT INTO tool_library (name_en, name_zh, purpose, typical_questions, consent_required, scope_note, is_custom)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(
      name_en, name_zh, purpose,
      typeof typical_questions === 'object' ? JSON.stringify(typical_questions) : typical_questions,
      consent_required || 'no', scope_note
    );

    const tool = req.db.prepare("SELECT * FROM tool_library WHERE tool_id = ?").get(result.lastInsertRowid);
    res.json({ success: true, data: tool });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /:id — update tool
router.put('/:id', (req, res) => {
  try {
    const { name_en, name_zh, purpose, typical_questions, consent_required, scope_note } = req.body;
    req.db.prepare(`
      UPDATE tool_library SET name_en = ?, name_zh = ?, purpose = ?, typical_questions = ?, consent_required = ?, scope_note = ?
      WHERE tool_id = ?
    `).run(
      name_en, name_zh, purpose,
      typeof typical_questions === 'object' ? JSON.stringify(typical_questions) : typical_questions,
      consent_required, scope_note, req.params.id
    );

    const tool = req.db.prepare("SELECT * FROM tool_library WHERE tool_id = ?").get(req.params.id);
    res.json({ success: true, data: tool });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /:id — delete custom tool only
router.delete('/:id', (req, res) => {
  try {
    const tool = req.db.prepare("SELECT * FROM tool_library WHERE tool_id = ?").get(req.params.id);
    if (!tool) return res.status(404).json({ success: false, error: 'Tool not found' });
    if (!tool.is_custom) return res.status(403).json({ success: false, error: '不能刪除預設工具' });

    req.db.prepare("DELETE FROM tool_library WHERE tool_id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
