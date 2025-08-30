const express = require('express');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

// Apply authentication to all analytics routes
router.use(authenticateToken);

// GET /analytics/summary - Get financial summary for current month
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user.id;
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Get current month's income and expenses
    const currentMonthResult = await pool.query(`
      SELECT 
        type,
        SUM(amount) as total
      FROM transactions 
      WHERE user_id = $1 
        AND EXTRACT(MONTH FROM transaction_date) = $2 
        AND EXTRACT(YEAR FROM transaction_date) = $3
      GROUP BY type
    `, [userId, currentMonth, currentYear]);

    let totalIncome = 0;
    let totalExpenses = 0;

    currentMonthResult.rows.forEach(row => {
      if (row.type === 'income') {
        totalIncome = parseFloat(row.total);
      } else if (row.type === 'expense') {
        totalExpenses = parseFloat(row.total);
      }
    });

    const savings = totalIncome - totalExpenses;

    // Get previous month's expenses for comparison
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const prevMonthResult = await pool.query(`
      SELECT SUM(amount) as total
      FROM transactions 
      WHERE user_id = $1 
        AND EXTRACT(MONTH FROM transaction_date) = $2 
        AND EXTRACT(YEAR FROM transaction_date) = $3
        AND type = 'expense'
    `, [userId, prevMonth, prevYear]);

    const prevMonthExpenses = prevMonthResult.rows[0]?.total 
      ? parseFloat(prevMonthResult.rows[0].total) 
      : 0;

    const monthlyChange = prevMonthExpenses > 0 
      ? ((totalExpenses - prevMonthExpenses) / prevMonthExpenses) * 100 
      : 0;

    res.json({
      totalIncome,
      totalExpenses,
      savings,
      monthlyChange
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics summary' });
  }
});

// GET /analytics/categories - Get spending by category
router.get('/categories', async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'month' } = req.query; // month, quarter, year

    let dateFilter = '';
    const currentDate = new Date();

    switch (period) {
      case 'month':
        dateFilter = `AND EXTRACT(MONTH FROM transaction_date) = ${currentDate.getMonth() + 1} 
                     AND EXTRACT(YEAR FROM transaction_date) = ${currentDate.getFullYear()}`;
        break;
      case 'quarter':
        const quarter = Math.floor(currentDate.getMonth() / 3) + 1;
        dateFilter = `AND EXTRACT(QUARTER FROM transaction_date) = ${quarter} 
                     AND EXTRACT(YEAR FROM transaction_date) = ${currentDate.getFullYear()}`;
        break;
      case 'year':
        dateFilter = `AND EXTRACT(YEAR FROM transaction_date) = ${currentDate.getFullYear()}`;
        break;
    }

    const result = await pool.query(`
      SELECT 
        t.category,
        SUM(t.amount) as amount,
        c.color
      FROM transactions t
      JOIN categories c ON t.category = c.name
      WHERE t.user_id = $1 AND t.type = 'expense' ${dateFilter}
      GROUP BY t.category, c.color
      ORDER BY amount DESC
    `, [userId]);

    const totalExpenses = result.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);

    const categoryData = result.rows.map(row => ({
      category: row.category,
      amount: parseFloat(row.amount),
      percentage: totalExpenses > 0 ? (parseFloat(row.amount) / totalExpenses) * 100 : 0,
      color: row.color
    }));

    res.json(categoryData);
  } catch (error) {
    console.error('Categories analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch category analytics' });
  }
});

// GET /analytics/trends - Get spending trends over time
router.get('/trends', async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    const result = await pool.query(`
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '${parseInt(days) - 1} days',
          CURRENT_DATE,
          '1 day'::interval
        )::date as date
      ),
      daily_data AS (
        SELECT 
          DATE(transaction_date) as date,
          type,
          SUM(amount) as total
        FROM transactions 
        WHERE user_id = $1 
          AND transaction_date >= CURRENT_DATE - INTERVAL '${parseInt(days) - 1} days'
        GROUP BY DATE(transaction_date), type
      )
      SELECT 
        ds.date,
        COALESCE(income.total, 0) as income,
        COALESCE(expense.total, 0) as expenses,
        COALESCE(income.total, 0) - COALESCE(expense.total, 0) as net
      FROM date_series ds
      LEFT JOIN daily_data income ON ds.date = income.date AND income.type = 'income'
      LEFT JOIN daily_data expense ON ds.date = expense.date AND expense.type = 'expense'
      ORDER BY ds.date
    `, [userId]);

    const trendData = result.rows.map(row => ({
      date: row.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
      income: parseFloat(row.income),
      expenses: parseFloat(row.expenses),
      net: parseFloat(row.net)
    }));

    res.json(trendData);
  } catch (error) {
    console.error('Trends analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch trend analytics' });
  }
});

// GET /analytics/monthly-comparison - Compare current vs previous month
router.get('/monthly-comparison', async (req, res) => {
  try {
    const userId = req.user.id;
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const result = await pool.query(`
      SELECT 
        CASE 
          WHEN EXTRACT(MONTH FROM transaction_date) = $2 AND EXTRACT(YEAR FROM transaction_date) = $3 
          THEN 'current'
          ELSE 'previous'
        END as month_type,
        category,
        type,
        SUM(amount) as total
      FROM transactions 
      WHERE user_id = $1 
        AND (
          (EXTRACT(MONTH FROM transaction_date) = $2 AND EXTRACT(YEAR FROM transaction_date) = $3) OR
          (EXTRACT(MONTH FROM transaction_date) = $4 AND EXTRACT(YEAR FROM transaction_date) = $5)
        )
      GROUP BY month_type, category, type
      ORDER BY month_type, type, total DESC
    `, [userId, currentMonth, currentYear, prevMonth, prevYear]);

    const data = {
      current: { income: [], expenses: [] },
      previous: { income: [], expenses: [] }
    };

    result.rows.forEach(row => {
      const monthData = data[row.month_type];
      if (monthData && monthData[row.type]) {
        monthData[row.type].push({
          category: row.category,
          amount: parseFloat(row.total)
        });
      }
    });

    res.json(data);
  } catch (error) {
    console.error('Monthly comparison error:', error);
    res.status(500).json({ error: 'Failed to fetch monthly comparison' });
  }
});

module.exports = router;
