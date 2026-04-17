const request = require('supertest');
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/database');
const User = require('../src/models/User');
const Cost = require('../src/models/Cost');
const app = require('../app_analytics');

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
  } catch (error) {
    // Ignore errors during cleanup
  }
});

// Close connection after all tests
afterAll(async () => {
  await mongoose.connection.close();
});

describe('Analytics Endpoints', () => {
  // Create a test user before each test
  beforeEach(async () => {
    await User.create({
      id: 1,
      first_name: 'John',
      last_name: 'Doe',
      birthday: new Date('1990-01-01')
    });
  });

  describe('GET /api/analytics/summary', () => {
    test('should return financial summary', async () => {
      // Create costs
      await Cost.create({
        type: 'income',
        description: 'Salary',
        category: 'salary',
        userid: 1,
        sum: 5000
      });

      await Cost.create({
        type: 'expense',
        description: 'Lunch',
        category: 'food',
        userid: 1,
        sum: 100
      });

      const response = await request(app)
        .get('/api/analytics/summary?userid=1')
        .expect(200);

      expect(response.body).toHaveProperty('total_income', 5000);
      expect(response.body).toHaveProperty('total_expenses', 100);
      expect(response.body).toHaveProperty('balance', 4900);
      expect(response.body).toHaveProperty('cost_count', 2);
    });

    test('should return error when userid is missing', async () => {
      const response = await request(app)
        .get('/api/analytics/summary')
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
    });

    test('should return error when user not found', async () => {
      const response = await request(app)
        .get('/api/analytics/summary?userid=999')
        .expect(404);

      expect(response.body).toHaveProperty('id', 'NOT_FOUND');
    });
  });

  describe('GET /api/analytics/trends', () => {
    test('should return monthly trends', async () => {
      const year = 2025;
      
      // Create costs for different months
      await Cost.create({
        type: 'income',
        description: 'Salary',
        category: 'salary',
        userid: 1,
        sum: 5000,
        created_at: new Date(year, 0, 15) // January
      });

      await Cost.create({
        type: 'expense',
        description: 'Lunch',
        category: 'food',
        userid: 1,
        sum: 100,
        created_at: new Date(year, 0, 20) // January
      });

      await Cost.create({
        type: 'income',
        description: 'Freelance',
        category: 'freelance',
        userid: 1,
        sum: 2000,
        created_at: new Date(year, 1, 10) // February
      });

      const response = await request(app)
        .get(`/api/analytics/trends?userid=1&year=${year}`)
        .expect(200);

      expect(response.body).toHaveProperty('year', year);
      expect(response.body).toHaveProperty('trends');
      expect(Array.isArray(response.body.trends)).toBe(true);
      expect(response.body.trends.length).toBe(12);
      
      // Check January data
      const january = response.body.trends.find(t => t.month === 1);
      expect(january).toHaveProperty('income', 5000);
      expect(january).toHaveProperty('expenses', 100);
    });

    test('should return error when userid is missing', async () => {
      const response = await request(app)
        .get('/api/analytics/trends')
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
    });
  });

  describe('GET /api/analytics/categories', () => {
    test('should return category breakdown', async () => {
      await Cost.create({
        type: 'expense',
        description: 'Lunch',
        category: 'food',
        userid: 1,
        sum: 100
      });

      await Cost.create({
        type: 'expense',
        description: 'Dinner',
        category: 'food',
        userid: 1,
        sum: 200
      });

      await Cost.create({
        type: 'expense',
        description: 'Gym',
        category: 'sports',
        userid: 1,
        sum: 300
      });

      const response = await request(app)
        .get('/api/analytics/categories?userid=1&type=expense')
        .expect(200);

      expect(response.body).toHaveProperty('type', 'expense');
      expect(response.body).toHaveProperty('total', 600);
      expect(response.body).toHaveProperty('breakdown');
      expect(Array.isArray(response.body.breakdown)).toBe(true);
      
      const foodCategory = response.body.breakdown.find(c => c.category === 'food');
      expect(foodCategory).toHaveProperty('sum', 300);
      expect(foodCategory).toHaveProperty('count', 2);
    });

    test('should filter by year and month', async () => {
      const year = 2025;
      const month = 1;

      await Cost.create({
        type: 'expense',
        description: 'Lunch',
        category: 'food',
        userid: 1,
        sum: 100,
        created_at: new Date(year, month - 1, 15)
      });

      const response = await request(app)
        .get(`/api/analytics/categories?userid=1&type=expense&year=${year}&month=${month}`)
        .expect(200);

      expect(response.body).toHaveProperty('total', 100);
    });
  });

  describe('GET /api/analytics/comparison', () => {
    test('should return month-over-month comparison', async () => {
      const year = 2025;
      const month = 2; // February

      // Current month costs
      await Cost.create({
        type: 'income',
        description: 'Salary',
        category: 'salary',
        userid: 1,
        sum: 5000,
        created_at: new Date(year, month - 1, 15)
      });

      await Cost.create({
        type: 'expense',
        description: 'Lunch',
        category: 'food',
        userid: 1,
        sum: 100,
        created_at: new Date(year, month - 1, 20)
      });

      // Previous month costs
      await Cost.create({
        type: 'income',
        description: 'Salary',
        category: 'salary',
        userid: 1,
        sum: 4000,
        created_at: new Date(year, month - 2, 15)
      });

      const response = await request(app)
        .get(`/api/analytics/comparison?userid=1&year=${year}&month=${month}`)
        .expect(200);

      expect(response.body).toHaveProperty('current_month');
      expect(response.body).toHaveProperty('previous_month');
      expect(response.body).toHaveProperty('changes');
      expect(response.body.current_month).toHaveProperty('income', 5000);
      expect(response.body.previous_month).toHaveProperty('income', 4000);
    });

    test('should return error when required parameters are missing', async () => {
      const response = await request(app)
        .get('/api/analytics/comparison?userid=1')
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
    });
  });

  describe('GET /api/analytics/yearly', () => {
    test('should return yearly report', async () => {
      const year = 2025;

      // Create costs for different months
      await Cost.create({
        type: 'income',
        description: 'Salary',
        category: 'salary',
        userid: 1,
        sum: 5000,
        created_at: new Date(year, 0, 15) // January
      });

      await Cost.create({
        type: 'expense',
        description: 'Lunch',
        category: 'food',
        userid: 1,
        sum: 100,
        created_at: new Date(year, 0, 20) // January
      });

      await Cost.create({
        type: 'income',
        description: 'Freelance',
        category: 'freelance',
        userid: 1,
        sum: 2000,
        created_at: new Date(year, 1, 10) // February
      });

      const response = await request(app)
        .get(`/api/analytics/yearly?userid=1&year=${year}`)
        .expect(200);

      expect(response.body).toHaveProperty('year', year);
      expect(response.body).toHaveProperty('summary');
      expect(response.body.summary).toHaveProperty('total_income', 7000);
      expect(response.body.summary).toHaveProperty('total_expenses', 100);
      expect(response.body).toHaveProperty('monthly_breakdown');
      expect(response.body).toHaveProperty('category_breakdown');
    });

    test('should return error when required parameters are missing', async () => {
      const response = await request(app)
        .get('/api/analytics/yearly?userid=1')
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
    });
  });
});



