<template>
  <div>
    <div class="header-row">
      <h2>分类管理</h2>
      <button class="btn btn-sm btn-outline" @click="restoreDefaults">恢复默认</button>
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <template v-else>
      <div class="category-group">
        <div class="group-header">
          <h3>支出分类</h3>
          <span class="count">{{ expenseArr.length }} 项</span>
        </div>
        <div class="tag-list">
          <span v-for="(c, i) in expenseArr" :key="i" class="tag tag-expense">
            {{ c }}
            <button class="tag-remove" @click="removeCat('expense', i)">&times;</button>
          </span>
          <span v-if="expenseArr.length === 0" class="empty-hint">暂无分类</span>
        </div>
        <div class="add-row">
          <input v-model="newExpense" placeholder="新增支出分类" maxlength="10" @keyup.enter="addCat('expense')" />
          <button class="btn btn-primary btn-sm" @click="addCat('expense')">添加</button>
        </div>
      </div>

      <div class="category-group">
        <div class="group-header">
          <h3>收入分类</h3>
          <span class="count">{{ incomeArr.length }} 项</span>
        </div>
        <div class="tag-list">
          <span v-for="(c, i) in incomeArr" :key="i" class="tag tag-income">
            {{ c }}
            <button class="tag-remove" @click="removeCat('income', i)">&times;</button>
          </span>
          <span v-if="incomeArr.length === 0" class="empty-hint">暂无分类</span>
        </div>
        <div class="add-row">
          <input v-model="newIncome" placeholder="新增收入分类" maxlength="10" @keyup.enter="addCat('income')" />
          <button class="btn btn-primary btn-sm" @click="addCat('income')">添加</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onActivated, onMounted } from 'vue'
import { getCategories, updateCategories, resetCategories } from '../api'

const expenseArr = ref([])
const incomeArr = ref([])
const newExpense = ref('')
const newIncome = ref('')
const loading = ref(true)

function applyCategories(data) {
  expenseArr.value = Array.isArray(data?.expense) ? data.expense.slice() : []
  incomeArr.value = Array.isArray(data?.income) ? data.income.slice() : []
}

async function loadData() {
  loading.value = true
  try {
    const res = await getCategories()
    applyCategories(res.data)
  } catch (e) {
    console.error('load categories error:', e)
  }
  loading.value = false
}

async function saveAndReload() {
  try {
    const payload = {
      expense: expenseArr.value.slice(),
      income: incomeArr.value.slice()
    }
    const res = await updateCategories(payload)
    applyCategories(res.data)
  } catch (e) {
    console.error('save categories error:', e)
    await loadData()
  }
}

function addCat(type) {
  const input = type === 'expense' ? newExpense : newIncome
  const val = input.value.trim()
  if (!val) return
  const list = type === 'expense' ? expenseArr : incomeArr
  if (list.value.includes(val)) {
    alert('分类已存在')
    return
  }
  list.value.push(val)
  input.value = ''
  saveAndReload()
}

function removeCat(type, index) {
  const list = type === 'expense' ? expenseArr : incomeArr
  if (list.value.length <= 1) {
    alert('至少保留一个分类')
    return
  }
  if (!confirm('确定删除「' + list.value[index] + '」？')) return
  list.value.splice(index, 1)
  saveAndReload()
}

async function restoreDefaults() {
  if (!confirm('确定恢复默认分类？')) return
  try {
    const res = await resetCategories()
    applyCategories(res.data)
  } catch (e) {
    console.error('reset categories error:', e)
  }
}

onMounted(loadData)
onActivated(loadData)
</script>

<style scoped>
.header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.header-row h2 { font-size: 17px; font-weight: 700; }
.group-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.group-header h3 { font-size: 14px; color: #666; }
.count { font-size: 11px; color: #bbb; }
.category-group { margin-bottom: 24px; }
.tag-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.tag { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 16px; font-size: 13px; }
.tag-expense { background: #fef2f2; color: #ef4444; }
.tag-income { background: #ecfdf5; color: #10b981; }
.tag-remove { background: none; border: none; cursor: pointer; font-size: 15px; line-height: 1; opacity: .4; padding: 0 2px; color: inherit; }
.tag-remove:hover { opacity: 1; }
.empty-hint { color: #ccc; font-size: 13px; }
.add-row { display: flex; gap: 8px; }
.add-row input { flex: 1; max-width: 200px; }
</style>
