const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'food_diet.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    -- 用户档案
    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      gender TEXT CHECK(gender IN ('male', 'female', 'other')),
      birthday TEXT,             -- ISO date YYYY-MM-DD
      height REAL,               -- cm
      weight REAL,               -- kg
      fitness_goal TEXT,         -- lose_weight / build_muscle / maintain / etc
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- 食品仓储
    CREATE TABLE IF NOT EXISTS foods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL,                -- 购买价格
      weight REAL,               -- 购买重量(g)
      weight_unit TEXT DEFAULT 'g',
      image_path TEXT,           -- 裁剪后的食品图片路径
      -- 营养成分(每100g)
      energy REAL,               -- 能量(kJ)
      protein REAL,              -- 蛋白质(g)
      fat REAL,                  -- 脂肪(g)
      carbohydrate REAL,         -- 碳水化合物(g)
      sodium REAL,               -- 钠(mg)
      -- 额外营养(可选)
      fiber REAL,
      sugar REAL,
      saturated_fat REAL,
      trans_fat REAL,
      cholesterol REAL,
      calcium REAL,
      -- 配料表
      ingredients TEXT,          -- OCR识别 + 人工修正的配料表
      -- 状态
      consumed_percent REAL DEFAULT 0,  -- 已食用百分比 0-100
      is_finished INTEGER DEFAULT 0,    -- 是否已吃完
      purchase_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- 一日三餐
    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast', 'lunch', 'dinner')),
      meal_date TEXT NOT NULL,   -- YYYY-MM-DD
      total_price REAL,
      image_path TEXT,           -- 餐食照片
      review TEXT,               -- 文字评价
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- 餐食-食品关联
    CREATE TABLE IF NOT EXISTS meal_foods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meal_id INTEGER NOT NULL,
      food_id INTEGER,
      food_name TEXT NOT NULL,   -- 冗余：即便food被删除也能保留记录
      weight REAL,               -- 食用重量(g)
      price REAL,                -- 该项食品价格(如果有)
      FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE,
      FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE SET NULL
    );

    -- 零嘴记录
    CREATE TABLE IF NOT EXISTS snacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      food_id INTEGER,           -- 关联食品仓储中的食品
      name TEXT NOT NULL,        -- 零嘴名称
      snack_date TEXT NOT NULL,  -- YYYY-MM-DD
      snack_time TEXT,           -- HH:MM
      weight REAL,               -- 食用重量(g)
      price REAL,                -- 价格（即时购买时有）
      purchase_type TEXT DEFAULT 'non_instant' CHECK(purchase_type IN ('instant', 'non_instant')),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE SET NULL
    );

    -- 运动记录
    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exercise_date TEXT NOT NULL,
      exercise_type TEXT NOT NULL, -- running / cycling / swimming / strength / etc
      duration INTEGER,            -- 时长(分钟)
      distance REAL,               -- 里程(km)，有氧运动用
      sets_count INTEGER,          -- 组数，力量训练用
      calories_burned REAL,        -- 消耗卡路里(kcal)
      avg_heart_rate INTEGER,      -- 平均心率
      max_heart_rate INTEGER,      -- 最大心率
      avg_pace TEXT,               -- 配速，如 "5'30\""
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- 每日热量汇总(缓存表，由后端计算生成)
    CREATE TABLE IF NOT EXISTS daily_summary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      summary_date TEXT NOT NULL UNIQUE,
      -- 摄入
      calorie_intake REAL DEFAULT 0,     -- 总摄入热量(kcal)
      protein_intake REAL DEFAULT 0,
      fat_intake REAL DEFAULT 0,
      carb_intake REAL DEFAULT 0,
      -- 消耗
      bmr REAL DEFAULT 0,                -- 基础代谢
      exercise_burn REAL DEFAULT 0,      -- 运动消耗
      total_burn REAL DEFAULT 0,         -- 总消耗
      -- 加工食品占比
      processed_food_percent REAL DEFAULT 0,
      -- 差额
      net_calories REAL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- 离线同步队列(记录从各端同步来的操作日志)
    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      operation TEXT NOT NULL,   -- INSERT / UPDATE / DELETE
      table_name TEXT NOT NULL,
      record_id INTEGER,
      payload TEXT,              -- JSON
      synced_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

  console.log('[DB] Schema initialized successfully');
}

// 初始化一条默认用户档案
function ensureUserProfile() {
  const db = getDb();
  const row = db.prepare('SELECT id FROM user_profile LIMIT 1').get();
  if (!row) {
    db.prepare(`
      INSERT INTO user_profile (name, fitness_goal) VALUES (?, ?)
    `).run('默认用户', 'maintain');
    console.log('[DB] Created default user profile');
  }
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, initSchema, ensureUserProfile, closeDb };
