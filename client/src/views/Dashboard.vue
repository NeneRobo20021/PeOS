<template>
  <div class="page-container dashboard-page">
    <div class="page-header">
      <h2>今日热量仪表盘</h2>
      <el-date-picker v-model="selectedDate" type="date" placeholder="选择日期" size="small"
        format="YYYY/MM/DD" value-format="YYYY-MM-DD" @change="fetchSummary" />
    </div>

    <!-- 热量概览卡片 -->
    <div class="dashboard-grid">
      <div class="stat-card">
        <h3>热量摄入</h3>
        <div class="stat-value">{{ summary.calorie_intake || 0 }} <span style="font-size:14px">kcal</span></div>
        <div class="stat-sub">
          蛋白质 {{ summary.protein_intake || 0 }}g ·
          脂肪 {{ summary.fat_intake || 0 }}g ·
          碳水 {{ summary.carb_intake || 0 }}g
        </div>
      </div>
      <div class="stat-card">
        <h3>热量消耗</h3>
        <div class="stat-value">{{ summary.total_burn || 0 }} <span style="font-size:14px">kcal</span></div>
        <div class="stat-sub">
          基础代谢 {{ summary.bmr || 0 }} · 运动 {{ summary.exercise_burn || 0 }} kcal
        </div>
      </div>
      <div class="stat-card">
        <h3>热量差额</h3>
        <div class="stat-value" :class="calorieClass">
          {{ netCalories > 0 ? '+' : '' }}{{ netCalories || 0 }} <span style="font-size:14px">kcal</span>
        </div>
        <div class="stat-sub">{{ calorieLabel }}</div>
      </div>
    </div>

    <!-- 图表行 -->
    <el-row :gutter="16" style="margin-top: 16px;">
      <el-col :xs="24" :lg="12">
        <div class="chart-card">
          <h3>近7日热量趋势</h3>
          <v-chart :option="trendOption" autoresize style="height:300px" />
        </div>
      </el-col>
      <el-col :xs="24" :lg="12">
        <div class="chart-card">
          <h3>今日营养素占比</h3>
          <v-chart :option="macroOption" autoresize style="height:300px" />
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart, BarChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'

use([CanvasRenderer, LineChart, PieChart, BarChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])

import api from '../api/index'

const selectedDate = ref(new Date().toISOString().slice(0, 10))
const summary = ref({})
const trendData = ref([])

const netCalories = computed(() => summary.value.net_calories || 0)

const calorieClass = computed(() => {
  if (netCalories.value > 100) return 'calorie-surplus'
  if (netCalories.value < -100) return 'calorie-deficit'
  return 'calorie-balance'
})

const calorieLabel = computed(() => {
  if (netCalories.value > 0) return '热量盈余，注意控制饮食'
  if (netCalories.value < 0) return '热量赤字，正在消耗储备'
  return '热量基本平衡'
})

const trendOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['摄入', '消耗'], bottom: 0 },
  grid: { left: 40, right: 20, top: 20, bottom: 35 },
  xAxis: {
    type: 'category',
    data: trendData.value.map(d => d.summary_date?.slice(5)),
    axisLabel: { fontSize: 11 }
  },
  yAxis: { type: 'value', name: 'kcal' },
  series: [
    {
      name: '摄入', type: 'line', smooth: true,
      data: trendData.value.map(d => Math.round(d.calorie_intake)),
      lineStyle: { color: '#f56c6c' }, itemStyle: { color: '#f56c6c' }
    },
    {
      name: '消耗', type: 'line', smooth: true,
      data: trendData.value.map(d => Math.round(d.total_burn)),
      lineStyle: { color: '#409eff' }, itemStyle: { color: '#409eff' }
    }
  ]
}))

const macroOption = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c}g ({d}%)' },
  series: [{
    type: 'pie', radius: ['45%', '70%'],
    label: { formatter: '{b}\n{d}%' },
    data: [
      { value: summary.value.protein_intake || 0, name: '蛋白质', itemStyle: { color: '#5470c6' } },
      { value: summary.value.fat_intake || 0, name: '脂肪', itemStyle: { color: '#fac858' } },
      { value: summary.value.carb_intake || 0, name: '碳水', itemStyle: { color: '#ee6666' } }
    ].filter(d => d.value > 0)
  }]
}))

async function fetchSummary() {
  try {
    const res = await api.get('/summary/daily', { params: { date: selectedDate.value } })
    if (res.code === 0) summary.value = res.data
  } catch (e) {
    console.error('获取汇总失败', e)
  }
}

async function fetchTrend() {
  try {
    const res = await api.get('/summary/trend', { params: { days: 7 } })
    if (res.code === 0) trendData.value = res.data
  } catch (e) {
    console.error('获取趋势失败', e)
  }
}

onMounted(() => {
  fetchSummary()
  fetchTrend()
})
</script>

<style scoped>
.dashboard-page { background: transparent; padding: 0; min-height: auto; }
.chart-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  margin-bottom: 16px;
}
.chart-card h3 {
  font-size: 14px;
  color: #909399;
  font-weight: 400;
  margin-bottom: 12px;
}
</style>
