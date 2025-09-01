const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Pool } = require('pg');
const { parseTransactionWithAI, CATEGORIES } = require('../services/aiService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Apply authentication to all transaction routes
router.use(authenticateToken);

// Validation middleware
const validateTransaction = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('description').trim().isLength({ min: 1 }).withMessage('Description is required'),
  body('category').isIn(CATEGORIES).withMessage('Invalid category'),
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('date').optional().isISO8601().withMessage('Date must be valid ISO 8601 format')
];

// GET /transactions - Get all transactions for user with optional filtering
router.get('/', [
  query('category').optional().isIn(CATEGORIES),
  query('type').optional().isIn(['income', 'expense']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 1000 }),
  query('offset').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { category, type, startDate, endDate, limit = 100, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        id, user_id, amount, description, category, type, 
        transaction_date as date, confidence, created_at, updated_at
      FROM transactions 
      WHERE user_id = $1
    `;
    const params = [req.user.id];
    let paramCount = 1;

    // Add filters
    if (category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(category);
    }

    if (type) {
      paramCount++;
      query += ` AND type = $${paramCount}`;
      params.push(type);
    }

    if (startDate) {
      paramCount++;
      query += ` AND transaction_date >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND transaction_date <= $${paramCount}`;
      params.push(endDate);
    }

    query += ` ORDER BY transaction_date DESC, created_at DESC`;
    
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await pool.query(query, params);
    
    // Format dates for frontend
    const transactions = result.rows.map(row => ({
      ...row,
      date: row.date.toISOString(),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    }));

    res.json(transactions);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// POST /transactions/parse - Parse natural language transaction
router.post('/parse', [
  body('input').trim().isLength({ min: 1 }).withMessage('Input text is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { input } = req.body;
    const parsedData = await parseTransactionWithAI(input);
    
    res.json(parsedData);
  } catch (error) {
    console.error('Parse transaction error:', error);
    res.status(500).json({ error: 'Failed to parse transaction' });
  }
});

// POST /transactions - Create new transaction
router.post('/', validateTransaction, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, description, category, type, date, confidence } = req.body;
    const transactionDate = date ? new Date(date) : new Date();

    const result = await pool.query(`
      INSERT INTO transactions (user_id, amount, description, category, type, transaction_date, confidence)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [req.user.id, amount, description, category, type, transactionDate, confidence || null]);

    const transaction = result.rows[0];
    
    // Format response for frontend
    res.status(201).json({
      id: transaction.id,
      userId: transaction.user_id,
      amount: parseFloat(transaction.amount),
      description: transaction.description,
      category: transaction.category,
      type: transaction.type,
      date: transaction.transaction_date.toISOString(),
      confidence: transaction.confidence ? parseFloat(transaction.confidence) : null,
      createdAt: transaction.created_at.toISOString(),
      updatedAt: transaction.updated_at.toISOString()
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// PUT /transactions/:id - Update transaction
router.put('/:id', validateTransaction, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { amount, description, category, type, date } = req.body;
    const transactionDate = date ? new Date(date) : new Date();

    const result = await pool.query(`
      UPDATE transactions 
      SET amount = $2, description = $3, category = $4, type = $5, transaction_date = $6
      WHERE id = $1 AND user_id = $7
      RETURNING *
    `, [id, amount, description, category, type, transactionDate, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = result.rows[0];
    
    // Format response for frontend
    res.json({
      id: transaction.id,
      userId: transaction.user_id,
      amount: parseFloat(transaction.amount),
      description: transaction.description,
      category: transaction.category,
      type: transaction.type,
      date: transaction.transaction_date.toISOString(),
      confidence: transaction.confidence ? parseFloat(transaction.confidence) : null,
      createdAt: transaction.created_at.toISOString(),
      updatedAt: transaction.updated_at.toISOString()
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// DELETE /transactions/:id - Delete transaction
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      DELETE FROM transactions 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ message: 'Transaction deleted successfully', id });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// GET /transactions/categories - Get available categories
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT name, color FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

module.exports = router;
