import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'Dashboard', component: () => import('../views/Dashboard.vue'), meta: { title: '仪表盘' } },
  { path: '/foods', name: 'Foods', component: () => import('../views/Foods.vue'), meta: { title: '食品仓储' } },
  { path: '/meals', name: 'Meals', component: () => import('../views/Meals.vue'), meta: { title: '一日三餐' } },
  { path: '/snacks', name: 'Snacks', component: () => import('../views/Snacks.vue'), meta: { title: '零嘴记录' } },
  { path: '/exercises', name: 'Exercises', component: () => import('../views/Exercises.vue'), meta: { title: '运动记录' } },
  { path: '/calorie-budget', name: 'CalorieBudget', component: () => import('../views/CalorieBudget.vue'), meta: { title: '热量开支' } },
  { path: '/profile', name: 'Profile', component: () => import('../views/Profile.vue'), meta: { title: '个人档案' } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
