<template>
  <div>
    <h2>统计报表</h2>

    <div class="period-filter">
      <button v-for="p in periods" :key="p.value" class="btn" :class="p.value === period ? 'btn-primary' : ''" @click="period = p.value">{{ p.label }}</button>
    </div>

    <div class="stats-cards" v-if="stats">
      <div class="card">
        <span class="label">总收入</span>
        <strong class="income">¥{{ stats.income.toFixed(2) }}</strong>
      </div>
      <div class="card">
        <span class="label">总支出</span>
        <strong class="expense">¥{{ stats.expense.toFixed(2) }}</strong>
      </div>
      <div class="card">
        <span class="label">结余</span>
        <strong :class="stats.balance >= 0 ? 'income' : 'expense'">¥{{ stats.balance.toFixed(2) }}</strong>
      </div>
    </div>

    <div class="charts" v-if="stats">
      <div class="chart-box">
        <h3>支出分类占比</h3>
        <Pie :data="expenseChartData" :options="chartOptions" />
      </div>
      <div class="chart-box">
        <h3>收入分类占比</h3>
        <Pie :data="incomeChartData" :options="chartOptions" />
      </div>
      <div class="chart-box full">
        <h3>收支趋势</h3>
        <Bar :data="trendChartData" :options="trendOptions" />
      </div>
    </div>
    <p v-else class="empty">暂无数据</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Pie, Bar } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js'
import { getStats, getRecords } from '../api'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

const period = ref('month')
const periods = [
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'year', label: '今年' },
]

const stats = ref(null)
const records = ref([])

const chartOptions = { responsive: true, plugins: { legend: { position: 'bottom' } } }
const trendOptions = { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }

const expenseChartData = computed(() => {
  if (!stats.value) return { labels: [], datasets: [] }
  const cats = stats.value.expenseByCategory || {}
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']
  return {
    labels: Object.keys(cats),
    datasets: [{
      data: Object.values(cats),
      backgroundColor: Object.keys(cats).map((_, i) => colors[i % colors.length])
    }]
  }
})

const incomeChartData = computed(() => {
  if (!stats.value) return { labels: [], datasets: [] }
  const cats = stats.value.incomeByCategory || {}
  const colors = ['#22c55e', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#3b82f6', '#8b5cf6']
  return {
    labels: Object.keys(cats),
    datasets: [{
      data: Object.values(cats),
      backgroundColor: Object.keys(cats).map((_, i) => colors[i % colors.length])
    }]
  }
})

const trendChartData = computed(() => {
  if (!stats.value) return { labels: [], datasets: [] }
  const days = stats.value.daily || {}
  const labels = Object.keys(days).sort()
  return {
    labels,
    datasets: [
      { label: '支出', data: labels.map(d => days[d]?.expense || 0), backgroundColor: '#ef4444' },
      { label: '收入', data: labels.map(d => days[d]?.income || 0), backgroundColor: '#22c55e' }
    ]
  }
})

async function fetchStats() {
  const [s, r] = await Promise.all([getStats(), getRecords()])
  records.value = r.data

  const now = new Date()
  let filtered = [...r.data]

  if (period.value === 'week') {
    const start = new Date(now)
    start.setDate(now.getDate() - now.getDay())
    filtered = filtered.filter(r => new Date(r.date) >= start)
  } else if (period.value === 'month') {
    const m = String(now.getMonth() + 1).padStart(2, '0')
    filtered = filtered.filter(r => r.date.startsWith(`${now.getFullYear()}-${m}`))
  } else if (period.value === 'year') {
    filtered = filtered.filter(r => r.date.startsWith(`${now.getFullYear()}`))
  }

  const income = filtered.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0)
  const expense = filtered.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0)
  const balance = income - expense

  function groupByCategory(arr) {
    const map = {}
    arr.forEach(r => { map[r.category] = (map[r.category] || 0) + r.amount })
    return map
  }

  const daily = {}
  filtered.forEach(r => {
    if (!daily[r.date]) daily[r.date] = { income: 0, expense: 0 }
    daily[r.date][r.type] += r.amount
  })

  stats.value = {
    income,
    expense,
    balance,
    expenseByCategory: groupByCategory(filtered.filter(r => r.type === 'expense')),
    incomeByCategory: groupByCategory(filtered.filter(r => r.type === 'income')),
    daily
  }
}

watch(period, fetchStats)
onMounted(fetchStats)
</script>

<style scoped>
h2 { font-size: 18px; margin-bottom: 16px; }
.period-filter { display: flex; gap: 8px; margin-bottom: 16px; }
.stats-cards { display: flex; gap: 12px; margin-bottom: 24px; }
.card { flex: 1; padding: 16px; border-radius: 8px; background: #f8f8f8; text-align: center; }
.label { display: block; font-size: 12px; color: #666; margin-bottom: 4px; }
.card strong { font-size: 20px; }
.income { color: #10b981; }
.expense { color: #ef4444; }
.charts { display: flex; flex-wrap: wrap; gap: 16px; }
.chart-box { flex: 1; min-width: 250px; padding: 16px; background: #fafafa; border-radius: 8px; }
.chart-box.full { flex-basis: 100%; }
.chart-box h3 { font-size: 14px; margin-bottom: 12px; color: #666; }
.empty { text-align: center; color: #999; padding: 40px 0; }
</style>
