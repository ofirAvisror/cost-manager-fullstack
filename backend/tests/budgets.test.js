const request = require('supertest');
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/database');
const User = require('../src/models/User');
const Budget = require('../src/models/Budget');
const Cost = require('../src/models/Cost');
const app = require('../app_budgets');

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
    await Budget.deleteMany({});
    await Cost.deleteMany({});
  } catch (error) {
    // Ignore errors during cleanup
  }
});

// Close connection after all tests
afterAll(async () => {
  await mongoose.connection.close();
});

describe('Budget Endpoints', () => {
  // Create a test user before each test
  beforeEach(async () => {
    await User.create({
      id: 1,
      first_name: 'John',
      last_name: 'Doe',
      birthday: new Date('1990-01-01')
    });
  });

  describe('POST /api/budgets', () => {
    test('should create a new total budget with valid data', async () => {
      const budgetData = {
        userid: 1,
        year: 2025,
        month: 1,
        type: 'total',
        amount: 5000
      };

      const response = await request(app)
        .post('/api/budgets')
        .send(budgetData)
        .expect(201);

      expect(response.body).toHaveProperty('userid', 1);
      expect(response.body).toHaveProperty('year', 2025);
      expect(response.body).toHaveProperty('month', 1);
      expect(response.body).toHaveProperty('type', 'total');
      expect(response.body).toHaveProperty('amount', 5000);
    });

    test('should create a new category budget with valid data', async () => {
      const budgetData = {
        userid: 1,
        year: 2025,
        month: 1,
        type: 'category',
        category: 'food',
        amount: 1000
      };

      const response = await request(app)
        .post('/api/budgets')
        .send(budgetData)
        .expect(201);

      expect(response.body).toHaveProperty('type', 'category');
      expect(response.body).toHaveProperty('category', 'food');
      expect(response.body).toHaveProperty('amount', 1000);
    });

    test('should return error when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/budgets')
        .send({ userid: 1 })
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
    });

    test('should return error when type is invalid', async () => {
      const budgetData = {
        userid: 1,
        year: 2025,
        month: 1,
        type: 'invalid',
        amount: 1000
      };

      const response = await request(app)
        .post('/api/budgets')
        .send(budgetData)
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
    });

    test('should return error when category is missing for category type', async () => {
      const budgetData = {
        userid: 1,
        year: 2025,
        month: 1,
        type: 'category',
        amount: 1000
      };

      const response = await request(app)
        .post('/api/budgets')
        .send(budgetData)
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
    });

    test('should return error when category is invalid', async () => {
      const budgetData = {
        userid: 1,
        year: 2025,
        month: 1,
        type: 'category',
        category: 'invalid_category',
        amount: 1000
      };

      const response = await request(app)
        .post('/api/budgets')
        .send(budgetData)
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
    });

    test('should return error when user does not exist', async () => {
      const budgetData = {
        userid: 999,
        year: 2025,
        month: 1,
        type: 'total',
        amount: 1000
      };

      const response = await request(app)
        .post('/api/budgets')
        .send(budgetData)
        .expect(404);

      expect(response.body).toHaveProperty('id', 'NOT_FOUND');
    });

    test('should return error when amount is negative', async () => {
      const budgetData = {
        userid: 1,
        year: 2025,
        month: 1,
        type: 'total',
        amount: -1000
      };

      const response = await request(app)
        .post('/api/budgets')
        .send(budgetData)
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
    });

    test('should return error when month is invalid', async () => {
      const budgetData = {
        userid: 1,
        year: 2025,
        month: 13,
        type: 'total',
        amount: 1000
      };

      const response = await request(app)
        .post('/api/budgets')
        .send(budgetData)
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
    });
  });

  describe('GET /api/budgets', () => {
    test('should return budgets for a user', async () => {
      // Create budgets
      await Budget.create({
        userid: 1,
        year: 2025,
        month: 1,
        type: 'total',
        amount: 5000
      });

      await Budget.create({
        userid: 1,
        year: 2025,
        month: 1,
        type: 'category',
        category: 'food',
        amount: 1000
      });

      const response = await request(app)
        .get('/api/budgets?userid=1')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    test('should filter budgets by year and month', async () => {
      await Budget.create({
        userid: 1,
        year: 2025,
        month: 1,
        type: 'total',
        amount: 5000
      });

      await Budget.create({
        userid: 1,
        year: 2025,
        month: 2,
        type: 'total',
        amount: 6000
      });

      const response = await request(app)
        .get('/api/budgets?userid=1&year=2025&month=1')
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty('month', 1);
    });

    test('should return error when userid is missing', async () => {
      const response = await request(app)
        .get('/api/budgets')
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
    });
  });

  describe('PUT /api/budgets/:id', () => {
    test('should update a budget', async () => {
      const budget = await Budget.create({
        userid: 1,
        year: 2025,
        month: 1,
        type: 'total',
        amount: 5000
      });

      const response = await request(app)
        .put(`/api/budgets/${budget._id}`)
        .send({ amount: 6000 })
        .expect(200);

      expect(response.body).toHaveProperty('amount', 6000);
    });

    test('should return error when budget not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/budgets/${fakeId}`)
        .send({ amount: 6000 })
        .expect(404);

      expect(response.body).toHaveProperty('id', 'NOT_FOUND');
    });
  });

  describe('DELETE /api/budgets/:id', () => {
    test('should delete a budget', async () => {
      const budget = await Budget.create({
        userid: 1,
        year: 2025,
        month: 1,
        type: 'total',
        amount: 5000
      });

      await request(app)
        .delete(`/api/budgets/${budget._id}`)
        .expect(204);

      const deleted = await Budget.findById(budget._id);
      expect(deleted).toBeNull();
    });

    test('should return error when budget not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/budgets/${fakeId}`)
        .expect(404);

      expect(response.body).toHaveProperty('id', 'NOT_FOUND');
    });
  });

  describe('GET /api/budgets/status', () => {
    test('should return budget status with expenses', async () => {
      // Create budget
      await Budget.create({
        userid: 1,
        year: 2025,
        month: 1,
        type: 'total',
        amount: 5000
      });

      await Budget.create({
        userid: 1,
        year: 2025,
        month: 1,
        type: 'category',
        category: 'food',
        amount: 1000
      });

      // Create expenses
      await Cost.create({
        type: 'expense',
        description: 'Lunch',
        category: 'food',
        userid: 1,
        sum: 500,
        created_at: new Date(2025, 0, 15)
      });

      const response = await request(app)
        .get('/api/budgets/status?userid=1&year=2025&month=1')
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('categories');
      expect(response.body.total).toHaveProperty('allocated', 5000);
      expect(response.body.total).toHaveProperty('spent', 500);
    });

    test('should return error when required parameters are missing', async () => {
      const response = await request(app)
        .get('/api/budgets/status?userid=1')
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
    });
  });
});



