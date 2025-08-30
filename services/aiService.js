const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Income',
  'Groceries',
  'Travel',
  'Other'
];

const CATEGORY_KEYWORDS = {
  'Food & Dining': ['restaurant', 'coffee', 'starbucks', 'dinner', 'lunch', 'breakfast', 'food', 'cafe', 'pizza', 'burger'],
  'Transportation': ['gas', 'uber', 'taxi', 'bus', 'metro', 'parking', 'fuel', 'lyft', 'train', 'subway'],
  'Shopping': ['amazon', 'store', 'mall', 'purchase', 'buy', 'bought', 'clothing', 'electronics'],
  'Entertainment': ['movie', 'netflix', 'spotify', 'game', 'concert', 'streaming', 'youtube', 'cinema'],
  'Bills & Utilities': ['electric', 'water', 'internet', 'phone', 'subscription', 'rent', 'mortgage', 'insurance'],
  'Healthcare': ['doctor', 'pharmacy', 'hospital', 'medicine', 'dental', 'medical'],
  'Income': ['salary', 'paycheck', 'freelance', 'bonus', 'refund', 'dividend'],
  'Groceries': ['grocery', 'whole foods', 'supermarket', 'market', 'walmart', 'target'],
  'Travel': ['hotel', 'flight', 'booking', 'airbnb', 'vacation', 'trip'],
  'Other': []
};

// Fallback parser (used when OpenAI is not available)
const fallbackParser = (input) => {
  const lowerInput = input.toLowerCase();
  
  // Extract amount
  const amountMatch = input.match(/\$?(\d+\.?\d*)/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;

  // Determine category based on keywords
  let category = 'Other';
  let maxMatches = 0;

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matches = keywords.filter(keyword => lowerInput.includes(keyword)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      category = cat;
    }
  }

  // Determine type (income vs expense)
  const incomeKeywords = ['salary', 'paycheck', 'income', 'bonus', 'freelance', 'paid', 'refund', 'dividend'];
  const type = incomeKeywords.some(keyword => lowerInput.includes(keyword)) ? 'income' : 'expense';

  // Clean description
  let description = input
    .replace(/\$?(\d+\.?\d*)/, '')
    .replace(/^at\s+/i, '')
    .trim();
  
  if (!description) {
    description = input;
  }

  // Calculate confidence based on how well we parsed it
  let confidence = 0.6; // Base confidence for fallback
  if (amountMatch) confidence += 0.2;
  if (category !== 'Other') confidence += 0.1;
  if (description.length > 3) confidence += 0.1;

  return {
    amount,
    description,
    category,
    type,
    confidence: Math.min(confidence, 1.0)
  };
};

// AI-powered transaction parser
const parseTransactionWithAI = async (input) => {
  if (!process.env.OPENAI_API_KEY) {
    console.log('OpenAI API key not configured, using fallback parser');
    return fallbackParser(input);
  }

  try {
    const prompt = `
Parse this financial transaction description into structured data. Return ONLY a JSON object with no additional text.

Input: "${input}"

Extract:
- amount: number (dollar amount, no currency symbol)
- description: string (cleaned transaction description)
- category: string (must be one of: ${CATEGORIES.join(', ')})
- type: string ("income" or "expense")
- confidence: number (0.0 to 1.0, how confident you are in the parsing)

Examples:
"Coffee at Starbucks $6.50" → {"amount": 6.50, "description": "Coffee at Starbucks", "category": "Food & Dining", "type": "expense", "confidence": 0.95}
"Salary deposit $3500" → {"amount": 3500, "description": "Salary deposit", "category": "Income", "type": "income", "confidence": 0.98}
"Gas $45.20" → {"amount": 45.20, "description": "Gas", "category": "Transportation", "type": "expense", "confidence": 0.90}

Return only the JSON object:`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
      temperature: 0.1,
    });

    const content = response.choices[0].message.content.trim();
    
    try {
      const parsed = JSON.parse(content);
      
      // Validate the response
      if (typeof parsed.amount === 'number' && 
          typeof parsed.description === 'string' &&
          typeof parsed.category === 'string' &&
          typeof parsed.type === 'string' &&
          typeof parsed.confidence === 'number' &&
          CATEGORIES.includes(parsed.category) &&
          ['income', 'expense'].includes(parsed.type)) {
        
        return {
          amount: Math.abs(parsed.amount), // Ensure positive amount
          description: parsed.description.trim(),
          category: parsed.category,
          type: parsed.type,
          confidence: Math.max(0, Math.min(1, parsed.confidence)) // Clamp between 0 and 1
        };
      } else {
        throw new Error('Invalid AI response format');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return fallbackParser(input);
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    return fallbackParser(input);
  }
};

module.exports = {
  parseTransactionWithAI,
  CATEGORIES,
  CATEGORY_KEYWORDS
};
