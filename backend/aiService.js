import dotenv from 'dotenv';
dotenv.config();

// Allowed Categories
const CATEGORIES = [
  'Food/Beverage',
  'Transport',
  'Utilities',
  'Entertainment',
  'Shopping',
  'Other'
];

/**
 * 1. HYBRID NLP EXPENDITURE PARSER
 * Parses natural language input (e.g., "Spent 350 Rs on movie tickets yesterday")
 * into structured JSON: { amount, category, date, description }
 */
export async function parseNlpExpense(text) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      console.log('Using Gemini API for NLP parsing...');
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Analyze the following expense description and extract:
1. The total amount spent (as a number, converted to Indian Rupees ₹ if specified, otherwise raw number).
2. The category (must be exactly one of: ${CATEGORIES.map(c => `"${c}"`).join(', ')}).
3. The transaction date (in YYYY-MM-DD format. Assume today's date is ${new Date().toISOString().split('T')[0]}. "yesterday" should be resolved to the correct date).
4. A concise, clean description/title of the expense (capitalized, max 30 characters).

Return ONLY a valid JSON object with keys: "amount" (number), "category" (string), "date" (string), and "description" (string). Do not return markdown, do not write code blocks, just raw JSON.

Input Text: "${text}"`
                  }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: 'application/json'
            }
          })
        }
      );

      if (response.ok) {
        const result = await response.json();
        const jsonText = result.candidates[0].content.parts[0].text.trim();
        const parsed = JSON.parse(jsonText);
        
        // Validate category
        if (!CATEGORIES.includes(parsed.category)) {
          parsed.category = 'Other';
        }
        return parsed;
      } else {
        console.warn('Gemini API call failed, falling back to local parser.');
      }
    } catch (error) {
      console.error('Error during Gemini API parsing:', error);
    }
  }

  // Local Parser Fallback (Regex & Keyword Mapping)
  return parseNlpExpenseLocally(text);
}

/**
 * Custom Local NLP Fallback Parser
 * Uses regex patterns and keyword dictionaries. Great interview talking point!
 */
function parseNlpExpenseLocally(text) {
  console.log('Using Local Regex/Keyword Parser (Fallback)...');
  const normalizedText = text.toLowerCase();
  
  // 1. Extract Amount
  // Matches numbers, handling currency symbols: e.g. Rs 500, Rs. 500, ₹500, 500rs, 500.50
  const amountRegex = /(?:rs\.?|₹|usd|\$|spent|for)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:rs|rupees|bucks|inr|₹|\$)/i;
  const match = normalizedText.match(amountRegex);
  let amount = 0;
  if (match) {
    amount = Number(match[1] || match[2]);
  } else {
    // Search for any stand-alone number
    const fallbackMatch = normalizedText.match(/(\d+(?:\.\d+)?)/);
    if (fallbackMatch) amount = Number(fallbackMatch[1]);
  }

  // 2. Extract Category
  let category = 'Other';
  const categoryKeywords = {
    'Food/Beverage': ['food', 'restaurant', 'coffee', 'tea', 'swiggy', 'zomato', 'cafe', 'lunch', 'dinner', 'pizza', 'burger', 'grocery', 'groceries', 'milk', 'snacks', 'eat', 'beverage', 'starbucks', 'maggi'],
    'Transport': ['taxi', 'cab', 'uber', 'ola', 'metro', 'train', 'bus', 'ticket', 'flight', 'petrol', 'diesel', 'fuel', 'travel', 'commute', 'ride'],
    'Utilities': ['rent', 'electricity', 'electric', 'power', 'water', 'gas', 'wifi', 'internet', 'recharge', 'bill', 'bills', 'mobile', 'broadband'],
    'Entertainment': ['netflix', 'prime', 'hotstar', 'movie', 'cinema', 'bookmyshow', 'spotify', 'game', 'gaming', 'concert', 'club', 'bar', 'pub', 'party', 'youtube'],
    'Shopping': ['amazon', 'flipkart', 'myntra', 'clothes', 'shoes', 'shirt', 'jeans', 'laptop', 'phone', 'gadget', 'book', 'books', 'shopping', 'dress', 'bag']
  };

  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => normalizedText.includes(keyword))) {
      category = cat;
      break;
    }
  }

  // 3. Extract Date
  let dateStr = new Date().toISOString().split('T')[0]; // Default: Today
  if (normalizedText.includes('yesterday')) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    dateStr = d.toISOString().split('T')[0];
  } else if (normalizedText.includes('day before yesterday')) {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    dateStr = d.toISOString().split('T')[0];
  }

  // 4. Extract Description
  // Clean text by stripping out common prepositions, amount keywords, and amounts
  let cleanDesc = text
    .replace(/(?:spent|bought|paid|gave|added|for)\b/gi, '')
    .replace(/(?:rs\.?|₹|usd|\$|rupees|inr)\s*\d+(?:\.\d+)?/gi, '')
    .replace(/\d+(?:\.\d+)?\s*(?:rs|rupees|inr|₹|\$)/gi, '')
    .replace(/\b\d+\b/g, '') // remove numbers
    .replace(/\b(today|yesterday|day before yesterday|tonight)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanDesc.length === 0) {
    cleanDesc = `Expense - ${category}`;
  } else {
    // Capitalize first letter
    cleanDesc = cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1);
    if (cleanDesc.length > 30) {
      cleanDesc = cleanDesc.substring(0, 27) + '...';
    }
  }

  return {
    amount,
    category,
    date: dateStr,
    description: cleanDesc
  };
}

/**
 * 2. OCR TEXT RECOVERY / PARSER
 * Scrapes total, vendor name and date from OCR block text
 */
export async function parseOcrText(ocrText) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      console.log('Parsing OCR text with Gemini API...');
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Below is a text output extracted from a receipt image using OCR. Extract the following fields for the overall receipt:
1. The total amount spent (as a number). Look for terms like "Total", "Grand Total", "Amount Due", or the highest monetary value on the receipt. Do NOT extract "Total Items" or "Quantity".
2. The category (must be "Food/Beverage").
3. The transaction date (MUST BE exactly today's date: ${new Date().toISOString().split('T')[0]}). Ignore the date on the receipt so it reflects in the current month's analysis.
4. Description/Name (use exactly "Food Bill" or the Vendor's name).

Return ONLY a valid JSON object with a single key "items" which is an array containing exactly ONE object. The object must have keys: "amount" (number), "category" (string), "date" (string), and "description" (string). Do not return markdown or code blocks.

OCR Extracted Text:
"""
${ocrText}
"""`
                  }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: 'application/json'
            }
          })
        }
      );

      if (response.ok) {
        const result = await response.json();
        const jsonText = result.candidates[0].content.parts[0].text.trim();
        const parsed = JSON.parse(jsonText);
        
        if (parsed.items && Array.isArray(parsed.items)) {
          return parsed;
        }
        
        return { items: [] };
      }
    } catch (error) {
      console.error('Error during Gemini OCR parsing:', error);
    }
  }

  // Local OCR Heuristics Parser (Regex)
  console.log('Using Local OCR Parser (Fallback)...');
  
  // 1. Use Today's Date (forced for analysis graphs)
  let dateStr = new Date().toISOString().split('T')[0];

  // 2. Find Total Amount (Robust: find the max valid price to avoid 'Total Items: 6')
  let amount = 0;
  
  let cleanText = ocrText
    .replace(/\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/g, '')
    .replace(/\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g, '')
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, '')
    .replace(/\b20\d{2}\b/g, '') // strip obvious years
    .replace(/\b\d{10,}\b/g, ''); // strip long numbers/phones

  // Prioritize decimal numbers (often prices)
  const decimalMatches = cleanText.match(/\b\d+\.\d{2}\b/g);
  if (decimalMatches) {
    const numbers = decimalMatches.map(n => parseFloat(n)).filter(n => n > 0 && n < 50000);
    if (numbers.length > 0) {
      amount = Math.max(...numbers);
    }
  }

  // If no decimals, take the largest integer
  if (amount === 0) {
    const allMatches = cleanText.match(/\b\d+(?:\.\d{1,2})?\b/g);
    if (allMatches) {
      const numbers = allMatches
        .map(n => parseFloat(n))
        .filter(n => n > 0 && n < 50000 && n !== 2026);
      if (numbers.length > 0) {
        amount = Math.max(...numbers);
      }
    }
  }

  // 3. Set Description & Category
  let vendorName = 'Food Bill';
  let category = 'Food/Beverage';

  return {
    items: [
      {
        amount,
        category,
        date: dateStr,
        description: vendorName
      }
    ]
  };
}

/**
 * 3. STATISTICAL ANOMALY DETECTION (Standard Deviation)
 * Flags if a new transaction is an outlier (> 2 SD from mean)
 */
export function detectAnomaly(newTransaction, historicalTransactions) {
  const { category, amount } = newTransaction;
  
  // Safe Amount: Transactions up to ₹1000 are considered safe and don't trigger warnings
  if (amount <= 1000) {
    return { isAnomaly: false };
  }
  
  // Filter history to same category and type
  const catHistory = historicalTransactions.filter(
    tx => tx.category === category && tx.type === 'expense' && tx.id !== newTransaction.id
  );

  // Need at least 3 transactions to compute a meaningful standard deviation
  if (catHistory.length < 3) {
    // Fallback: If expense is very high (> 15000), flag as warning
    if (amount > 15000) {
      return {
        isAnomaly: true,
        message: `High value transaction detected in "${category}" (₹${amount}). Check details.`,
        severity: 'medium'
      };
    }
    return { isAnomaly: false };
  }

  // Calculate Mean
  const sum = catHistory.reduce((acc, tx) => acc + tx.amount, 0);
  const mean = sum / catHistory.length;

  // Calculate Variance & Standard Deviation
  const varianceSum = catHistory.reduce((acc, tx) => acc + Math.pow(tx.amount - mean, 2), 0);
  const variance = varianceSum / catHistory.length;
  const stdDev = Math.sqrt(variance);

  // Threshold: Mean + 2 * Standard Deviation
  // Add a minimum standard deviation of 100 to prevent division by zero or overly sensitive alarms on small amounts
  const effectiveStdDev = Math.max(stdDev, 100);
  const threshold = mean + 2 * effectiveStdDev;

  if (amount > threshold) {
    const multiplier = (amount / mean).toFixed(1);
    return {
      isAnomaly: true,
      message: `Unusual spend in "${category}". Spending of ₹${amount} is ${multiplier}x higher than your average of ₹${mean.toFixed(0)}.`,
      severity: amount > mean + 3.5 * effectiveStdDev ? 'high' : 'medium',
      stats: {
        mean: Math.round(mean),
        stdDev: Math.round(stdDev),
        threshold: Math.round(threshold)
      }
    };
  }

  return { isAnomaly: false };
}

/**
 * 4. PREDICTIVE FORECASTING (Linear Regression)
 * Uses y = mx + c to forecast next month's spending
 */
export function calculateBudgetForecast(historicalTransactions, budgets) {
  if (historicalTransactions.length === 0) {
    return { forecast: 0, trend: 'stable', message: 'No transaction data available.' };
  }

  // Group expenses by Year-Month
  const monthlyExpenses = {};
  
  // Only look at expenses
  historicalTransactions.forEach(tx => {
    if (tx.type !== 'expense') return;
    
    // Format date to YYYY-MM
    const date = new Date(tx.date);
    if (isNaN(date.getTime())) return;
    
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyExpenses[yearMonth] = (monthlyExpenses[yearMonth] || 0) + tx.amount;
  });

  // Sort months chronologically
  const sortedMonths = Object.keys(monthlyExpenses).sort();
  
  if (sortedMonths.length === 0) {
    return { forecast: 0, trend: 'stable', message: 'Not enough historical spending months.' };
  }

  // If we only have 1 or 2 months, we can't perform meaningful linear regression.
  // We fall back to standard averaging.
  if (sortedMonths.length < 3) {
    const totalSpent = Object.values(monthlyExpenses).reduce((a, b) => a + b, 0);
    const avgSpent = totalSpent / sortedMonths.length;
    const totalBudget = budgets.reduce((acc, b) => acc + b.limit, 0);
    const percentage = totalBudget > 0 ? (avgSpent / totalBudget) * 100 : 0;

    return {
      forecast: Math.round(avgSpent),
      trend: 'stable',
      message: `Based on your ${sortedMonths.length}-month average of ₹${Math.round(avgSpent).toLocaleString()}, you will utilize ${percentage.toFixed(0)}% of your total budget (₹${totalBudget.toLocaleString()}).`,
      historicalPoints: sortedMonths.map((m, idx) => ({ month: m, amount: monthlyExpenses[m] }))
    };
  }

  // Run Linear Regression: y = mx + c
  // x = index of month (1, 2, 3...)
  // y = total spend
  const n = sortedMonths.length;
  const xValues = Array.from({ length: n }, (_, i) => i + 1);
  const yValues = sortedMonths.map(m => monthlyExpenses[m]);

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += xValues[i];
    sumY += yValues[i];
    sumXY += xValues[i] * yValues[i];
    sumXX += xValues[i] * xValues[i];
  }

  // Slope: m
  const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  // Intercept: c
  const c = (sumY - m * sumX) / n;

  // Forecast next month: x_next = n + 1
  const xNext = n + 1;
  let forecast = m * xNext + c;
  
  // Spend cannot be negative
  if (forecast < 0) forecast = 0;

  // Total Budget limit
  const totalBudget = budgets.reduce((acc, b) => acc + b.limit, 0);
  const percentage = totalBudget > 0 ? (forecast / totalBudget) * 100 : 0;
  
  let trend = 'stable';
  if (m > 200) trend = 'increasing';
  else if (m < -200) trend = 'decreasing';

  let message = '';
  if (trend === 'increasing') {
    message = `Alert: Your spending is trending UPWARDS by ₹${Math.round(m).toLocaleString()}/month. Projected next month: ₹${Math.round(forecast).toLocaleString()} (${percentage.toFixed(0)}% of budget).`;
  } else if (trend === 'decreasing') {
    message = `Nice: Your spending is trending DOWNWARDS by ₹${Math.round(Math.abs(m)).toLocaleString()}/month. Projected next month: ₹${Math.round(forecast).toLocaleString()} (${percentage.toFixed(0)}% of budget).`;
  } else {
    message = `Your spending is stable. Projected next month: ₹${Math.round(forecast).toLocaleString()} (${percentage.toFixed(0)}% of budget).`;
  }

  return {
    forecast: Math.round(forecast),
    trend,
    trendSlope: Math.round(m),
    message,
    historicalPoints: sortedMonths.map((m, idx) => ({ month: m, amount: monthlyExpenses[m] }))
  };
}
