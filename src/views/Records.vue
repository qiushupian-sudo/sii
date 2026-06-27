<template>
  <div>
    <div class="header-row">
      <h2>记账记录</h2>
      <button class="btn btn-primary" @click="showForm = !showForm">
        {{ showForm ? '取消' : '+ 新增记录' }}
      </button>
    </div>

    <form v-if="showForm" class="form" @submit.prevent="handleSubmit">
      <div class="form-row">
        <select v-model="form.type">
          <option value="expense">支出</option>
          <option value="income">收入</option>
        </select>
        <input v-model.number="form.amount" type="number" placeholder="金额" min="0" step="0.01" required />
        <select v-model="form.category">
          <option value="" disabled>选择分类</option>
          <option v-for="c in categories[form.type]" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>
      <div class="form-row">
        <input v-model="form.date" type="date" required />
        <input v-model="form.note" placeholder="备注（可选）" />
        <button type="submit" class="btn btn-primary">{{ editingId ? '更新' : '添加' }}</button>
      </div>
    </form>

    <div class="summary">
      <div class="summary-card income">
        <span>收入</span>
        <strong>¥{{ incomeTotal.toFixed(2) }}</strong>
      </div>
      <div class="summary-card expense">
        <span>支出</span>
        <strong>¥{{ expenseTotal.toFixed(2) }}</strong>
      </div>
      <div class="summary-card balance">
        <span>结余</span>
        <strong>¥{{ balance.toFixed(2) }}</strong>
      </div>
    </div>

    <div class="filters">
      <select v-model="filter.type">
        <option value="">全部类型</option>
        <option value="expense">支出</option>
        <option value="income">收入</option>
      </select>
      <select v-model="filter.category">
        <option value="">全部分类</option>
        <option v-for="c in allCategories" :key="c" :value="c">{{ c }}</option>
      </select>
      <input v-model="filter.month" type="month" />
    </div>

    <table class="table" v-if="filteredRecords.length">
      <thead>
        <tr>
          <th>日期</th>
          <th>类型</th>
          <th>分类</th>
          <th>金额</th>
          <th>备注</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in filteredRecords" :key="r.id">
          <td>{{ r.date }}</td>
          <td><span :class="'badge badge-' + r.type">{{ r.type === 'expense' ? '支出' : '收入' }}</span></td>
          <td>{{ r.category }}</td>
          <td :class="r.type === 'expense' ? 'text-danger' : 'text-success'">¥{{ r.amount.toFixed(2) }}</td>
          <td>{{ r.note || '-' }}</td>
          <td>
            <button class="btn btn-sm" @click="editRecord(r)">编辑</button>
            <button class="btn btn-sm btn-danger" @click="removeRecord(r.id)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else class="empty">暂无记录</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { getRecords, createRecord, updateRecord, deleteRecord, getCategories } from '../api'

const records = ref([])
const categories = ref({ expense: [], income: [] })
const showForm = ref(false)
const editingId = ref(null)
const filter = ref({ type: '', category: '', month: '' })

const form = ref({ type: 'expense', amount: 0, category: '', date: new Date().toISOString().slice(0, 10), note: '' })

const allCategories = computed(() => [...categories.value.expense, ...categories.value.income])

const filteredRecords = computed(() => {
  return records.value.filter(r => {
    if (filter.value.type && r.type !== filter.value.type) return false
    if (filter.value.category && r.category !== filter.value.category) return false
    if (filter.value.month && r.date.slice(0, 7) !== filter.value.month) return false
    return true
  }).sort((a, b) => b.id - a.id)
})

const incomeTotal = computed(() => records.value.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0))
const expenseTotal = computed(() => records.value.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0))
const balance = computed(() => incomeTotal.value - expenseTotal.value)

async function fetchData() {
  const [recRes, catRes] = await Promise.all([getRecords(), getCategories()])
  records.value = recRes.data
  categories.value = catRes.data
}

function resetForm() {
  form.value = { type: 'expense', amount: 0, category: '', date: new Date().toISOString().slice(0, 10), note: '' }
  editingId.value = null
}

async function handleSubmit() {
  const data = { ...form.value, amount: parseFloat(form.value.amount) || 0 }
  if (editingId.value) {
    await updateRecord(editingId.value, data)
  } else {
    await createRecord(data)
  }
  resetForm()
  showForm.value = false
  fetchData()
}

function editRecord(r) {
  form.value = { type: r.type, amount: r.amount, category: r.category, date: r.date, note: r.note }
  editingId.value = r.id
  showForm.value = true
}

async function removeRecord(id) {
  if (!confirm('确定删除这条记录？')) return
  await deleteRecord(id)
  fetchData()
}

onMounted(fetchData)
</script>

<style scoped>
.header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.header-row h2 { font-size: 18px; }
.form { background: #f8f8f8; padding: 16px; border-radius: 8px; margin-bottom: 16px; }
.form-row { display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.form-row input, .form-row select { flex: 1; min-width: 120px; }
.summary { display: flex; gap: 12px; margin-bottom: 16px; }
.summary-card { flex: 1; padding: 12px 16px; border-radius: 8px; text-align: center; }
.summary-card span { display: block; font-size: 12px; color: #666; margin-bottom: 4px; }
.summary-card strong { font-size: 18px; }
.income { background: #ecfdf5; }
.expense { background: #fef2f2; }
.balance { background: #eff6ff; }
.filters { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.filters select, .filters input { flex: 1; min-width: 120px; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
.table th { background: #fafafa; font-weight: 600; color: #666; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.badge-expense { background: #fef2f2; color: #ef4444; }
.badge-income { background: #ecfdf5; color: #10b981; }
.text-danger { color: #ef4444; font-weight: 600; }
.text-success { color: #10b981; font-weight: 600; }
.empty { text-align: center; color: #999; padding: 40px 0; }
</style>
