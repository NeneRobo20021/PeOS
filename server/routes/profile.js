const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// 获取用户档案
router.get('/', (req, res) => {
  const db = getDb();
  const profile = db.prepare('SELECT * FROM user_profile LIMIT 1').get();
  if (!profile) return res.status(404).json({ code: 1, msg: '未设置用户档案' });
  res.json({ code: 0, data: profile });
});

// 更新用户档案
router.put('/', (req, res) => {
  const db = getDb();
  const { name, gender, birthday, height, weight, fitness_goal } = req.body;

  db.prepare(`
    UPDATE user_profile SET
      name = COALESCE(?, name),
      gender = COALESCE(?, gender),
      birthday = COALESCE(?, birthday),
      height = COALESCE(?, height),
      weight = COALESCE(?, weight),
      fitness_goal = COALESCE(?, fitness_goal),
      updated_at = datetime('now', 'localtime')
    WHERE id = (SELECT id FROM user_profile LIMIT 1)
  `).run(name, gender, birthday, height, weight, fitness_goal);

  const profile = db.prepare('SELECT * FROM user_profile LIMIT 1').get();
  res.json({ code: 0, data: profile });
});

module.exports = router;
