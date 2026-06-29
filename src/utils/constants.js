export const CATEGORIES = [
  // Expense categories
  { id: 'parents',     name: 'Parents',        type: 'expense', color: '#9CA3AF', bg: '#374151', icon: 'tag' },
  { id: 'emi',         name: 'EMI & Loans',    type: 'expense', color: '#F97316', bg: '#431407', icon: 'credit-card' },
  { id: 'investment',  name: 'Investment',     type: 'expense', color: '#4CAF76', bg: '#052e16', icon: 'pie-chart' },
  { id: 'housing',     name: 'Housing & Rent', type: 'expense', color: '#A855F7', bg: '#2e1065', icon: 'home' },
  { id: 'transport',   name: 'Transport',      type: 'expense', color: '#3B82F6', bg: '#1e3a5f', icon: 'car' },
  { id: 'food',        name: 'Food & Dining',  type: 'expense', color: '#22C55E', bg: '#052e16', icon: 'utensils' },
  { id: 'healthcare',  name: 'Healthcare',     type: 'expense', color: '#E05252', bg: '#4c0519', icon: 'heart' },
  { id: 'shopping',    name: 'Shopping',       type: 'expense', color: '#EC4899', bg: '#4a044e', icon: 'shopping-bag' },
  { id: 'entertainment', name: 'Entertainment',type: 'expense', color: '#EAB308', bg: '#422006', icon: 'tv' },
  { id: 'education',   name: 'Education',      type: 'expense', color: '#06B6D4', bg: '#0c4a6e', icon: 'book' },
  { id: 'other',       name: 'Other Expense',  type: 'expense', color: '#6B7280', bg: '#1f2937', icon: 'more-horizontal' },
  // Income categories
  { id: 'salary',      name: 'Salary',         type: 'income',  color: '#4CAF76', bg: '#052e16', icon: 'briefcase' },
  { id: 'freelance',   name: 'Freelance',      type: 'income',  color: '#3B82F6', bg: '#1e3a5f', icon: 'code' },
  { id: 'business',    name: 'Business',       type: 'income',  color: '#F97316', bg: '#431407', icon: 'building-2' },
  { id: 'returns',     name: 'Inv. Returns',   type: 'income',  color: '#22C55E', bg: '#052e16', icon: 'trending-up' },
  { id: 'gifts',       name: 'Gifts',          type: 'income',  color: '#EC4899', bg: '#4a044e', icon: 'gift' },
  { id: 'other-inc',   name: 'Other Income',   type: 'income',  color: '#9CA3AF', bg: '#1f2937', icon: 'plus' },
]

export const ACCOUNT_TYPES = [
  { id: 'cash',   name: 'Cash',         icon: 'wallet',       color: '#4CAF76' },
  { id: 'bank',   name: 'Bank',         icon: 'landmark',     color: '#3B82F6' },
  { id: 'credit', name: 'Credit Card',  icon: 'credit-card',  color: '#E05252' },
  { id: 'upi',    name: 'UPI / Wallet', icon: 'smartphone',   color: '#A855F7' },
]

export const DEFAULT_ACCOUNTS = [
  { id: 'acc-cash',   name: 'Cash',         type: 'cash',   balance: 0, color: '#4CAF76' },
  { id: 'acc-bank',   name: 'Bank',         type: 'bank',   balance: 0, color: '#3B82F6' },
  { id: 'acc-cc',     name: 'Credit Card',  type: 'credit', balance: 0, color: '#E05252' },
  { id: 'acc-upi',    name: 'UPI / Wallet', type: 'upi',    balance: 0, color: '#A855F7' },
]

export const ASSET_TYPES = [
  { id: 'equity',    name: 'Equity MF',       color: '#3B82F6' },
  { id: 'debt',      name: 'Debt MF',         color: '#4CAF76' },
  { id: 'gold',      name: 'Gold',            color: '#EAB308' },
  { id: 'stock',     name: 'Stocks',          color: '#A855F7' },
  { id: 'fd',        name: 'FD / RD',         color: '#F97316' },
  { id: 'realestate',name: 'Real Estate',     color: '#E05252' },
  { id: 'crypto',    name: 'Crypto',          color: '#EC4899' },
  { id: 'other',     name: 'Other Asset',     color: '#6B7280' },
]

export const GOAL_TYPES = [
  { id: 'savings',  name: 'Savings Goal',     icon: 'piggy-bank',  color: '#4CAF76' },
  { id: 'budget',   name: 'Budget Limit',     icon: 'shield',      color: '#3B82F6' },
  { id: 'debt',     name: 'Debt Payoff',      icon: 'landmark',    color: '#E05252' },
  { id: 'income',   name: 'Income Target',    icon: 'trending-up', color: '#F97316' },
]

export const RECURRING_FREQ = [
  { id: 'daily',    name: 'Daily' },
  { id: 'weekly',   name: 'Weekly' },
  { id: 'monthly',  name: 'Monthly' },
  { id: 'yearly',   name: 'Yearly' },
]

export const INACTIVITY_TIMEOUT = 5 * 60 * 1000 // 5 minutes

export const PIN_RESET_ATTEMPTS = 3
