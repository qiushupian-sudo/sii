import express from 'express'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'data')
const DATA_FILE = join(DATA_DIR, 'records.json')
const CAT_FILE = join(DATA_DIR, 'categories.json')

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true })
}

const app = express()
app.use(express.json({ limit: '10mb' }))
app.use(express.static(join(__dirname, '..', 'dist')))

function readJSON(file, fallback) {
  try {
    if (!existsSync(file)) {
      writeFileSync(file, JSON.stringify(fallback, null, 2))
    }
    return JSON.parse(readFileSync(file, 'utf-8'))
  } catch {
    return fallback
  }
}

function writeJSON(file, data) {
  writeFileSync(file, JSON.stringify(data, null, 2))
}

const defaultCategories = {
  expense: ['餐饮', '交通', '购物', '娱乐', '住房', '医疗', '教育', '通讯', '服饰', '其他'],
  income: ['工资', '兼职', '投资', '理财', '红包', '退款', '其他']
}

function normalizeCategories(data) {
  return {
    expense: Array.isArray(data?.expense) && data.expense.length ? data.expense : defaultCategories.expense.slice(),
    income: Array.isArray(data?.income) && data.income.length ? data.income : defaultCategories.income.slice()
  }
}

function readCategories() {
  const data = normalizeCategories(readJSON(CAT_FILE, defaultCategories))
  writeJSON(CAT_FILE, data)
  return data
}

// --- Records ---
app.get('/api/records', (req, res) => {
  res.json(readJSON(DATA_FILE, []))
})

app.post('/api/records', (req, res) => {
  try {
    const { type, amount, category, date, note } = req.body
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: '金额必须大于0' })
    }
    if (!category) {
      return res.status(400).json({ error: '请选择分类' })
    }
    const records = readJSON(DATA_FILE, [])
    const record = {
      id: Date.now(),
      type: type || 'expense',
      amount: parseFloat(amount),
      category,
      date: date || new Date().toISOString().slice(0, 10),
      note: note || '',
      createdAt: new Date().toISOString()
    }
    records.push(record)
    writeJSON(DATA_FILE, records)
    res.json(record)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.put('/api/records/:id', (req, res) => {
  try {
    const records = readJSON(DATA_FILE, [])
    const id = parseFloat(req.params.id)
    const idx = records.findIndex(r => r.id === id)
    if (idx === -1) {
      return res.status(404).json({ error: '记录不存在' })
    }
    const body = req.body
    if (body.amount !== undefined && parseFloat(body.amount) <= 0) {
      return res.status(400).json({ error: '金额必须大于0' })
    }
    records[idx] = {
      id: records[idx].id,
      type: body.type || records[idx].type,
      amount: body.amount !== undefined ? parseFloat(body.amount) : records[idx].amount,
      category: body.category || records[idx].category,
      date: body.date || records[idx].date,
      note: body.note !== undefined ? body.note : records[idx].note,
      createdAt: records[idx].createdAt
    }
    writeJSON(DATA_FILE, records)
    res.json(records[idx])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/records/:id', (req, res) => {
  try {
    const id = parseFloat(req.params.id)
    let records = readJSON(DATA_FILE, [])
    records = records.filter(r => r.id !== id)
    writeJSON(DATA_FILE, records)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- Categories ---
app.get('/api/categories', (req, res) => {
  res.json(readCategories())
})

app.put('/api/categories', (req, res) => {
  const data = normalizeCategories(req.body)
  if (!Array.isArray(req.body?.expense) || !Array.isArray(req.body?.income)) {
    return res.status(400).json({ error: '数据格式错误' })
  }
  writeJSON(CAT_FILE, data)
  res.json(data)
})

app.post('/api/categories/reset', (req, res) => {
  writeJSON(CAT_FILE, defaultCategories)
  res.json(defaultCategories)
})

// --- Stats ---
app.get('/api/stats', (req, res) => {
  const records = readJSON(DATA_FILE, [])
  const income = records.filter(r => r.type === 'income').reduce((s, r) => s + (r.amount || 0), 0)
  const expense = records.filter(r => r.type === 'expense').reduce((s, r) => s + (r.amount || 0), 0)
  const expenseByCategory = {}
  const incomeByCategory = {}
  records.forEach(r => {
    if (r.type === 'expense') {
      expenseByCategory[r.category] = (expenseByCategory[r.category] || 0) + (r.amount || 0)
    } else {
      incomeByCategory[r.category] = (incomeByCategory[r.category] || 0) + (r.amount || 0)
    }
  })
  const daily = {}
  records.forEach(r => {
    if (!daily[r.date]) daily[r.date] = { income: 0, expense: 0 }
    daily[r.date][r.type] += (r.amount || 0)
  })
  res.json({ income, expense, balance: income - expense, expenseByCategory, incomeByCategory, daily })
})

// --- Export ---
app.get('/api/export/json', (req, res) => {
  const records = readJSON(DATA_FILE, [])
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', 'attachment; filename="records.json"')
  res.send(JSON.stringify(records, null, 2))
})

app.get('/api/export/csv', (req, res) => {
  const records = readJSON(DATA_FILE, [])
  const header = 'id,type,amount,category,date,note'
  const rows = records.map(r =>
    [r.id, r.type, r.amount, r.category, r.date, '"' + (r.note || '').replace(/"/g, '""') + '"'].join(',')
  )
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="records.csv"')
  res.send('\uFEFF' + [header, ...rows].join('\n'))
})

// --- Import ---
app.post('/api/import', (req, res) => {
  try {
    const data = req.body
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: '需要数组格式' })
    }
    const records = readJSON(DATA_FILE, [])
    let count = 0
    data.forEach(r => {
      if (r && r.amount) {
        records.push({
          id: Date.now() + count,
          type: r.type || 'expense',
          amount: parseFloat(r.amount) || 0,
          category: r.category || '其他',
          date: r.date || new Date().toISOString().slice(0, 10),
          note: r.note || '',
          createdAt: new Date().toISOString()
        })
        count++
      }
    })
    writeJSON(DATA_FILE, records)
    res.json({ ok: true, count })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '..', 'dist', 'index.html'))
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log('Server running at http://localhost:' + PORT)
})
