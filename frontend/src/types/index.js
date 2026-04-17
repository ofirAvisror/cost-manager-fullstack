/**
 * Type definitions for Cost Manager application
 * 
 * Note: This file contains JSDoc comments describing the data structures.
 * In JavaScript, these are used for documentation purposes only.
 */

/**
 * Supported currency types: 'USD' | 'ILS' | 'GBP' | 'EURO'
 * @typedef {('USD'|'ILS'|'GBP'|'EURO')} Currency
 */

/**
 * Date structure stored in database
 * @typedef {Object} DateStructure
 * @property {number} year
 * @property {number} month
 * @property {number} day
 */

/**
 * Cost item structure for adding to database
 * @typedef {Object} Cost
 * @property {number} sum
 * @property {Currency} currency
 * @property {string} category
 * @property {string} description
 * @property {DateStructure} date
 */

/**
 * Cost item with ID from database
 * @typedef {Object} CostItem
 * @property {number} [id]
 * @property {number} sum
 * @property {Currency} currency
 * @property {string} category
 * @property {string} description
 * @property {DateStructure} date
 */

/**
 * Cost item in report output (with simplified date)
 * @typedef {Object} ReportCostItem
 * @property {number} sum
 * @property {Currency} currency
 * @property {string} category
 * @property {string} description
 * @property {Object} Date
 * @property {number} Date.day
 */

/**
 * Report structure returned by getReport
 * @typedef {Object} Report
 * @property {number} year
 * @property {number} month
 * @property {ReportCostItem[]} costs
 * @property {Object} total
 * @property {Currency} total.currency
 * @property {number} total.total
 */

/**
 * Exchange rates structure
 * @typedef {Object} ExchangeRates
 * @property {number} USD
 * @property {number} GBP
 * @property {number} EURO
 * @property {number} ILS
 */

/**
 * Cost item returned by addCost (without date as per specification)
 * @typedef {Object} CostWithoutDate
 * @property {number} sum
 * @property {Currency} currency
 * @property {string} category
 * @property {string} description
 */

/**
 * Statistics structure
 * @typedef {Object} Statistics
 * @property {number} totalThisMonth
 * @property {number} totalLastMonth
 * @property {number} averageDaily
 * @property {Object.<string, number>} totalByCategory
 * @property {number} changePercentage
 * @property {Currency} currency
 */

/**
 * Budget structure
 * @typedef {Object} Budget
 * @property {number} [id]
 * @property {number} year
 * @property {number} [month]
 * @property {number} amount
 * @property {Currency} currency
 * @property {string} [category]
 * @property {('monthly'|'yearly'|'category')} type
 */

/**
 * Category structure
 * @typedef {Object} Category
 * @property {number} [id]
 * @property {string} name
 * @property {string} [color]
 * @property {string} [icon]
 */

/**
 * Database interface returned by openCostsDB
 * @typedef {Object} CostsDB
 * @property {function(Object): Promise<CostWithoutDate>} addCost
 * @property {function(number, number, Currency): Promise<Report>} getReport
 * @property {function(): Promise<CostItem[]>} getAllCosts
 * @property {function(string): Promise<CostItem[]>} getCostsByCategory
 * @property {function(DateStructure, DateStructure): Promise<CostItem[]>} getCostsByDateRange
 * @property {function(number, number, Currency): Promise<Statistics>} getStatistics
 * @property {function(number, Object): Promise<CostItem>} updateCost
 * @property {function(number): Promise<void>} deleteCost
 * @property {function(): Promise<Category[]>} getCategories
 * @property {function(Object): Promise<Category>} addCategory
 * @property {function(number, Object): Promise<Category>} updateCategory
 * @property {function(number): Promise<void>} deleteCategory
 * @property {function(number, number?, string?): Promise<Budget|null>} getBudget
 * @property {function(Object): Promise<Budget>} setBudget
 * @property {function(): Promise<Budget[]>} getAllBudgets
 */



