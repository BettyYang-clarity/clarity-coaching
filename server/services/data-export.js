/**
 * Data export/import services
 */

function exportAll(db) {
  const clients = db.prepare("SELECT * FROM clients").all();
  const sessions = db.prepare("SELECT * FROM sessions").all();
  const actions = db.prepare("SELECT * FROM actions").all();
  const quickCaptures = db.prepare("SELECT * FROM quick_captures").all();
  const toolLibrary = db.prepare("SELECT * FROM tool_library").all();
  const aiLogs = db.prepare("SELECT * FROM ai_logs").all();

  return {
    version: '1.0',
    exported_at: new Date().toISOString(),
    data: {
      clients,
      sessions,
      actions,
      quick_captures: quickCaptures,
      tool_library: toolLibrary,
      ai_logs: aiLogs
    }
  };
}

function importAll(db, importData) {
  if (!importData?.data) {
    throw new Error('無效的備份檔案格式');
  }

  const { clients, sessions, actions, quick_captures, tool_library } = importData.data;

  const importTransaction = db.transaction(() => {
    // Clear existing data (order matters for foreign keys)
    db.prepare("DELETE FROM ai_logs").run();
    db.prepare("DELETE FROM actions").run();
    db.prepare("DELETE FROM sessions").run();
    db.prepare("DELETE FROM quick_captures").run();
    db.prepare("DELETE FROM clients").run();
    db.prepare("DELETE FROM tool_library").run();

    // Re-insert clients
    if (clients) {
      const insertClient = db.prepare(`
        INSERT INTO clients (client_id, preferred_name, language, coaching_purpose, mbti_source, mbti_type,
          start_date, current_focus, consent_note, latest_topic, latest_goal, latest_insight,
          latest_pattern, latest_action, next_focus, last_session_id, last_session_date,
          total_sessions, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const c of clients) {
        insertClient.run(
          c.client_id, c.preferred_name, c.language, c.coaching_purpose, c.mbti_source, c.mbti_type,
          c.start_date, c.current_focus, c.consent_note, c.latest_topic, c.latest_goal, c.latest_insight,
          c.latest_pattern, c.latest_action, c.next_focus, c.last_session_id, c.last_session_date,
          c.total_sessions, c.created_at, c.updated_at
        );
      }
    }

    // Re-insert quick_captures
    if (quick_captures) {
      const insertCapture = db.prepare(`
        INSERT INTO quick_captures (capture_id, client_id, session_date, session_no, main_topic, goal_today,
          keywords, emotion_shift, pattern_noticed, tool_used, client_insight, action_discussed,
          followup_question, coach_memo, recording_consent, raw_transcript, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const qc of quick_captures) {
        insertCapture.run(
          qc.capture_id, qc.client_id, qc.session_date, qc.session_no, qc.main_topic, qc.goal_today,
          qc.keywords, qc.emotion_shift, qc.pattern_noticed, qc.tool_used, qc.client_insight, qc.action_discussed,
          qc.followup_question, qc.coach_memo, qc.recording_consent, qc.raw_transcript, qc.status, qc.created_at, qc.updated_at
        );
      }
    }

    // Re-insert sessions
    if (sessions) {
      const insertSession = db.prepare(`
        INSERT INTO sessions (session_id, client_id, capture_id, date, session_no, main_topic, goal,
          grow_goal, grow_reality, grow_options, grow_will, grow_status,
          key_insight, pattern_blindspot, method_used, method_review,
          client_statements, facts_context, issues_triggers, patterns_detail,
          blind_spots, underlying_factors, coach_reflection, private_detail,
          client_action, next_focus, client_summary,
          referral_flag, referral_note, followup_questions, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const s of sessions) {
        insertSession.run(
          s.session_id, s.client_id, s.capture_id, s.date, s.session_no, s.main_topic, s.goal,
          s.grow_goal, s.grow_reality, s.grow_options, s.grow_will, s.grow_status,
          s.key_insight, s.pattern_blindspot, s.method_used, s.method_review,
          s.client_statements, s.facts_context, s.issues_triggers, s.patterns_detail,
          s.blind_spots, s.underlying_factors, s.coach_reflection, s.private_detail,
          s.client_action, s.next_focus, s.client_summary,
          s.referral_flag, s.referral_note, s.followup_questions, s.created_at, s.updated_at
        );
      }
    }

    // Re-insert actions
    if (actions) {
      const insertAction = db.prepare(`
        INSERT INTO actions (action_id, client_id, session_id, action, due_date, success_indicator,
          status, obstacle_support, review_note, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const a of actions) {
        insertAction.run(
          a.action_id, a.client_id, a.session_id, a.action, a.due_date, a.success_indicator,
          a.status, a.obstacle_support, a.review_note, a.created_at, a.updated_at
        );
      }
    }

    // Re-insert tool_library
    if (tool_library) {
      const insertTool = db.prepare(`
        INSERT INTO tool_library (tool_id, name_en, name_zh, purpose, typical_questions, consent_required, scope_note, is_custom)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const t of tool_library) {
        insertTool.run(t.tool_id, t.name_en, t.name_zh, t.purpose, t.typical_questions, t.consent_required, t.scope_note, t.is_custom);
      }
    }
  });

  importTransaction();
}

function exportCSV(db, tableName) {
  const allowedTables = ['clients', 'sessions', 'actions', 'quick_captures', 'tool_library'];
  if (!allowedTables.includes(tableName)) {
    throw new Error(`不支援的表格: ${tableName}`);
  }

  const rows = db.prepare(`SELECT * FROM ${tableName}`).all();
  if (rows.length === 0) return '';

  const headers = Object.keys(rows[0]);
  const csvLines = [headers.join(',')];

  for (const row of rows) {
    const values = headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
    });
    csvLines.push(values.join(','));
  }

  return csvLines.join('\n');
}

module.exports = { exportAll, importAll, exportCSV };
