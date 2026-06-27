<template>
  <div>
    <div class="header-row">
      <h2>分类管理</h2>
      <button class="btn btn-sm btn-outline" @click="resetToDefault">
        恢复默认
      </button>
    </div>

    <div v-if="loading" class="loading">加载中…</div>

    <template v-else>
      <div class="category-group">
        <div class="group-header">
          <h3>支出分类</h3>
          <span class="count">{{ cats.expense.length }} 项</span>
        </div>
        <div class="tag-list">
          <span v-for="(c, i) in cats.expense" :key="i" class="tag tag-expense">
            <span>{{ c }}</span>
            <button class="tag-remove" @click="remove('expense', i)">&times;</button>
          </span>
        </div>
        <div class="add-row">
          <input v-model="newExpense" placeholder="新增支出分类" maxlength="10" @keyup.enter="add('expense')" />
          <button class="btn btn-primary btn-sm" @click="add('expense')" :disabled="!newExpense.trim()">添加</button>
        </div>
      </div>

      <div class="category-group">
        <div class="group-header">
          <h3>收入分类</h3>
          <span class="count">{{ cats.income.length }} 项</span>
        </div>
        <div class="tag-list">
          <span v-for="(c, i) in cats.income" :key="i" class="tag tag-income">
            <span>{{ c }}</span>
            <button class="tag-remove" @click="remove('income', i)">&times;</button>
          </span>
        </div>
        <div class="add-row">
          <input v-model="newIncome" placeholder="新增收入分类" maxlength="10" @keyup.enter="add('income')" />
          <button class="btn btn-primary btn-sm" @click="add('income')" :disabled="!newIncome.trim()">添加</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getCategories, updateCategories, resetCategories } from '../api'

const cats = reactive({ expense: [], income: [] })
const newExpense = ref('')
const newIncome = ref('')
const loading = ref(true)

async function fetch() {
  loading.value = true
  try {
    const res = await getCategories()
    cats.expense = res.data.expense
    cats.income = res.data.income
  } catch (e) {
    alert('加载分类失败：' + (e.response?.data?.error || e.message))
  }
  loading.value = false
}

async function save() {
  try {
    await updateCategories({ expense: cats.expense, income: cats.income })
  } catch (e) {
    alert('保存失败：' + (e.response?.data?.error || e.message))
  }
}

function add(type) {
  const val = (type === 'expense' ? newExpense : newIncome).value.trim()
  if (!val) return
  const list = type === 'expense' ? cats.expense : cats.income
  if (list.includes(val)) {
    alert('分类已存在')
    return
  }
  list.push(val)
  if (type === 'expense') newExpense.value = ''
  else newIncome.value = ''
  save()
}

function remove(type, index) {
  const list = type === 'expense' ? cats.expense : cats.income
  if (list.length <= 1) {
    alert('至少保留一个分类')
    return
  }
  if (!confirm('确定删除「' + list[index] + '」？')) return
  list.splice(index, 1)
  save()
}

async function resetToDefault() {
  if (!confirm('确定恢复默认分类？自定义分类将被覆盖')) return
  try {
    const res = await resetCategories()
    cats.expense = res.data.expense
    cats.income = res.data.income
    alert('已恢复默认分类')
  } catch (e) {
    alert('恢复失败：' + (e.response?.data?.error || e.message))
  }
}

onMounted(fetch)
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
.add-row { display: flex; gap: 8px; }
.add-row input { flex: 1; max-width: 200px; }
</style>
