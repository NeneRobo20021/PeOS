<template>
  <div class="page-container calorie-budget-page">
    <div class="page-header">
      <h2>今日热量开支</h2>
      <el-date-picker v-model="selectedDate" type="date" placeholder="选择日期" size="small"
        format="YYYY/MM/DD" value-format="YYYY-MM-DD" @change="fetchData" />
    </div>

    <div v-if="loading" class="loading-area">
      <el-skeleton :rows="8" animated />
    </div>

    <template v-else>
      <!-- 个人信息卡片 -->
      <div class="info-banner">
        <div class="banner-left">
          <el-icon :size="20"><User /></el-icon>
          <span class="banner-name">{{ data.profile.name }}</span>
          <span class="banner-tags">
            <el-tag size="small" effect="plain">{{ data.profile.gender === 'female' ? '女' : '男' }}</el-tag>
            <el-tag size="small" effect="plain">{{ data.profile.height }}cm</el-tag>
            <el-tag size="small" effect="plain">{{ data.profile.weight }}kg</el-tag>
            <el-tag size="small" effect="plain">{{ data.profile.age }}岁</el-tag>
            <el-tag size="small" type="warning" effect="plain">{{ data.goal.label }}</el-tag>
          </span>
        </div>
        <div class="banner-right">
          <span class="bmr-formula">{{ data.bmrFormula }}</span>
        </div>
      </div>

      <!-- 核心进度条：热量收支总览 -->
      <div class="section-card">
        <div class="section-title">
          <span>热量收支总览</span>
          <span class="section-sub">建议摄入 {{ data.goal.targetIntake }} kcal · {{ data.goal.desc }}</span>
        </div>

        <!-- 双向进度条 -->
        <div class="balance-bar-wrapper">
          <div class="balance-labels">
            <div class="balance-label-left">
              <span class="balance-label-text">摄入</span>
              <span class="balance-label-value intake-color">{{ data.intake.total }} kcal</span>
            </div>
            <div class="balance-label-right">
              <span class="balance-label-value burn-color">{{ data.burn.total }} kcal</span>
              <span class="balance-label-text">消耗</span>
            </div>
          </div>
          <div class="balance-bar">
            <div class="balance-bar-left" :style="{ width: intakePercent + '%' }">
              <span v-if="intakePercent > 15" class="bar-inner-text">{{ Math.round(data.intake.total) }}</span>
            </div>
            <div class="balance-bar-divider"></div>
            <div class="balance-bar-right" :style="{ width: burnPercent + '%' }">
              <span v-if="burnPercent > 15" class="bar-inner-text">{{ Math.round(data.burn.total) }}</span>
            </div>
          </div>
        </div>

        <!-- 净值显示 -->
        <div class="net-result" :class="netClass">
          <template v-if="data.net > 0">
            <el-icon><Top /></el-icon>
            <span>热量盈余 {{ data.net }} kcal</span>
          </template>
          <template v-else-if="data.net < 0">
            <el-icon><Bottom /></el-icon>
            <span>热量赤字 {{ Math.abs(data.net) }} kcal</span>
          </template>
          <template v-else>
            <el-icon><Minus /></el-icon>
            <span>热量平衡</span>
          </template>
        </div>
      </div>

      <!-- 摄入明细进度条 -->
      <div class="section-card">
        <div class="section-title">
          <span>今日摄入明细</span>
          <span class="section-sub">总计 {{ data.intake.total }} kcal</span>
        </div>

        <div v-for="item in intakeItems" :key="item.key" class="progress-row">
          <div class="progress-row-header">
            <span class="progress-row-label">
              <span class="dot" :style="{ background: item.color }"></span>
              {{ item.label }}
            </span>
            <span class="progress-row-value">{{ item.value }} kcal</span>
          </div>
          <el-progress
            :percentage="item.percent"
            :color="item.color"
            :stroke-width="20"
            :show-text="false"
            :duration="0.8"
          />
        </div>

        <!-- 营养素分布 -->
        <div class="nutrition-mini-bar">
          <div class="nutrition-label">营养素分布</div>
          <div class="nutrition-bar">
            <div class="nutrition-seg protein" :style="{ width: proteinPercent + '%' }">
              <span v-if="proteinPercent > 10">蛋白质 {{ data.nutrition.protein }}g</span>
            </div>
            <div class="nutrition-seg fat" :style="{ width: fatPercent + '%' }">
              <span v-if="fatPercent > 10">脂肪 {{ data.nutrition.fat }}g</span>
            </div>
            <div class="nutrition-seg carb" :style="{ width: carbPercent + '%' }">
              <span v-if="carbPercent > 10">碳水 {{ data.nutrition.carb }}g</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 消耗明细进度条 -->
      <div class="section-card">
        <div class="section-title">
          <span>今日消耗明细</span>
          <span class="section-sub">总计 {{ data.burn.total }} kcal</span>
        </div>

        <div v-for="item in burnItems" :key="item.key" class="progress-row">
          <div class="progress-row-header">
            <span class="progress-row-label">
              <span class="dot" :style="{ background: item.color }"></span>
              {{ item.label }}
            </span>
            <span class="progress-row-value">{{ item.value }} kcal</span>
          </div>
          <el-progress
            :percentage="item.percent"
            :color="item.color"
            :stroke-width="20"
            :show-text="false"
            :duration="0.8"
          />
          <div v-if="item.key === 'bmr'" class="progress-row-sub">{{ data.bmrFormula }} = {{ data.bmr }} kcal</div>
        </div>

        <!-- 运动明细列表 -->
        <div v-if="data.exercises.length > 0" class="exercise-list">
          <div class="exercise-list-title">今日运动记录</div>
          <div v-for="(ex, i) in data.exercises" :key="i" class="exercise-item">
            <div class="exercise-item-left">
              <el-icon :size="16"><Bicycle /></el-icon>
              <span class="exercise-type">{{ ex.exercise_type }}</span>
            </div>
            <div class="exercise-item-meta">
              <span v-if="ex.duration">{{ ex.duration }}min</span>
              <span v-if="ex.distance">{{ ex.distance }}km</span>
              <span v-if="ex.sets_count">{{ ex.sets_count }}组</span>
              <span v-if="ex.avg_heart_rate">心率{{ ex.avg_heart_rate }}</span>
            </div>
            <div class="exercise-item-cal">{{ ex.calories_burned || 0 }} kcal</div>
          </div>
        </div>
        <div v-else class="no-exercise">
          <el-icon :size="16"><Coffee /></el-icon>
          <span>今日暂无运动记录</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { User, Top, Bottom, Minus, Bicycle, Coffee } from '@element-plus/icons-vue'
import api from '../api/index'

const selectedDate = ref(new Date().toISOString().slice(0, 10))
const loading = ref(true)
const data = ref({
  profile: { name: '未设置', gender: 'male', height: 170, weight: 65, age: 25, fitness_goal: 'maintain' },
  bmr: 0,
  bmrFormula: '',
  intake: { total: 0, breakfast: 0, lunch: 0, dinner: 0, snacks: 0 },
  nutrition: { protein: 0, fat: 0, carb: 0 },
  burn: { total: 0, bmr: 0, exercise: 0 },
  exercises: [],
  net: 0,
  goal: { factor: 1, label: '维持', desc: '', targetIntake: 0 }
})

const maxScale = computed(() => {
  return Math.max(data.value.intake.total, data.value.burn.total, data.value.goal.targetIntake, 1)
})

const intakePercent = computed(() => {
  return Math.min(100, Math.round((data.value.intake.total / maxScale.value) * 100))
})

const burnPercent = computed(() => {
  return Math.min(100, Math.round((data.value.burn.total / maxScale.value) * 100))
})

const netClass = computed(() => {
  if (data.value.net > 100) return 'net-surplus'
  if (data.value.net < -100) return 'net-deficit'
  return 'net-balance'
})

const intakeItems = computed(() => {
  const max = data.value.intake.total || 1
  return [
    { key: 'breakfast', label: '早餐', value: data.value.intake.breakfast, color: '#f6bd16', percent: Math.round((data.value.intake.breakfast / max) * 100) },
    { key: 'lunch', label: '午餐', value: data.value.intake.lunch, color: '#e8684a', percent: Math.round((data.value.intake.lunch / max) * 100) },
    { key: 'dinner', label: '晚餐', value: data.value.intake.dinner, color: '#6dc8ec', percent: Math.round((data.value.intake.dinner / max) * 100) },
    { key: 'snacks', label: '零嘴', value: data.value.intake.snacks, color: '#bfbfbf', percent: Math.round((data.value.intake.snacks / max) * 100) }
  ]
})

const burnItems = computed(() => {
  const max = data.value.burn.total || 1
  return [
    { key: 'bmr', label: '基础代谢 (BMR)', value: data.value.burn.bmr, color: '#5b8ff9', percent: Math.round((data.value.burn.bmr / max) * 100) },
    { key: 'exercise', label: '运动消耗', value: data.value.burn.exercise, color: '#5ad8a6', percent: Math.round((data.value.burn.exercise / max) * 100) }
  ]
})

const totalNutritionGrams = computed(() => {
  const p = data.value.nutrition.protein || 0
  const f = data.value.nutrition.fat || 0
  const c = data.value.nutrition.carb || 0
  return (p + f + c) || 1
})

const proteinPercent = computed(() => Math.round(((data.value.nutrition.protein || 0) / totalNutritionGrams.value) * 100))
const fatPercent = computed(() => Math.round(((data.value.nutrition.fat || 0) / totalNutritionGrams.value) * 100))
const carbPercent = computed(() => 100 - proteinPercent.value - fatPercent.value)

async function fetchData() {
  loading.value = true
  try {
    const res = await api.get('/summary/calorie-budget', { params: { date: selectedDate.value } })
    if (res.code === 0) data.value = res.data
  } catch (e) {
    console.error('获取热量开支数据失败', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchData())
</script>

<style scoped>
.calorie-budget-page { display: flex; flex-direction: column; gap: 16px; }

/* 个人信息横幅 */
.info-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-radius: 10px;
  padding: 16px 20px;
  flex-wrap: wrap;
  gap: 10px;
}
.banner-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.banner-name { font-size: 16px; font-weight: 600; }
.banner-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.banner-tags :deep(.el-tag) { color: #fff; border-color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.15); }
.bmr-formula { font-size: 12px; opacity: 0.85; font-family: 'Courier New', monospace; }

/* 区块卡片 */
.section-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.section-title {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 16px;
}
.section-title > span:first-child { font-size: 15px; font-weight: 600; color: #303133; }
.section-sub { font-size: 12px; color: #909399; }

/* 双向收支进度条 */
.balance-bar-wrapper { margin: 8px 0 12px; }
.balance-labels { display: flex; justify-content: space-between; margin-bottom: 6px; }
.balance-label-left, .balance-label-right { display: flex; align-items: baseline; gap: 6px; }
.balance-label-text { font-size: 12px; color: #909399; }
.balance-label-value { font-size: 18px; font-weight: 700; }
.intake-color { color: #e8684a; }
.burn-color { color: #5b8ff9; }
.balance-bar {
  display: flex;
  height: 32px;
  border-radius: 16px;
  overflow: hidden;
  background: #f0f0f0;
  position: relative;
}
.balance-bar-left {
  background: linear-gradient(90deg, #ff9c6e, #e8684a);
  display: flex; align-items: center; justify-content: flex-end;
  padding-right: 10px;
  transition: width 0.8s ease;
  border-radius: 16px 0 0 16px;
}
.balance-bar-divider {
  width: 3px;
  background: #303133;
  flex-shrink: 0;
  z-index: 1;
}
.balance-bar-right {
  background: linear-gradient(90deg, #5b8ff9, #6dc8ec);
  display: flex; align-items: center; justify-content: flex-start;
  padding-left: 10px;
  transition: width 0.8s ease;
  border-radius: 0 16px 16px 0;
  flex: 1;
}
.bar-inner-text { font-size: 12px; font-weight: 600; color: #fff; white-space: nowrap; }

/* 净值 */
.net-result {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  margin-top: 8px;
}
.net-surplus { background: #fff2f0; color: #cf1322; }
.net-deficit { background: #f6ffed; color: #389e0d; }
.net-balance { background: #e6f7ff; color: #096dd9; }

/* 单行进度条 */
.progress-row { margin-bottom: 14px; }
.progress-row-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.progress-row-label { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #606266; }
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.progress-row-value { font-size: 13px; font-weight: 600; color: #303133; }
.progress-row-sub { font-size: 11px; color: #c0c4cc; margin-top: 3px; font-family: 'Courier New', monospace; }
.progress-row :deep(.el-progress-bar__outer) { border-radius: 10px; }
.progress-row :deep(.el-progress-bar__inner) { border-radius: 10px; }

/* 营养素迷你条 */
.nutrition-mini-bar { margin-top: 16px; padding-top: 14px; border-top: 1px dashed #e8e8e8; }
.nutrition-label { font-size: 12px; color: #909399; margin-bottom: 6px; }
.nutrition-bar {
  display: flex;
  height: 28px;
  border-radius: 14px;
  overflow: hidden;
}
.nutrition-seg {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #fff;
  font-weight: 600;
  transition: width 0.8s ease;
  min-width: 0;
}
.nutrition-seg.protein { background: #5470c6; }
.nutrition-seg.fat { background: #fac858; }
.nutrition-seg.carb { background: #ee6666; }

/* 运动明细列表 */
.exercise-list { margin-top: 16px; padding-top: 14px; border-top: 1px dashed #e8e8e8; }
.exercise-list-title { font-size: 12px; color: #909399; margin-bottom: 8px; }
.exercise-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
}
.exercise-item:last-child { border-bottom: none; }
.exercise-item-left { display: flex; align-items: center; gap: 6px; }
.exercise-type { font-size: 13px; font-weight: 500; color: #303133; }
.exercise-item-meta { display: flex; gap: 10px; font-size: 12px; color: #909399; }
.exercise-item-cal { font-size: 13px; font-weight: 600; color: #5ad8a6; }

.no-exercise {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 16px;
  color: #c0c4cc;
  font-size: 13px;
}

.loading-area { background: #fff; border-radius: 10px; padding: 20px; }

@media (max-width: 768px) {
  .info-banner { flex-direction: column; align-items: flex-start; }
  .exercise-item { flex-wrap: wrap; gap: 6px; }
}
</style>
