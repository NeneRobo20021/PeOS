import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import './styles/main.css'

const app = createApp(App)

// 注册所有 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(ElementPlus, { locale: zhCn() })
app.use(router)
app.mount('#app')

// 简易 Element Plus 中文本地化
function zhCn() {
  return {
    el: {
      pagination: { goto: '前往', pagesize: '条/页', total: '共 {total} 条', pageClassifier: '页' },
      table: { emptyText: '暂无数据', confirmFilter: '筛选', resetFilter: '重置', clearFilter: '全部', sumText: '合计' },
      datepicker: { rangeSeparator: ' 至 ', startDate: '开始日期', endDate: '结束日期', startTime: '开始时间', endTime: '结束时间' },
      messagebox: { title: '提示', confirm: '确定', cancel: '取消', error: '输入数据不合法' },
      upload: { deleteTip: '按删除键移除', delete: '删除', preview: '查看图片', continue: '继续上传' },
      empty: { description: '暂无数据' }
    }
  }
}
