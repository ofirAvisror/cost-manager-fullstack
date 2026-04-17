/**
 * idb-react.js - IndexedDB wrapper library (React/JavaScript version)
 * This library wraps IndexedDB operations using Promises
 * Compatible with React and JavaScript modules
 */

/**
 * Opens or creates an IndexedDB database for costs
 * @param {string} databaseName - The name of the database
 * @param {number} databaseVersion - The version number of the database
 * @returns {Promise<Object>} Promise that resolves to database object with addCost and getReport methods
 */
export function openCostsDB(databaseName, databaseVersion) {
  return new Promise(function (resolve, reject) {
    const request = indexedDB.open(databaseName, databaseVersion);

    request.onerror = function () {
      reject(request.error);
    };

    request.onsuccess = function () {
      const db = request.result;
      const dbObject = {
        /**
         * Adds a new cost item to the database
         * @param {Object} cost - Cost object with sum, currency, category, description properties
         * @returns {Promise<Object>} Promise that resolves to the added cost object (without date as per specification)
         */
        addCost: function (cost) {
          return new Promise(function (resolveAdd, rejectAdd) {
            const transaction = db.transaction(["costs"], "readwrite");
            const store = transaction.objectStore("costs");

            // Set the date to current date
            const now = new Date();
            const costWithDate = {
              sum: cost.sum,
              currency: cost.currency,
              category: cost.category,
              description: cost.description,
              type: cost.type || 'expense', // Default to 'expense' for backward compatibility
              date: {
                year: now.getFullYear(),
                month: now.getMonth() + 1,
                day: now.getDate(),
              },
            };

            const addRequest = store.add(costWithDate);

            addRequest.onsuccess = function () {
              // Return cost object without date as per specification
              resolveAdd({
                sum: cost.sum,
                currency: cost.currency,
                category: cost.category,
                description: cost.description,
              });
            };

            addRequest.onerror = function () {
              rejectAdd(addRequest.error);
            };
          });
        },
        /**
         * Gets a detailed report for a specific month and year in a specific currency
         * @param {number} year - The year
         * @param {number} month - The month (1-12)
         * @param {string} currency - The target currency (USD, ILS, GBP, EURO)
         * @returns {Promise<Object>} Promise that resolves to report object
         */
        getReport: function (year, month, currency) {
          return new Promise(function (resolveReport, rejectReport) {
            // First, fetch exchange rates
            const exchangeRateUrl =
              localStorage.getItem("exchangeRateUrl") ||
              process.env.REACT_APP_EXCHANGE_RATE_URL ||
              "https://gist.githubusercontent.com/Pafestivo/e4e1c962472306b578983a6a0c40828e/raw/exchange-rates.json";

            fetch(exchangeRateUrl)
              .then(function (response) {
                return response.json();
              })
              .then(function (rates) {
                const transaction = db.transaction(["costs"], "readonly");
                const store = transaction.objectStore("costs");

                // Query all costs and filter by year and month
                // IndexedDB doesn't support nested property paths in compound indexes,
                // so we query all and filter in JavaScript
                const request = store.openCursor();
                const costs = [];

                request.onsuccess = function (event) {
                  const cursor = event.target.result;
                  if (cursor) {
                    const value = cursor.value;
                    // Filter by exact year and month match
                    if (
                      value.date &&
                      value.date.year === year &&
                      value.date.month === month
                    ) {
                      costs.push(value);
                    }
                    cursor.continue();
                  } else {
                    // All items processed, separate by type
                    const expenses = [];
                    const incomes = [];
                    const savingsDeposits = [];
                    const savingsWithdrawals = [];

                    costs.forEach(function (cost) {
                      // Convert to USD first, then to target currency
                      const amountInUSD = cost.sum / rates[cost.currency];
                      const convertedSum = amountInUSD * rates[currency];

                      const convertedItem = {
                        sum: convertedSum,
                        currency: currency,
                        category: cost.category,
                        description: cost.description,
                        type: cost.type || 'expense',
                        Date: {
                          day: cost.date.day,
                        },
                      };

                      const type = cost.type || 'expense';
                      if (type === 'income') {
                        incomes.push(convertedItem);
                      } else if (type === 'savings_deposit') {
                        savingsDeposits.push(convertedItem);
                      } else if (type === 'savings_withdrawal') {
                        savingsWithdrawals.push(convertedItem);
                      } else {
                        expenses.push(convertedItem);
                      }
                    });

                    // Calculate totals
                    const totalExpenses = expenses.reduce(function (sum, item) {
                      return sum + item.sum;
                    }, 0);

                    const totalIncomes = incomes.reduce(function (sum, item) {
                      return sum + item.sum;
                    }, 0);

                    const totalSavingsDeposits = savingsDeposits.reduce(function (sum, item) {
                      return sum + item.sum;
                    }, 0);

                    const totalSavingsWithdrawals = savingsWithdrawals.reduce(function (sum, item) {
                      return sum + item.sum;
                    }, 0);

                    const totalSavings = totalSavingsDeposits - totalSavingsWithdrawals;
                    const balance = totalIncomes - totalExpenses;

                    const report = {
                      year: year,
                      month: month,
                      expenses: expenses,
                      incomes: incomes,
                      savings: {
                        deposits: savingsDeposits,
                        withdrawals: savingsWithdrawals,
                        total: totalSavings,
                      },
                      totals: {
                        expenses: totalExpenses,
                        incomes: totalIncomes,
                        savings: totalSavings,
                        balance: balance,
                        currency: currency,
                      },
                      // Keep backward compatibility
                      costs: expenses,
                      total: {
                        currency: currency,
                        total: totalExpenses,
                      },
                    };

                    resolveReport(report);
                  }
                };

                request.onerror = function () {
                  rejectReport(request.error);
                };
              })
              .catch(function (error) {
                rejectReport(error);
              });
          });
        },

        /**
         * Gets all cost items
         * @returns {Promise<Array>} Promise that resolves to array of cost items
         */
        getAllCosts: function () {
          return new Promise(function (resolve, reject) {
            const transaction = db.transaction(["costs"], "readonly");
            const store = transaction.objectStore("costs");
            const request = store.getAll();

            request.onsuccess = function () {
              resolve(request.result);
            };

            request.onerror = function () {
              reject(request.error);
            };
          });
        },

        /**
         * Gets costs by category
         * @param {string} category - The category name
         * @returns {Promise<Array>} Promise that resolves to array of cost items
         */
        getCostsByCategory: function (category) {
          return new Promise(function (resolve, reject) {
            const transaction = db.transaction(["costs"], "readonly");
            const store = transaction.objectStore("costs");
            const request = store.openCursor();
            const costs = [];

            request.onsuccess = function (event) {
              const cursor = event.target.result;
              if (cursor) {
                const value = cursor.value;
                if (value.category === category) {
                  costs.push(value);
                }
                cursor.continue();
              } else {
                resolve(costs);
              }
            };

            request.onerror = function () {
              reject(request.error);
            };
          });
        },

        /**
         * Gets costs by date range
         * @param {Object} startDate - Start date object with year, month, day
         * @param {Object} endDate - End date object with year, month, day
         * @returns {Promise<Array>} Promise that resolves to array of cost items
         */
        getCostsByDateRange: function (startDate, endDate) {
          return new Promise(function (resolve, reject) {
            const transaction = db.transaction(["costs"], "readonly");
            const store = transaction.objectStore("costs");
            const request = store.openCursor();
            const costs = [];

            request.onsuccess = function (event) {
              const cursor = event.target.result;
              if (cursor) {
                const value = cursor.value;
                const date = value.date;

                // Check if date is within range
                const start = new Date(
                  startDate.year,
                  startDate.month - 1,
                  startDate.day
                );
                const end = new Date(
                  endDate.year,
                  endDate.month - 1,
                  endDate.day
                );
                const current = new Date(date.year, date.month - 1, date.day);

                if (current >= start && current <= end) {
                  costs.push(value);
                }
                cursor.continue();
              } else {
                resolve(costs);
              }
            };

            request.onerror = function () {
              reject(request.error);
            };
          });
        },

        /**
         * Gets statistics for a month
         * @param {number} year - The year
         * @param {number} month - The month (1-12)
         * @param {string} currency - The target currency
         * @returns {Promise<Object>} Promise that resolves to statistics object
         */
        getStatistics: function (year, month, currency) {
          return new Promise(function (resolve, reject) {
            const exchangeRateUrl =
              localStorage.getItem("exchangeRateUrl") ||
              process.env.REACT_APP_EXCHANGE_RATE_URL ||
              "https://gist.githubusercontent.com/Pafestivo/e4e1c962472306b578983a6a0c40828e/raw/exchange-rates.json";

            fetch(exchangeRateUrl)
              .then(function (response) {
                return response.json();
              })
              .then(function (rates) {
                // Get current month costs
                dbObject
                  .getReport(year, month, currency)
                  .then(function (currentReport) {
                    // Get last month costs
                    const lastMonth = month === 1 ? 12 : month - 1;
                    const lastYear = month === 1 ? year - 1 : year;

                    dbObject
                      .getReport(lastYear, lastMonth, currency)
                      .then(function (lastReport) {
                        const totalExpensesThisMonth = currentReport.totals.expenses;
                        const totalExpensesLastMonth = lastReport.totals.expenses;
                        const totalIncomesThisMonth = currentReport.totals.incomes;
                        const totalSavingsThisMonth = currentReport.totals.savings;
                        const balanceThisMonth = currentReport.totals.balance;
                        
                        const daysInMonth = new Date(year, month, 0).getDate();
                        const averageDaily = totalExpensesThisMonth / daysInMonth;

                        // Calculate by category (for expenses)
                        const totalByCategory = {};
                        currentReport.expenses.forEach(function (cost) {
                          if (totalByCategory[cost.category]) {
                            totalByCategory[cost.category] += cost.sum;
                          } else {
                            totalByCategory[cost.category] = cost.sum;
                          }
                        });

                        // Calculate change percentage for expenses
                        const changePercentage =
                          totalExpensesLastMonth > 0
                            ? ((totalExpensesThisMonth - totalExpensesLastMonth) /
                                totalExpensesLastMonth) *
                              100
                            : 0;

                        const stats = {
                          totalThisMonth: totalExpensesThisMonth,
                          totalLastMonth: totalExpensesLastMonth,
                          totalIncomes: totalIncomesThisMonth,
                          totalSavings: totalSavingsThisMonth,
                          balance: balanceThisMonth,
                          averageDaily,
                          totalByCategory,
                          changePercentage,
                          currency,
                        };

                        resolve(stats);
                      })
                      .catch(reject);
                  })
                  .catch(reject);
              })
              .catch(reject);
          });
        },

        /**
         * Updates a cost item
         * @param {number} id - The cost item ID
         * @param {Object} cost - Partial cost object with fields to update
         * @returns {Promise<Object>} Promise that resolves to updated cost item
         */
        updateCost: function (id, cost) {
          return new Promise(function (resolve, reject) {
            const transaction = db.transaction(["costs"], "readwrite");
            const store = transaction.objectStore("costs");
            const getRequest = store.get(id);

            getRequest.onsuccess = function () {
              const existing = getRequest.result;
              if (!existing) {
                reject(new Error("Cost item not found"));
                return;
              }

              const updated = {
                ...existing,
                ...cost,
                id: existing.id,
              };

              const updateRequest = store.put(updated);

              updateRequest.onsuccess = function () {
                resolve(updated);
              };

              updateRequest.onerror = function () {
                reject(updateRequest.error);
              };
            };

            getRequest.onerror = function () {
              reject(getRequest.error);
            };
          });
        },

        /**
         * Deletes a cost item
         * @param {number} id - The cost item ID
         * @returns {Promise<void>} Promise that resolves when deletion is complete
         */
        deleteCost: function (id) {
          return new Promise(function (resolve, reject) {
            const transaction = db.transaction(["costs"], "readwrite");
            const store = transaction.objectStore("costs");
            const request = store.delete(id);

            request.onsuccess = function () {
              resolve();
            };

            request.onerror = function () {
              reject(request.error);
            };
          });
        },

        /**
         * Gets all categories
         * @returns {Promise<Array>} Promise that resolves to array of categories
         */
        getCategories: function () {
          return new Promise(function (resolve, reject) {
            try {
              // Check if object store exists
              if (!db.objectStoreNames.contains("categories")) {
                // Object store doesn't exist yet, return empty array
                resolve([]);
                return;
              }

              const transaction = db.transaction(["categories"], "readonly");
              const store = transaction.objectStore("categories");
              const request = store.getAll();

              request.onsuccess = function () {
                const result = request.result;
                resolve(Array.isArray(result) ? result : []);
              };

              request.onerror = function () {
                // If error occurs, return empty array instead of rejecting
                console.warn("Error loading categories:", request.error);
                resolve([]);
              };
            } catch (error) {
              // If any error occurs, return empty array
              console.warn("Error in getCategories:", error);
              resolve([]);
            }
          });
        },

        /**
         * Adds a category
         * @param {Object} category - Category object with name and optional color/icon
         * @returns {Promise<Object>} Promise that resolves to added category with ID
         */
        addCategory: function (category) {
          return new Promise(function (resolve, reject) {
            try {
              if (!db.objectStoreNames.contains("categories")) {
                reject(
                  new Error(
                    "Categories object store does not exist. Please refresh the page to initialize the database."
                  )
                );
                return;
              }

              const transaction = db.transaction(["categories"], "readwrite");
              const store = transaction.objectStore("categories");
              const request = store.add(category);

              request.onsuccess = function () {
                const newCategory = {
                  ...category,
                  id: request.result,
                };
                resolve(newCategory);
              };

              request.onerror = function () {
                reject(request.error);
              };
            } catch (error) {
              reject(error);
            }
          });
        },

        /**
         * Updates a category
         * @param {number} id - The category ID
         * @param {Object} category - Partial category object with fields to update
         * @returns {Promise<Object>} Promise that resolves to updated category
         */
        updateCategory: function (id, category) {
          return new Promise(function (resolve, reject) {
            const transaction = db.transaction(["categories"], "readwrite");
            const store = transaction.objectStore("categories");
            const getRequest = store.get(id);

            getRequest.onsuccess = function () {
              const existing = getRequest.result;
              if (!existing) {
                reject(new Error("Category not found"));
                return;
              }

              const updated = {
                ...existing,
                ...category,
                id: existing.id,
              };

              const updateRequest = store.put(updated);

              updateRequest.onsuccess = function () {
                resolve(updated);
              };

              updateRequest.onerror = function () {
                reject(updateRequest.error);
              };
            };

            getRequest.onerror = function () {
              reject(getRequest.error);
            };
          });
        },

        /**
         * Deletes a category
         * @param {number} id - The category ID
         * @returns {Promise<void>} Promise that resolves when deletion is complete
         */
        deleteCategory: function (id) {
          return new Promise(function (resolve, reject) {
            const transaction = db.transaction(["categories"], "readwrite");
            const store = transaction.objectStore("categories");
            const request = store.delete(id);

            request.onsuccess = function () {
              resolve();
            };

            request.onerror = function () {
              reject(request.error);
            };
          });
        },

        /**
         * Gets budget
         * @param {number} year - The year
         * @param {number} [month] - Optional month (1-12)
         * @param {string} [category] - Optional category name
         * @returns {Promise<Object|null>} Promise that resolves to budget object or null
         */
        getBudget: function (year, month, category) {
          return new Promise(function (resolve, reject) {
            const transaction = db.transaction(["budgets"], "readonly");
            const store = transaction.objectStore("budgets");
            const request = store.openCursor();

            request.onsuccess = function (event) {
              const cursor = event.target.result;
              if (cursor) {
                const budget = cursor.value;
                if (budget.year === year) {
                  if (
                    category &&
                    budget.category === category &&
                    budget.type === "category"
                  ) {
                    resolve(budget);
                    return;
                  } else if (
                    month &&
                    budget.month === month &&
                    budget.type === "monthly"
                  ) {
                    resolve(budget);
                    return;
                  } else if (!month && !category && budget.type === "yearly") {
                    resolve(budget);
                    return;
                  }
                }
                cursor.continue();
              } else {
                resolve(null);
              }
            };

            request.onerror = function () {
              reject(request.error);
            };
          });
        },

        /**
         * Sets budget
         * @param {Object} budget - Budget object without ID
         * @returns {Promise<Object>} Promise that resolves to budget object with ID
         */
        setBudget: function (budget) {
          return new Promise(function (resolve, reject) {
            try {
              if (!db.objectStoreNames.contains("budgets")) {
                reject(
                  new Error(
                    "Budgets object store does not exist. Please refresh the page to initialize the database."
                  )
                );
                return;
              }

              const transaction = db.transaction(["budgets"], "readwrite");
              const store = transaction.objectStore("budgets");
              const request = store.add(budget);

              request.onsuccess = function () {
                const newBudget = {
                  ...budget,
                  id: request.result,
                };
                resolve(newBudget);
              };

              request.onerror = function () {
                reject(request.error);
              };
            } catch (error) {
              reject(error);
            }
          });
        },

        /**
         * Gets all budgets
         * @returns {Promise<Array>} Promise that resolves to array of budgets
         */
        getAllBudgets: function () {
          return new Promise(function (resolve, reject) {
            try {
              // Check if object store exists
              if (!db.objectStoreNames.contains("budgets")) {
                // Object store doesn't exist yet, return empty array
                resolve([]);
                return;
              }

              const transaction = db.transaction(["budgets"], "readonly");
              const store = transaction.objectStore("budgets");
              const request = store.getAll();

              request.onsuccess = function () {
                const result = request.result;
                resolve(Array.isArray(result) ? result : []);
              };

              request.onerror = function () {
                // If error occurs, return empty array instead of rejecting
                console.warn("Error loading budgets:", request.error);
                resolve([]);
              };
            } catch (error) {
              // If any error occurs, return empty array
              console.warn("Error in getAllBudgets:", error);
              resolve([]);
            }
          });
        },

        /**
         * Gets all savings goals
         * @returns {Promise<Array>} Promise that resolves to array of savings goals
         */
        getSavingsGoals: function () {
          return new Promise(function (resolve, reject) {
            try {
              if (!db.objectStoreNames.contains("savings_goals")) {
                resolve([]);
                return;
              }

              const transaction = db.transaction(["savings_goals"], "readonly");
              const store = transaction.objectStore("savings_goals");
              const request = store.getAll();

              request.onsuccess = function () {
                const result = request.result;
                resolve(Array.isArray(result) ? result : []);
              };

              request.onerror = function () {
                console.warn("Error loading savings goals:", request.error);
                resolve([]);
              };
            } catch (error) {
              console.warn("Error in getSavingsGoals:", error);
              resolve([]);
            }
          });
        },

        /**
         * Adds a savings goal
         * @param {Object} goal - Savings goal object with name, targetAmount, currency, targetDate
         * @returns {Promise<Object>} Promise that resolves to added goal with ID
         */
        addSavingsGoal: function (goal) {
          return new Promise(function (resolve, reject) {
            try {
              if (!db.objectStoreNames.contains("savings_goals")) {
                reject(
                  new Error(
                    "Savings goals object store does not exist. Please refresh the page to initialize the database."
                  )
                );
                return;
              }

              const now = new Date();
              const goalWithDate = {
                ...goal,
                createdAt: {
                  year: now.getFullYear(),
                  month: now.getMonth() + 1,
                  day: now.getDate(),
                },
              };

              const transaction = db.transaction(["savings_goals"], "readwrite");
              const store = transaction.objectStore("savings_goals");
              const request = store.add(goalWithDate);

              request.onsuccess = function () {
                const newGoal = {
                  ...goalWithDate,
                  id: request.result,
                };
                resolve(newGoal);
              };

              request.onerror = function () {
                reject(request.error);
              };
            } catch (error) {
              reject(error);
            }
          });
        },

        /**
         * Updates a savings goal
         * @param {number} id - The goal ID
         * @param {Object} goal - Partial goal object with fields to update
         * @returns {Promise<Object>} Promise that resolves to updated goal
         */
        updateSavingsGoal: function (id, goal) {
          return new Promise(function (resolve, reject) {
            const transaction = db.transaction(["savings_goals"], "readwrite");
            const store = transaction.objectStore("savings_goals");
            const getRequest = store.get(id);

            getRequest.onsuccess = function () {
              const existing = getRequest.result;
              if (!existing) {
                reject(new Error("Savings goal not found"));
                return;
              }

              const updated = {
                ...existing,
                ...goal,
                id: existing.id,
              };

              const updateRequest = store.put(updated);

              updateRequest.onsuccess = function () {
                resolve(updated);
              };

              updateRequest.onerror = function () {
                reject(updateRequest.error);
              };
            };

            getRequest.onerror = function () {
              reject(getRequest.error);
            };
          });
        },

        /**
         * Deletes a savings goal
         * @param {number} id - The goal ID
         * @returns {Promise<void>} Promise that resolves when deletion is complete
         */
        deleteSavingsGoal: function (id) {
          return new Promise(function (resolve, reject) {
            const transaction = db.transaction(["savings_goals"], "readwrite");
            const store = transaction.objectStore("savings_goals");
            const request = store.delete(id);

            request.onsuccess = function () {
              resolve();
            };

            request.onerror = function () {
              reject(request.error);
            };
          });
        },
      };

      resolve(dbObject);
    };

    request.onupgradeneeded = function (event) {
      const db = event.target.result;
      const transaction = event.target.transaction;
      const oldVersion = event.oldVersion;

      if (!transaction) return;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains("costs")) {
        db.createObjectStore("costs", { keyPath: "id", autoIncrement: true });
      } else if (oldVersion < 3) {
        // Migrate existing costs to add type field
        const costsStore = transaction.objectStore("costs");
        const request = costsStore.openCursor();
        
        request.onsuccess = function (event) {
          const cursor = event.target.result;
          if (cursor) {
            const value = cursor.value;
            if (!value.type) {
              value.type = 'expense';
              cursor.update(value);
            }
            cursor.continue();
          }
        };
      }

      if (!db.objectStoreNames.contains("categories")) {
        db.createObjectStore("categories", {
          keyPath: "id",
          autoIncrement: true,
        });
      }

      if (!db.objectStoreNames.contains("budgets")) {
        db.createObjectStore("budgets", { keyPath: "id", autoIncrement: true });
      }

      if (!db.objectStoreNames.contains("savings_goals")) {
        db.createObjectStore("savings_goals", { keyPath: "id", autoIncrement: true });
      }
    };
  });
}
