// Expense classification.
//
// An "Investment" expense is a contribution to an asset — money moved from
// cash into an asset, NOT consumption. It is excluded from "Spending" totals
// and reported separately as "Invested". Everything else of type expense is
// real spending. "Total out" = Spent + Invested (all expenses).
export const INVESTMENT_CATEGORY = 'investment'

export const isInvestmentExpense = (t) => t?.type === 'expense' && t?.categoryId === INVESTMENT_CATEGORY
export const isSpendingExpense = (t) => t?.type === 'expense' && t?.categoryId !== INVESTMENT_CATEGORY

export const sumAmount = (txs) => txs.reduce((s, t) => s + Number(t?.amount || 0), 0)
export const sumSpending = (txs) => sumAmount(txs.filter(isSpendingExpense))
export const sumInvested = (txs) => sumAmount(txs.filter(isInvestmentExpense))
