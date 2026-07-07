const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// 获取指定日期的热量汇总
router.get('/daily', (req, res) => {
  const db = getDb();
  const date = req.query.date || new Date().toISOString().slice(0, 10);

  const summary = db.prepare('SELECT * FROM daily_summary WHERE summary_date = ?').get(date);

  if (summary) {
    return res.json({ code: 0, data: summary });
  }

  // 实时计算
  const data = calculateDailySummary(db, date);
  // 缓存
  db.prepare(`
    INSERT OR REPLACE INTO daily_summary (summary_date, calorie_intake, protein_intake, fat_intake, carb_intake, bmr, exercise_burn, total_burn, net_calories, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?, datetime('now','localtime'))
  `).run(date, data.calorie_intake, data.protein_intake, data.fat_intake, data.carb_intake, data.bmr, data.exercise_burn, data.total_burn, data.net_calories);

  res.json({ code: 0, data });
});

// 获取一段时间的热量趋势
router.get('/trend', (req, res) => {
  const db = getDb();
  const days = parseInt(req.query.days) || 7;
  const summaries = db.prepare(`
    SELECT * FROM daily_summary
    WHERE summary_date >= date('now', 'localtime', '-${days} days')
    ORDER BY summary_date ASC
  `).all();
  res.json({ code: 0, data: summaries });
});

// 获取今日热量开支明细（进度条页用）
router.get('/calorie-budget', (req, res) => {
  const db = getDb();
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const data = calculateDailySummary(db, date);

  const profile = db.prepare('SELECT * FROM user_profile LIMIT 1').get();
  const heightCm = profile?.height || 170;
  const weightKg = profile?.weight || 65;
  const age = profile?.birthday ? Math.floor((new Date() - new Date(profile.birthday)) / (365.25 * 24 * 3600 * 1000)) : 25;

  // 按餐型拆分摄入
  const mealTypes = ['breakfast', 'lunch', 'dinner'];
  const intakeByType = {};
  for (const mt of mealTypes) {
    const rows = db.prepare(`
      SELECT mf.weight, f.energy FROM meals m
      JOIN meal_foods mf ON m.id = mf.meal_id
      LEFT JOIN foods f ON mf.food_id = f.id
      WHERE m.meal_date = ? AND m.meal_type = ?
    `).all(date, mt);
    let cal = 0;
    for (const r of rows) {
      if (r.weight && r.energy) cal += (r.energy * (r.weight / 100)) / 4.184;
    }
    intakeByType[mt] = Math.round(cal * 100) / 100;
  }

  // 零嘴摄入
  const snackRows = db.prepare(`
    SELECT s.weight, f.energy FROM snacks s
    LEFT JOIN foods f ON s.food_id = f.id WHERE s.snack_date = ?
  `).all(date);
  let snackCal = 0;
  for (const r of snackRows) {
    if (r.weight && r.energy) snackCal += (r.energy * (r.weight / 100)) / 4.184;
  }
  intakeByType.snacks = Math.round(snackCal * 100) / 100;

  // 今日运动明细列表
  const exercises = db.prepare(`
    SELECT exercise_type, duration, distance, sets_count, calories_burned, avg_heart_rate, avg_pace
    FROM exercises WHERE exercise_date = ? ORDER BY created_at DESC
  `).all(date);

  // 健身目标 → 建议摄入系数
  const goalMap = {
    'lose_weight': { factor: 0.8, label: '减重', desc: '建议摄入为代谢的 80%' },
    'maintain':    { factor: 1.0, label: '维持', desc: '建议摄入与代谢持平' },
    'gain_muscle': { factor: 1.15, label: '增肌', desc: '建议摄入为代谢的 115%' },
    'gain_weight': { factor: 1.2, label: '增重', desc: '建议摄入为代谢的 120%' }
  };
  const goalInfo = goalMap[profile?.fitness_goal] || goalMap.maintain;
  const targetIntake = Math.round(data.bmr * goalInfo.factor);

  res.json({
    code: 0,
    data: {
      date,
      profile: { name: profile?.name || '未设置', gender: profile?.gender || 'male', height: heightCm, weight: weightKg, age, fitness_goal: profile?.fitness_goal || 'maintain' },
      bmr: data.bmr,
      bmrFormula: profile?.gender === 'female'
        ? `10×${weightKg} + 6.25×${heightCm} - 5×${age} - 161`
        : `10×${weightKg} + 6.25×${heightCm} - 5×${age} + 5`,
      intake: {
        total: data.calorie_intake,
        breakfast: intakeByType.breakfast || 0,
        lunch: intakeByType.lunch || 0,
        dinner: intakeByType.dinner || 0,
        snacks: intakeByType.snacks || 0
      },
      nutrition: { protein: data.protein_intake, fat: data.fat_intake, carb: data.carb_intake },
      burn: { total: data.total_burn, bmr: data.bmr, exercise: data.exercise_burn },
      exercises,
      net: data.net_calories,
      goal: { ...goalInfo, targetIntake }
    }
  });
});

// 获取饮食分析数据
router.get('/diet-analysis', (req, res) => {
  const db = getDb();
  const days = parseInt(req.query.days) || 30;

  const meals = db.prepare(`
    SELECT m.meal_date, m.meal_type, SUM(mf.price) as total_price
    FROM meals m
    LEFT JOIN meal_foods mf ON m.id = mf.meal_id
    WHERE m.meal_date >= date('now', 'localtime', '-${days} days')
    GROUP BY m.meal_date, m.meal_type
    ORDER BY m.meal_date ASC
  `).all();

  const snacks = db.prepare(`
    SELECT snack_date, COUNT(*) as count, SUM(price) as total_price
    FROM snacks
    WHERE snack_date >= date('now', 'localtime', '-${days} days')
    GROUP BY snack_date
    ORDER BY snack_date ASC
  `).all();

  res.json({ code: 0, data: { meals, snacks } });
});

function calculateDailySummary(db, date) {
  // 获取用户档案
  const profile = db.prepare('SELECT * FROM user_profile LIMIT 1').get();
  const heightCm = profile?.height || 170;
  const weightKg = profile?.weight || 65;
  const age = profile?.birthday ? Math.floor((new Date() - new Date(profile.birthday)) / (365.25 * 24 * 3600 * 1000)) : 25;

  // BMR: Mifflin-St Jeor 公式
  let bmr = 0;
  if (profile?.gender === 'female') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  bmr = Math.round(bmr * 100) / 100;

  // 三餐热量
  const mealRows = db.prepare(`
    SELECT mf.weight, f.energy, f.protein, f.fat, f.carbohydrate
    FROM meals m
    JOIN meal_foods mf ON m.id = mf.meal_id
    LEFT JOIN foods f ON mf.food_id = f.id
    WHERE m.meal_date = ?
  `).all(date);

  let calorie_intake = 0, protein_intake = 0, fat_intake = 0, carb_intake = 0;

  for (const row of mealRows) {
    if (row.weight && row.energy) {
      const factor = row.weight / 100;
      // energy 是 kJ，转 kcal: 1 kcal = 4.184 kJ
      calorie_intake += (row.energy * factor) / 4.184;
      protein_intake += (row.protein || 0) * factor;
      fat_intake += (row.fat || 0) * factor;
      carb_intake += (row.carbohydrate || 0) * factor;
    }
  }

  // 零嘴热量
  const snackRows = db.prepare(`
    SELECT s.weight, f.energy, f.protein, f.fat, f.carbohydrate
    FROM snacks s
    LEFT JOIN foods f ON s.food_id = f.id
    WHERE s.snack_date = ?
  `).all(date);

  for (const row of snackRows) {
    if (row.weight && row.energy) {
      const factor = row.weight / 100;
      calorie_intake += (row.energy * factor) / 4.184;
      protein_intake += (row.protein || 0) * factor;
      fat_intake += (row.fat || 0) * factor;
      carb_intake += (row.carbohydrate || 0) * factor;
    }
  }

  // 运动消耗
  const exerciseRow = db.prepare(`
    SELECT COALESCE(SUM(calories_burned), 0) as total_burn
    FROM exercises WHERE exercise_date = ?
  `).get(date);
  const exercise_burn = exerciseRow?.total_burn || 0;

  // 总消耗 = BMR + 运动
  const total_burn = Math.round((bmr + exercise_burn) * 100) / 100;

  return {
    summary_date: date,
    calorie_intake: Math.round(calorie_intake * 100) / 100,
    protein_intake: Math.round(protein_intake * 100) / 100,
    fat_intake: Math.round(fat_intake * 100) / 100,
    carb_intake: Math.round(carb_intake * 100) / 100,
    bmr: Math.round(bmr * 100) / 100,
    exercise_burn: Math.round(exercise_burn * 100) / 100,
    total_burn,
    net_calories: Math.round((calorie_intake - total_burn) * 100) / 100
  };
}

module.exports = router;
