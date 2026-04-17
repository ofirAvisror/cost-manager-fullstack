const request = require('supertest');
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/database');
const User = require('../src/models/User');
const Cost = require('../src/models/Cost');
const Report = require('../src/models/Report');
const app = require('../app_report');

// Test database connection
beforeAll(async () => {
  if (process.env.MONGO_URI_TEST) {
    await mongoose.connect(process.env.MONGO_URI_TEST);
  } else {
    await connectDB();
  }
});

// Clean up after each test
afterEach(async () => {
  try {
    await User.deleteMany({});
    await Cost.deleteMany({});
    await Report.deleteMany({});
  } catch (error) {
    // Ignore errors during cleanup
  }
});

// Close connection after all tests
afterAll(async () => {
  await mongoose.connection.close();
});

describe('Report Endpoints', () => {
  beforeEach(async () => {
    // Create test user
    await User.create({
      id: 1,
      first_name: 'John',
      last_name: 'Doe',
      birthday: new Date('1990-01-01')
    });
  });

  describe('GET /api/report', () => {
    test('should return report with correct format', async () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      // Create test costs
      await Cost.create({
        type: 'expense',
        description: 'Lunch',
        category: 'food',
        userid: 1,
        sum: 50,
        created_at: new Date(year, month - 1, 15)
      });

      await Cost.create({
        type: 'expense',
        description: 'Book',
        category: 'education',
        userid: 1,
        sum: 100,
        created_at: new Date(year, month - 1, 20)
      });

      const response = await request(app)
        .get(`/api/report?id=1&year=${year}&month=${month}`)
        .expect(200);

      expect(response.body).toHaveProperty('userid', 1);
      expect(response.body).toHaveProperty('year', year);
      expect(response.body).toHaveProperty('month', month);
      expect(response.body).toHaveProperty('costs'); // Backward compatibility
      expect(response.body).toHaveProperty('expenses');
      expect(response.body).toHaveProperty('income');
      expect(response.body).toHaveProperty('summary');
      expect(Array.isArray(response.body.costs)).toBe(true);
      expect(Array.isArray(response.body.expenses)).toBe(true);
      expect(Array.isArray(response.body.income)).toBe(true);
    });

    test('should return all categories even when empty', async () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const response = await request(app)
        .get(`/api/report?id=1&year=${year}&month=${month}`)
        .expect(200);

      expect(response.body.costs.length).toBe(5); // All 5 expense categories
      expect(response.body.expenses.length).toBe(5);
      expect(response.body.income.length).toBe(6); // All 6 income categories
      const expenseCategories = ['food', 'education', 'health', 'housing', 'sports'];
      expenseCategories.forEach(category => {
        const categoryObj = response.body.costs.find(c => c[category] !== undefined);
        expect(categoryObj).toBeDefined();
        expect(Array.isArray(categoryObj[category])).toBe(true);
      });
    });

    test('should return error when required parameters are missing', async () => {
      const response = await request(app)
        .get('/api/report')
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
    });

    test('should return error when user not found', async () => {
      const response = await request(app)
        .get('/api/report?id=999&year=2025&month=1')
        .expect(404);

      expect(response.body).toHaveProperty('id', 'NOT_FOUND');
    });

    test('should return error when month is invalid', async () => {
      const response = await request(app)
        .get('/api/report?id=1&year=2025&month=13')
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
    });

    test('should return error when month is less than 1', async () => {
      const response = await request(app)
        .get('/api/report?id=1&year=2025&month=0')
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
    });

    test('should include day in cost items', async () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      await Cost.create({
        type: 'expense',
        description: 'Lunch',
        category: 'food',
        userid: 1,
        sum: 50,
        created_at: new Date(year, month - 1, 17)
      });

      const response = await request(app)
        .get(`/api/report?id=1&year=${year}&month=${month}`)
        .expect(200);

      const foodCategory = response.body.costs.find(c => c.food !== undefined);
      expect(foodCategory).toBeDefined();
      expect(foodCategory.food.length).toBe(1);
      expect(foodCategory.food[0]).toHaveProperty('day', 17);
      expect(foodCategory.food[0]).toHaveProperty('sum', 50);
      expect(foodCategory.food[0]).toHaveProperty('description', 'Lunch');
    });

    test('should cache reports for past months', async () => {
      const now = new Date();
      let pastMonthIndex = now.getMonth(); // 0-11 (current month index)
      let pastYear = now.getFullYear();
      
      // Calculate previous month
      if (pastMonthIndex === 0) {
        // If current month is January (0), previous month is December (12) of previous year
        pastMonthIndex = 11; // December index
        pastYear = pastYear - 1;
      } else {
        pastMonthIndex = pastMonthIndex - 1;
      }
      
      // Convert to 1-12 format for API (pastMonthIndex is 0-11, we need 1-12)
      const pastMonth = pastMonthIndex + 1;

      // Create cost in past month (Date constructor uses 0-11 for months)
      await Cost.create({
        type: 'expense',
        description: 'Past expense',
        category: 'food',
        userid: 1,
        sum: 50,
        created_at: new Date(pastYear, pastMonthIndex, 15)
      });

      // First request - should generate and cache
      const response1 = await request(app)
        .get(`/api/report?id=1&year=${pastYear}&month=${pastMonth}`)
        .expect(200);

      expect(response1.body).toHaveProperty('userid', 1);

      // Check that report was cached
      const cachedReport = await Report.findOne({
        userid: 1,
        year: pastYear,
        month: pastMonth
      });
      expect(cachedReport).toBeDefined();

      // Second request - should return from cache
      const response2 = await request(app)
        .get(`/api/report?id=1&year=${pastYear}&month=${pastMonth}`)
        .expect(200);

      expect(response2.body).toHaveProperty('userid', 1);
    });
  });
});

