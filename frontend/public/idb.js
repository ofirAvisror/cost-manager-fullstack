/**
 * idb.js - IndexedDB wrapper library (Vanilla JavaScript version)
 * This library wraps IndexedDB operations using Promises
 */

(function () {
  "use strict";

  /**
   * Opens or creates an IndexedDB database for costs
   * @param {string} databaseName - The name of the database
   * @param {number} databaseVersion - The version number of the database
   * @returns {Promise<Object>} Promise that resolves to database object with addCost and getReport methods
   */
  function openCostsDB(databaseName, databaseVersion) {
    return new Promise(function (resolve, reject) {
      var request = indexedDB.open(databaseName, databaseVersion);

      request.onerror = function () {
        reject(request.error);
      };

      request.onsuccess = function () {
        var db = request.result;
        var dbObject = {
          db: db,
          /**
           * Adds a new cost item to the database
           * @param {Object} cost - Cost object with sum, currency, category, description properties
           * @returns {Promise<Object>} Promise that resolves to the added cost object
           */
          addCost: function (cost) {
            return new Promise(function (resolveAdd, rejectAdd) {
              var transaction = db.transaction(["costs"], "readwrite");
              var store = transaction.objectStore("costs");

              // Set the date to current date if not provided
              var now = new Date();
              var costWithDate = {
                sum: cost.sum,
                currency: cost.currency,
                category: cost.category,
                description: cost.description,
                date: {
                  year: now.getFullYear(),
                  month: now.getMonth() + 1,
                  day: now.getDate(),
                },
              };

              var addRequest = store.add(costWithDate);

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
              var exchangeRateUrl =
                localStorage.getItem("exchangeRateUrl") ||
                "https://gist.githubusercontent.com/Pafestivo/e4e1c962472306b578983a6a0c40828e/raw/47a4acb7048bd0db49e64d8b8fb06472213694dd/exchange-rates.json";

              fetch(exchangeRateUrl)
                .then(function (response) {
                  return response.json();
                })
                .then(function (rates) {
                  var transaction = db.transaction(["costs"], "readonly");
                  var store = transaction.objectStore("costs");

                  // Query all costs and filter by year and month
                  // IndexedDB doesn't support nested property paths in compound indexes,
                  // so we query all and filter in JavaScript
                  var request = store.openCursor();
                  var costs = [];

                  request.onsuccess = function (event) {
                    var cursor = event.target.result;
                    if (cursor) {
                      var value = cursor.value;
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
                      // All items processed, convert currencies and create report
                      var convertedCosts = costs.map(function (cost) {
                        // Convert to USD first, then to target currency
                        var amountInUSD = cost.sum / rates[cost.currency];
                        var convertedSum = amountInUSD * rates[currency];

                        return {
                          sum: convertedSum,
                          currency: currency,
                          category: cost.category,
                          description: cost.description,
                          Date: {
                            day: cost.date.day,
                          },
                        };
                      });

                      // Calculate total
                      var total = convertedCosts.reduce(function (sum, item) {
                        return sum + item.sum;
                      }, 0);

                      var report = {
                        year: year,
                        month: month,
                        costs: convertedCosts,
                        total: {
                          currency: currency,
                          total: total,
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
        };

        resolve(dbObject);
      };

      request.onupgradeneeded = function (event) {
        var db = event.target.result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains("costs")) {
          var objectStore = db.createObjectStore("costs", {
            keyPath: "id",
            autoIncrement: true,
          });

          // Note: IndexedDB doesn't support nested property paths in compound indexes
          // We'll query all records and filter in JavaScript for year/month matching
        }
      };
    });
  }

  // Expose idb object globally
  if (typeof window !== "undefined") {
    window.idb = {
      openCostsDB: openCostsDB,
    };
  }
})();
