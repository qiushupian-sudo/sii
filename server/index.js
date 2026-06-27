import express from 'express'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'data')
const DATA_FILE = join(DATA_DIR, 'records.json')
const CAT_FILE = join(DATA_DIR, 'categories.json')

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

const app = express()
app.use(express.json())
app.use(express.static(join(__dirname, '..', 'dist')))

function readJSON(file, fallback) {
  try {
    if (!existsSync(file)) writeFileSync(file, JSON.stringify(fallback, null, 2))
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

// Records API
app.get('/api/records', (req, res) => {
  try {
    res.json(readJSON(DATA_FILE, []))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/records', (req, res) => {
  try {
    const { type, amount, category, date, note } = req.body
    if (!amount || amount <= 0) return res.status(400).json({ error: '金额必须大于0' })
    if (!category) return res.status(400).json({ error: '请选择分类' })

    const records = readJSON(DATA_FILE, [])
    const record = {
      id: Date.now() + Math.random(),
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
    const idx = records.findIndex(r => r.id === parseFloat(req.params.id))
    if (idx === -1) return res.status(404).json({ error: '记录不存在' })

    const { type, amount, category, date, note } = req.body
    if (amount !== undefined && amount <= 0) return res.status(400).json({ error: '金额必须大于0' })

    records[idx] = {
      ...records[idx],
      type: type || records[idx].type,
      amount: amount !== undefined ? parseFloat(amount) : records[idx].amount,
      category: category || records[idx].category,
      date: date || records[idx].date,
      note: note !== undefined ? note : records[idx].note
    }
    writeJSON(DATA_FILE, records)
    res.json(records[idx])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/records/:id', (req, res) => {
  try {
    let records = readJSON(DATA_FILE, [])
    records = records.filter(r => r.id !== parseFloat(req.params.id))
    writeJSON(DATA_FILE, records)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Categories API
app.get('/api/categories', (req, res) => {
  try {
    res.json(readJSON(CAT_FILE, defaultCategories))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.put('/api/categories', (req, res) => {
  try {
    const data = req.body
    if (!data.expense || !data.income) return res.status(400).json({ error: '数据格式错误' })
    writeJSON(CAT_FILE, data)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.put('/api/categories/reset', (req, res) => {
  writeJSON(CAT_FILE, defaultCategories)
  res.json(defaultCategories)
})

// Stats API
app.get('/api/stats', (req, res) => {
  try {
    const records = readJSON(DATA_FILE, [])
    const income = records.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0)
    const expense = records.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0)

    const expenseByCategory = {}
    const incomeByCategory = {}
    records.forEach(r => {
      if (r.type === 'expense') expenseByCategory[r.category] = (expenseByCategory[r.category] || 0) + r.amount
      else incomeByCategory[r.category] = (incomeByCategory[r.category] || 0) + r.amount
    })

    const daily = {}
    records.forEach(r => {
      if (!daily[r.date]) daily[r.date] = { income: 0, expense: 0 }
      daily[r.date][r.type] += r.amount
    })

    res.json({ income, expense, balance: income - expense, expenseByCategory, incomeByCategory, daily })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Export API
app.get('/api/export/json', (req, res) => {
  try {
    const records = readJSON(DATA_FILE, [])
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', 'attachment; filename=records.json')
    res.json(records)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/export/csv', (req, res) => {
  try {
    const records = readJSON(DATA_FILE, [])
    const header = 'id,type,amount,category,date,note,createdAt'
    const rows = records.map(r =>
      `${r.id},${r.type},${r.amount},${r.category},${r.date},"${(r.note || '').replace(/"/g, '""')}",${r.createdAt}`
    )
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=records.csv')
    res.send('\uFEFF' + [header, ...rows].join('\n'))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/import', (req, res) => {
  try {
    const data = req.body
    if (!Array.isArray(data)) return res.status(400).json({ error: '数据格式错误，需要数组' })
    const records = readJSON(DATA_FILE, [])
    data.forEach(r => {
      records.push({
        id: Date.now() + Math.random(),
        type: r.type || 'expense',
        amount: parseFloat(r.amount) || 0,
        category: r.category || '其他',
        date: r.date || new Date().toISOString().slice(0, 10),
        note: r.note || '',
        createdAt: r.createdAt || new Date().toISOString()
      })
    })
    writeJSON(DATA_FILE, records)
    res.json({ ok: true, count: data.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '..', 'dist', 'index.html'))
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})
