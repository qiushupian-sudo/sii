<template>
  <div>
    <div class="header-row">
      <h2>统计报表</h2>
      <div class="period-filter">
        <button v-for="p in periods" :key="p.value" class="btn" :class="p.value === period ? 'btn-primary' : 'btn-outline'" @click="period = p.value">{{ p.label }}</button>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中…</div>

    <template v-else-if="stats">
      <div class="stats-cards">
        <div class="card">
          <span class="label">总收入</span>
          <strong class="income-text">¥{{ stats.income.toFixed(2) }}</strong>
        </div>
        <div class="card">
          <span class="label">总支出</span>
          <strong class="expense-text">¥{{ stats.expense.toFixed(2) }}</strong>
        </div>
        <div class="card">
          <span class="label">结余</span>
          <strong :class="stats.balance >= 0 ? 'income-text' : 'expense-text'">¥{{ stats.balance.toFixed(2) }}</strong>
        </div>
      </div>

      <div class="charts" v-if="hasExpenseData || hasIncomeData">
        <div class="chart-box" v-if="hasExpenseData">
          <h3>支出分类占比</h3>
          <Pie :data="expenseChartData" :options="chartOptions" />
        </div>
        <div class="chart-box" v-if="hasIncomeData">
          <h3>收入分类占比</h3>
          <Pie :data="incomeChartData" :options="chartOptions" />
        </div>
        <div class="chart-box full" v-if="hasTrendData">
          <h3>每日趋势</h3>
          <Bar :data="trendChartData" :options="trendOptions" />
        </div>
      </div>
      <p v-else class="empty">该时段暂无数据</p>
    </template>

    <p v-else class="empty">暂无数据</p>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Pie, Bar } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js'
import { getRecords } from '../api'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

const period = ref('month')
const loading = ref(true)
const periods = [
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'year', label: '今年' },
]

const stats = ref(null)

const chartOptions = {
  responsive: true,
  plugins: { legend: { position: 'bottom', labels: { padding: 12, font: { size: 12 } } } }
}

const trendOptions = {
  responsive: true,
  plugins: { legend: { position: 'top', labels: { font: { size: 12 } } } },
  scales: {
    y: { beginAtZero: true, grid: { color: '#f0f0f0' } },
    x: { grid: { display: false } }
  }
}

const hasExpenseData = computed(() => stats.value && Object.keys(stats.value.expenseByCategory).length > 0)
const hasIncomeData = computed(() => stats.value && Object.keys(stats.value.incomeByCategory).length > 0)
const hasTrendData = computed(() => stats.value && Object.keys(stats.value.daily).length > 0)

const expenseChartData = computed(() => {
  if (!hasExpenseData.value) return { labels: [], datasets: [] }
  const cats = stats.value.expenseByCategory
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#84cc16', '#f43f5e']
  return {
    labels: Object.keys(cats),
    datasets: [{
      data: Object.values(cats),
      backgroundColor: Object.keys(cats).map((_, i) => colors[i % colors.length]),
      borderWidth: 0
    }]
  }
})

const incomeChartData = computed(() => {
  if (!hasIncomeData.value) return { labels: [], datasets: [] }
  const cats = stats.value.incomeByCategory
  const colors = ['#22c55e', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#3b82f6', '#8b5cf6', '#f59e0b']
  return {
    labels: Object.keys(cats),
    datasets: [{
      data: Object.values(cats),
      backgroundColor: Object.keys(cats).map((_, i) => colors[i % colors.length]),
      borderWidth: 0
    }]
  }
})

const trendChartData = computed(() => {
  if (!hasTrendData.value) return { labels: [], datasets: [] }
  const days = stats.value.daily
  const labels = Object.keys(days).sort()
  return {
    labels,
    datasets: [
      { label: '支出', data: labels.map(d => days[d]?.expense || 0), backgroundColor: '#ef4444', borderRadius: 4 },
      { label: '收入', data: labels.map(d => days[d]?.income || 0), backgroundColor: '#22c55e', borderRadius: 4 }
    ]
  }
})

async function fetchStats() {
  loading.value = true
  try {
    const res = await getRecords()
    const allRecords = res.data
    const now = new Date()
    let filtered = [...allRecords]

    if (period.value === 'week') {
      const start = new Date(now)
      start.setDate(now.getDate() - now.getDay())
      start.setHours(0, 0, 0, 0)
      filtered = filtered.filter(r => new Date(r.date) >= start)
    } else if (period.value === 'month') {
      const m = String(now.getMonth() + 1).padStart(2, '0')
      filtered = filtered.filter(r => r.date.startsWith(`${now.getFullYear()}-${m}`))
    } else if (period.value === 'year') {
      filtered = filtered.filter(r => r.date.startsWith(`${now.getFullYear()}`))
    }

    const income = filtered.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0)
    const expense = filtered.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0)

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
      balance: income - expense,
      expenseByCategory: groupByCategory(filtered.filter(r => r.type === 'expense')),
      incomeByCategory: groupByCategory(filtered.filter(r => r.type === 'income')),
      daily
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

watch(period, fetchStats)
onMounted(fetchStats)
</script>

<style scoped>
.header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px; }
.header-row h2 { font-size: 17px; font-weight: 700; }
.period-filter { display: flex; gap: 6px; }
.stats-cards { display: flex; gap: 10px; margin-bottom: 20px; }
.card { flex: 1; padding: 14px; border-radius: 10px; background: #f8f8f8; text-align: center; }
.label { display: block; font-size: 11px; color: #888; margin-bottom: 4px; text-transform: uppercase; letter-spacing: .5px; }
.card strong { font-size: 18px; }
.income-text { color: #10b981; }
.expense-text { color: #ef4444; }
.charts { display: flex; flex-wrap: wrap; gap: 14px; }
.chart-box { flex: 1; min-width: 240px; padding: 14px; background: #fafafa; border-radius: 10px; }
.chart-box.full { flex-basis: 100%; }
.chart-box h3 { font-size: 13px; margin-bottom: 10px; color: #888; font-weight: 600; }
</style>
