import { createRouter, createWebHashHistory } from 'vue-router'
import Records from '../views/Records.vue'
import Stats from '../views/Stats.vue'
import Categories from '../views/Categories.vue'

const routes = [
  { path: '/', redirect: '/records' },
  { path: '/records', component: Records, meta: { title: '记账' } },
  { path: '/stats', component: Stats, meta: { title: '统计' } },
  { path: '/categories', component: Categories, meta: { title: '分类' } }
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})
