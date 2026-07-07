<template>
  <div class="page-container">
    <div class="page-header">
      <h2>运动记录</h2>
      <el-button type="primary" @click="openAdd">
        <el-icon><Plus /></el-icon> 记录运动
      </el-button>
    </div>

    <el-date-picker v-model="filterDate" type="date" placeholder="筛选日期" size="small"
      format="YYYY/MM/DD" value-format="YYYY-MM-DD" @change="fetchExercises" style="margin-bottom:16px;" />

    <div v-loading="loading">
      <el-table :data="exercises" stripe style="width:100%" v-if="exercises.length > 0">
        <el-table-column prop="exercise_date" label="日期" width="110" />
        <el-table-column prop="exercise_type" label="运动类型" width="100">
          <template #default="{ row }">
            <el-tag :type="typeTag(row.exercise_type)" size="small">{{ typeLabel(row.exercise_type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="duration" label="时长(分钟)" width="100" />
        <el-table-column prop="distance" label="里程(km)" width="100">
          <template #default="{ row }">{{ row.distance || '-' }}</template>
        </el-table-column>
        <el-table-column prop="calories_burned" label="消耗(kcal)" width="100" />
        <el-table-column prop="avg_heart_rate" label="平均心率" width="90">
          <template #default="{ row }">{{ row.avg_heart_rate || '-' }}</template>
        </el-table-column>
        <el-table-column prop="avg_pace" label="配速" width="90">
          <template #default="{ row }">{{ row.avg_pace || '-' }}</template>
        </el-table-column>
        <el-table-column prop="notes" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button type="danger" link size="small" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else description="暂无运动记录" />
    </div>

    <!-- 添加 -->
    <el-dialog v-model="showDialog" title="记录运动" width="550px" destroy-on-close>
      <el-form :model="form" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="日期" required>
              <el-date-picker v-model="form.exercise_date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="运动类型" required>
              <el-select v-model="form.exercise_type" style="width:100%">
                <el-option label="🏃 跑步" value="running" />
                <el-option label="🚴 骑行" value="cycling" />
                <el-option label="🏊 游泳" value="swimming" />
                <el-option label="🏋️ 力量训练" value="strength" />
                <el-option label="🧘 瑜伽" value="yoga" />
                <el-option label="🚶 步行" value="walking" />
                <el-option label="其他" value="other" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="时长(分钟)">
              <el-input-number v-model="form.duration" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="里程(km)">
              <el-input-number v-model="form.distance" :min="0" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="组数">
              <el-input-number v-model="form.sets_count" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="消耗(kcal)">
              <el-input-number v-model="form.calories_burned" :min="0" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="平均心率">
              <el-input-number v-model="form.avg_heart_rate" :min="0" :max="220" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="最大心率">
              <el-input-number v-model="form.max_heart_rate" :min="0" :max="220" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="配速">
          <el-input v-model="form.avg_pace" placeholder="如 5'30''" style="width:200px" />
        </el-form-item>

        <el-form-item label="备注">
          <el-input v-model="form.notes" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api/index'
import { syncManager } from '../utils/sync'
import { ElMessage, ElMessageBox } from 'element-plus'

const exercises = ref([])
const loading = ref(false)
const showDialog = ref(false)
const saving = ref(false)
const filterDate = ref('')

const typeMap = {
  running: { label: '跑步', tag: 'success' },
  cycling: { label: '骑行', tag: 'warning' },
  swimming: { label: '游泳', tag: 'primary' },
  strength: { label: '力量训练', tag: 'danger' },
  yoga: { label: '瑜伽', tag: '' },
  walking: { label: '步行', tag: 'info' },
  other: { label: '其他', tag: 'info' }
}
function typeLabel(type) { return typeMap[type]?.label || type }
function typeTag(type) { return typeMap[type]?.tag || 'info' }

const defaultForm = () => ({
  exercise_date: new Date().toISOString().slice(0, 10),
  exercise_type: 'running', duration: null, distance: null, sets_count: null,
  calories_burned: null, avg_heart_rate: null, max_heart_rate: null, avg_pace: '', notes: ''
})
const form = ref(defaultForm())

async function fetchExercises() {
  loading.value = true
  try {
    const params = {}
    if (filterDate.value) params.date = filterDate.value
    const res = await api.get('/exercises', { params })
    if (res.code === 0) exercises.value = res.data
  } catch (e) { ElMessage.error('获取失败') }
  loading.value = false
}

function openAdd() {
  form.value = defaultForm()
  showDialog.value = true
}

async function handleSave() {
  if (!form.value.exercise_date || !form.value.exercise_type) return ElMessage.warning('请填写日期和运动类型')
  saving.value = true
  try {
    await syncManager.apiCall({ method: 'POST', url: '/exercises', data: form.value, table: 'exercises' })
    ElMessage.success('保存成功')
    showDialog.value = false
    fetchExercises()
  } catch (e) {
    ElMessage.info('已缓存到本地')
    showDialog.value = false
  }
  saving.value = false
}

async function handleDelete(id) {
  try {
    await ElMessageBox.confirm('确定删除？', '确认', { type: 'warning' })
    await api.delete(`/exercises/${id}`)
    ElMessage.success('已删除')
    fetchExercises()
  } catch (e) { /* cancelled */ }
}

onMounted(fetchExercises)
</script>
