/**
 * chartHelpers.js - Helper functions for generating chart data
 */

/**
 * Gets pie chart data grouped by category for a specific month and year
 * @param {number} year - The year
 * @param {number} month - The month (1-12)
 * @param {string} currency - The target currency
 * @param {Object} db - The database instance
 * @returns {Promise<Array<{name: string, value: number}>>} Promise that resolves to array of pie chart data items
 */
export async function getPieChartData(year, month, currency, db) {
  const report = await db.getReport(year, month, currency);
  
  // Group costs by category and sum them
  const categoryTotals = {};
  
  report.costs.forEach(function(cost) {
    if (categoryTotals[cost.category]) {
      categoryTotals[cost.category] += cost.sum;
    } else {
      categoryTotals[cost.category] = cost.sum;
    }
  });
  
  // Convert to array format for pie chart
  const pieData = Object.keys(categoryTotals).map(function(category) {
    return {
      name: category,
      value: categoryTotals[category]
    };
  });
  
  return pieData;
}

/**
 * Gets bar chart data showing total costs grouped by months or days in a date range
 * @param {Date} startDate - The start date
 * @param {Date} endDate - The end date
 * @param {string} currency - The target currency
 * @param {Object} db - The database instance
 * @param {string} groupBy - 'months' or 'days'
 * @returns {Promise<Array<{month: string, day: string, total: number}>>} Promise that resolves to array of bar chart data items
 */
export async function getBarChartData(startDate, endDate, currency, db, groupBy = 'months') {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Fetch exchange rates
  const exchangeRateUrl =
    localStorage.getItem("exchangeRateUrl") ||
    process.env.REACT_APP_EXCHANGE_RATE_URL ||
    "https://gist.githubusercontent.com/Pafestivo/e4e1c962472306b578983a6a0c40828e/raw/exchange-rates.json";
  
  const ratesResponse = await fetch(exchangeRateUrl);
  const rates = await ratesResponse.json();
  
  if (groupBy === 'days') {
    // Group by days
    const allCosts = await db.getCostsByDateRange(
      {
        year: startDate.getFullYear(),
        month: startDate.getMonth() + 1,
        day: startDate.getDate()
      },
      {
        year: endDate.getFullYear(),
        month: endDate.getMonth() + 1,
        day: endDate.getDate()
      }
    );
    
    // Group costs by day
    const dayTotals = {};
    
    allCosts.forEach(function(cost) {
      const dateKey = `${cost.date.year}-${cost.date.month.toString().padStart(2, '0')}-${cost.date.day.toString().padStart(2, '0')}`;
      
      // Convert to target currency
      const amountInUSD = cost.sum / rates[cost.currency];
      const convertedAmount = amountInUSD * rates[currency];
      
      // Only count expenses for the total
      const type = cost.type || 'expense';
      if (type === 'expense') {
        if (dayTotals[dateKey]) {
          dayTotals[dateKey] += convertedAmount;
        } else {
          dayTotals[dateKey] = convertedAmount;
        }
      }
    });
    
    // Generate all days in range
    const allDays = [];
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    while (current <= end) {
      const dateKey = `${current.getFullYear()}-${(current.getMonth() + 1).toString().padStart(2, '0')}-${current.getDate().toString().padStart(2, '0')}`;
      allDays.push({
        dateKey: dateKey,
        year: current.getFullYear(),
        month: current.getMonth() + 1,
        day: current.getDate()
      });
      
      // Move to next day
      current.setDate(current.getDate() + 1);
    }
    
    // Convert to array with all days (including days with no data)
    const barData = allDays.map(function(dayInfo) {
      const total = dayTotals[dayInfo.dateKey] || 0;
      return {
        day: `${dayInfo.day.toString().padStart(2, '0')}/${dayInfo.month.toString().padStart(2, '0')}/${dayInfo.year}`,
        month: dayInfo.dateKey, // Keep for backward compatibility
        total: total
      };
    });
    
    return barData;
  } else {
    // Group by months (existing logic)
    const months = [];
    const current = new Date(startDate);
    current.setDate(1); // Set to first day of month
    
    while (current <= endDate) {
      months.push({
        year: current.getFullYear(),
        month: current.getMonth() + 1,
        monthName: monthNames[current.getMonth()]
      });
      
      // Move to next month
      current.setMonth(current.getMonth() + 1);
    }
    
    // Get reports for all months in range
    const reportPromises = months.map(function(monthInfo) {
      return db.getReport(monthInfo.year, monthInfo.month, currency);
    });
    
    const reports = await Promise.all(reportPromises);
    
    // Convert to bar chart data format
    const barData = reports.map(function(report, index) {
      const monthInfo = months[index];
      return {
        month: `${monthInfo.monthName} ${monthInfo.year}`,
        day: `${monthInfo.monthName} ${monthInfo.year}`, // Keep for backward compatibility
        total: report.totals ? report.totals.expenses : report.total.total
      };
    });
    
    return barData;
  }
}


