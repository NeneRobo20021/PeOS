<template>
  <div class="page-container profile-page">
    <div class="page-header">
      <h2>个人档案</h2>
    </div>

    <el-card shadow="never" style="max-width:600px;">
      <el-form :model="form" label-width="120px" label-position="right" v-loading="loading">
        <el-form-item label="昵称">
          <el-input v-model="form.name" placeholder="你的称呼" />
        </el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="form.gender">
            <el-radio value="male">男</el-radio>
            <el-radio value="female">女</el-radio>
            <el-radio value="other">其他</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="出生日期">
          <el-date-picker v-model="form.birthday" type="date" value-format="YYYY-MM-DD"
            placeholder="选择日期" style="width:100%" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="身高(cm)">
              <el-input-number v-model="form.height" :min="50" :max="250" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="体重(kg)">
              <el-input-number v-model="form.weight" :min="20" :max="300" :precision="1" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="健身目标">
          <el-select v-model="form.fitness_goal" style="width:100%">
            <el-option label="🏋️ 增肌" value="build_muscle" />
            <el-option label="🔥 减脂" value="lose_weight" />
            <el-option label="⚖️ 保持" value="maintain" />
            <el-option label="🏃 提升体能" value="endurance" />
            <el-option label="🧘 健康生活" value="healthy" />
          </el-select>
        </el-form-item>

        <el-divider />
        <div v-if="bmr > 0" class="bmr-section">
          <h3>基础代谢估算</h3>
          <div class="bmr-value">{{ bmr }} <span style="font-size:14px">kcal/天</span></div>
          <div class="bmr-note">基于 Mifflin-St Jeor 公式估算，供参考</div>
        </div>

        <el-form-item style="margin-top:20px;">
          <el-button type="primary" @click="handleSave" :loading="saving">保存档案</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../api/index'
import { ElMessage } from 'element-plus'

const form = ref({
  name: '', gender: 'male', birthday: '', height: null, weight: null, fitness_goal: 'maintain'
})
const loading = ref(false)
const saving = ref(false)

const bmr = computed(() => {
  if (!form.value.height || !form.value.weight) return 0
  const age = form.value.birthday
    ? Math.floor((new Date() - new Date(form.value.birthday)) / (365.25 * 24 * 3600 * 1000))
    : 25
  if (form.value.gender === 'female') {
    return Math.round(10 * form.value.weight + 6.25 * form.value.height - 5 * age - 161)
  }
  return Math.round(10 * form.value.weight + 6.25 * form.value.height - 5 * age + 5)
})

async function fetchProfile() {
  loading.value = true
  try {
    const res = await api.get('/profile')
    if (res.code === 0) form.value = res.data
  } catch (e) { /* 使用默认值 */ }
  loading.value = false
}

async function handleSave() {
  saving.value = true
  try {
    const res = await api.put('/profile', form.value)
    if (res.code === 0) {
      ElMessage.success('档案保存成功')
      form.value = res.data
    }
  } catch (e) { ElMessage.error('保存失败') }
  saving.value = false
}

onMounted(fetchProfile)
</script>

<style scoped>
.profile-page { max-width: 700px; }
.bmr-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 24px;
  border-radius: 8px;
  text-align: center;
  margin: 16px 0;
}
.bmr-section h3 { font-size: 14px; opacity: 0.9; margin-bottom: 8px; }
.bmr-value { font-size: 36px; font-weight: 700; }
.bmr-note { font-size: 12px; opacity: 0.7; margin-top: 8px; }
</style>
