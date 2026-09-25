/**
 * Database layer using sql.js (pure JS SQLite — no native compilation needed)
 * Provides a better-sqlite3-compatible API wrapper so all routes work unchanged.
 */
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data', 'clarity.db');
const dataDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// sql.js is async to initialize, so we use a proxy pattern
let _db = null;
let _saveTimer = null;

/**
 * Compatibility wrapper: makes sql.js look like better-sqlite3
 * so all existing route code (db.prepare(...).all/get/run) works unchanged.
 */
class DbWrapper {
  constructor(sqlDb) {
    this._db = sqlDb;
  }

  prepare(sql) {
    const db = this._db;
    return {
      // Run a query that returns all rows
      all(...params) {
        const sanitized = params.map(p => p === undefined ? null : p);
        try {
          const stmt = db.prepare(sql);
          if (sanitized.length > 0) stmt.bind(sanitized);
          const results = [];
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return results;
        } catch (e) {
          console.error('SQL all() error:', sql, sanitized, e.message);
          throw e;
        }
      },
      // Run a query that returns a single row
      get(...params) {
        const sanitized = params.map(p => p === undefined ? null : p);
        try {
          const stmt = db.prepare(sql);
          if (sanitized.length > 0) stmt.bind(sanitized);
          let result = undefined;
          if (stmt.step()) {
            result = stmt.getAsObject();
          }
          stmt.free();
          return result;
        } catch (e) {
          console.error('SQL get() error:', sql, sanitized, e.message);
          throw e;
        }
      },
      // Run an INSERT/UPDATE/DELETE
      run(...params) {
        const sanitized = params.map(p => p === undefined ? null : p);
        try {
          db.run(sql, sanitized);
          const lastInsertRowid = db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0];
          const changes = db.getRowsModified();
          scheduleSave();
          return { lastInsertRowid, changes };
        } catch (e) {
          console.error('SQL run() error:', sql, sanitized, e.message);
          throw e;
        }
      }
    };
  }

  exec(sql) {
    try {
      this._db.run(sql);
      scheduleSave();
    } catch (e) {
      console.error('SQL exec() error:', e.message);
      throw e;
    }
  }

  pragma(pragmaStr) {
    try {
      this._db.run(`PRAGMA ${pragmaStr}`);
    } catch (e) {
      // Ignore pragma errors in sql.js (some aren't supported)
    }
  }

  transaction(fn) {
    const self = this;
    return function(...args) {
      self._db.run('BEGIN TRANSACTION');
      try {
        const result = fn(...args);
        self._db.run('COMMIT');
        scheduleSave();
        return result;
      } catch (e) {
        self._db.run('ROLLBACK');
        throw e;
      }
    };
  }
}

// Debounced save — writes to disk after modifications
function scheduleSave() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    if (_db && _db._db) {
      try {
        const data = _db._db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
      } catch (e) {
        console.error('Failed to save database:', e.message);
      }
    }
  }, 500); // Save 500ms after last write
}

// Force save (for shutdown)
function forceSave() {
  if (_db && _db._db) {
    try {
      const data = _db._db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
      console.log('Database saved to', dbPath);
    } catch (e) {
      console.error('Failed to save database:', e.message);
    }
  }
}

// Save on process exit
process.on('exit', forceSave);
process.on('SIGINT', () => { forceSave(); process.exit(); });
process.on('SIGTERM', () => { forceSave(); process.exit(); });

// Initialize database
async function initDatabase() {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  let sqlDb;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    sqlDb = new SQL.Database(fileBuffer);
    console.log('Loaded existing database from', dbPath);
  } else {
    sqlDb = new SQL.Database();
    console.log('Created new database');
  }

  _db = new DbWrapper(sqlDb);

  // Enable foreign keys
  _db.pragma('foreign_keys = ON');

  // Create tables
  _db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      client_id       TEXT PRIMARY KEY,
      preferred_name  TEXT NOT NULL,
      language        TEXT DEFAULT '繁體中文',
      coaching_purpose TEXT,
      mbti_source     TEXT DEFAULT 'unknown',
      mbti_type       TEXT,
      start_date      TEXT,
      current_focus   TEXT,
      consent_note    TEXT,
      latest_topic    TEXT,
      latest_goal     TEXT,
      latest_insight  TEXT,
      latest_pattern  TEXT,
      latest_action   TEXT,
      next_focus      TEXT,
      last_session_id TEXT,
      last_session_date TEXT,
      total_sessions  INTEGER DEFAULT 0,
      created_at      TEXT DEFAULT (datetime('now','localtime')),
      updated_at      TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS quick_captures (
      capture_id      INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id       TEXT,
      session_date    TEXT NOT NULL,
      session_no      INTEGER,
      main_topic      TEXT,
      goal_today      TEXT,
      keywords        TEXT,
      emotion_shift   TEXT,
      pattern_noticed TEXT,
      tool_used       TEXT,
      client_insight  TEXT,
      action_discussed TEXT,
      followup_question TEXT,
      coach_memo      TEXT,
      recording_consent TEXT DEFAULT 'not_asked',
      raw_transcript  TEXT,
      status          TEXT DEFAULT 'draft',
      created_at      TEXT DEFAULT (datetime('now','localtime')),
      updated_at      TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      session_id      TEXT PRIMARY KEY,
      client_id       TEXT NOT NULL,
      capture_id      INTEGER,
      date            TEXT NOT NULL,
      session_no      INTEGER,
      main_topic      TEXT,
      goal            TEXT,
      grow_goal       TEXT,
      grow_reality    TEXT,
      grow_options    TEXT,
      grow_will       TEXT,
      grow_status     TEXT DEFAULT 'unclear',
      key_insight     TEXT,
      pattern_blindspot TEXT,
      method_used     TEXT,
      method_review   TEXT,
      client_statements TEXT,
      facts_context   TEXT,
      issues_triggers TEXT,
      patterns_detail TEXT,
      blind_spots     TEXT,
      underlying_factors TEXT,
      coach_reflection TEXT,
      private_detail  TEXT,
      client_action   TEXT,
      next_focus      TEXT,
      client_summary  TEXT,
      referral_flag   TEXT DEFAULT 'none',
      referral_note   TEXT,
      followup_questions TEXT,
      created_at      TEXT DEFAULT (datetime('now','localtime')),
      updated_at      TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS actions (
      action_id       TEXT PRIMARY KEY,
      client_id       TEXT NOT NULL,
      session_id      TEXT,
      action          TEXT NOT NULL,
      due_date        TEXT,
      success_indicator TEXT,
      status          TEXT DEFAULT 'not_started',
      obstacle_support TEXT,
      review_note     TEXT,
      created_at      TEXT DEFAULT (datetime('now','localtime')),
      updated_at      TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS tool_library (
      tool_id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name_en         TEXT NOT NULL,
      name_zh         TEXT NOT NULL,
      purpose         TEXT,
      typical_questions TEXT,
      consent_required TEXT DEFAULT 'no',
      scope_note      TEXT,
      is_custom       INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ai_logs (
      log_id          INTEGER PRIMARY KEY AUTOINCREMENT,
      capture_id      INTEGER,
      session_id      TEXT,
      prompt_type     TEXT,
      prompt_sent     TEXT,
      ai_response     TEXT,
      model_used      TEXT,
      client_id       TEXT,
      created_at      TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key             TEXT PRIMARY KEY,
      value           TEXT
    );
  `);

  // Seed tool_library if empty
  const toolCount = _db.prepare('SELECT COUNT(*) as count FROM tool_library').get();
  if (toolCount.count === 0) {
    const defaultTools = [
      ['GROW', 'GROW 模型', '主要 coaching framework，組織會談結構',
        '["你希望達成什麼？(Goal)", "現在的情況是什麼？(Reality)", "你有哪些選擇？(Options)", "你接下來要做什麼？(Will)"]',
        'no', '所有會談優先使用 GROW 組織'],
      ['MBTI Reflection', 'MBTI 反思', '透過性格偏好促進自我覺察',
        '["你覺得自己在這個情境中偏好用哪種方式？", "這跟你平常的反應模式一致嗎？"]',
        'no', 'MBTI 是反思工具，不是診斷或固定人格分類'],
      ['CBT-based Questioning', 'CBT 認知行為提問', '辨識自動化思考與認知偏誤',
        '["當時你腦中的第一個想法是什麼？", "有沒有其他可能的解釋？", "最壞的情況真的會發生嗎？"]',
        'no', '作為 coaching 提問工具使用，不作為治療'],
      ['NLP / Reframing', 'NLP / 重新框架', '改變觀點與語言模式',
        '["如果換一個角度看這件事？", "假設這個問題已經解決了，你會看到什麼？"]',
        'no', '用於教練對話中的觀點轉換'],
      ['Positive Psychology', '正向心理學', '發掘優勢與正向資源',
        '["在這個挑戰中，你用了哪些自己的優勢？", "過去成功的經驗中，你做對了什麼？"]',
        'no', '聚焦於優勢與正向經驗'],
      ['Boundary Exploration', '界限探索', '探索個人界限與人際邊界',
        '["在這個關係中，你的底線是什麼？", "你覺得可以接受和不能接受的分別是什麼？"]',
        'no', '教練引導探索，不代替心理諮商'],
      ['Hypnosis', '催眠引導', '深度放鬆與潛意識探索',
        '["讓自己放鬆，注意你內心浮現的畫面", "這個感覺想告訴你什麼？"]',
        'yes', '需要客戶明確同意，教練需有相關訓練'],
      ['Tarot / Symbolic Reflection', '塔羅 / 象徵反思', '透過象徵符號引發反思',
        '["這張牌讓你聯想到什麼？", "這個象徵跟你的現況有什麼連結？"]',
        'yes', '作為投射與反思工具，不作為預測或診斷']
    ];

    const insertSql = 'INSERT INTO tool_library (name_en, name_zh, purpose, typical_questions, consent_required, scope_note) VALUES (?, ?, ?, ?, ?, ?)';
    for (const tool of defaultTools) {
      _db.prepare(insertSql).run(...tool);
    }
  }

  // Force initial save
  forceSave();

  return _db;
}

// Module export: a promise that resolves to the db wrapper
let dbPromise = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = initDatabase();
  }
  return dbPromise;
}

module.exports = { getDb, forceSave };
