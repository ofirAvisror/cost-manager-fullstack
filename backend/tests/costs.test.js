const request = require('supertest');
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/database');
const User = require('../src/models/User');
const Cost = require('../src/models/Cost');
const app = require('../app_costs');

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

describe('Cost Endpoints', () => {
  // Create a test user before each test
  beforeEach(async () => {
    await User.create({
      id: 1,
      first_name: 'John',
      last_name: 'Doe',
      birthday: new Date('1990-01-01')
    });
  });

  describe('POST /api/add', () => {
    test('should create a new cost with valid data', async () => {
      const costData = {
        type: 'expense',
        description: 'Lunch at restaurant',
        category: 'food',
        userid: 1,
        sum: 85.50
      };

      const response = await request(app)
        .post('/api/add')
        .send(costData)
        .expect(201);

      expect(response.body).toHaveProperty('description', 'Lunch at restaurant');
      expect(response.body).toHaveProperty('category', 'food');
      expect(response.body).toHaveProperty('userid', 1);
      expect(response.body).toHaveProperty('sum', 85.50);
    });

    test('should return error when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/add')
        .send({ description: 'Test' })
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
      expect(response.body).toHaveProperty('message');
    });

    test('should return error when category is invalid', async () => {
      const costData = {
        type: 'expense',
        description: 'Test',
        category: 'invalid_category',
        userid: 1,
        sum: 100
      };

      const response = await request(app)
        .post('/api/add')
        .send(costData)
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
    });

    test('should return error when user does not exist', async () => {
      const costData = {
        type: 'expense',
        description: 'Test',
        category: 'food',
        userid: 999,
        sum: 100
      };

      const response = await request(app)
        .post('/api/add')
        .send(costData)
        .expect(404);

      expect(response.body).toHaveProperty('id', 'NOT_FOUND');
    });

    test('should return error when sum is negative', async () => {
      const costData = {
        type: 'expense',
        description: 'Test',
        category: 'food',
        userid: 1,
        sum: -100
      };

      const response = await request(app)
        .post('/api/add')
        .send(costData)
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
    });

    test('should return error when sum is not a number', async () => {
      const costData = {
        type: 'expense',
        description: 'Test',
        category: 'food',
        userid: 1,
        sum: 'not-a-number'
      };

      const response = await request(app)
        .post('/api/add')
        .send(costData)
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
    });

    test('should return error when trying to add cost with past date', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Yesterday

      const costData = {
        type: 'expense',
        description: 'Test',
        category: 'food',
        userid: 1,
        sum: 100,
        created_at: pastDate.toISOString()
      };

      const response = await request(app)
        .post('/api/add')
        .send(costData)
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
      expect(response.body.message).toContain('past');
    });

    test('should accept cost with future date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1); // Tomorrow

      const costData = {
        type: 'expense',
        description: 'Test',
        category: 'food',
        userid: 1,
        sum: 100,
        created_at: futureDate.toISOString()
      };

      const response = await request(app)
        .post('/api/add')
        .send(costData)
        .expect(201);

      expect(response.body).toHaveProperty('created_at');
    });

    test('should use current date when created_at is not provided', async () => {
      const costData = {
        type: 'expense',
        description: 'Test',
        category: 'food',
        userid: 1,
        sum: 100
      };

      const response = await request(app)
        .post('/api/add')
        .send(costData)
        .expect(201);

      expect(response.body).toHaveProperty('created_at');
      const createdDate = new Date(response.body.created_at);
      const now = new Date();
      // Allow 5 seconds difference for test execution time
      expect(Math.abs(createdDate - now)).toBeLessThan(5000);
    });

    test('should accept all valid categories', async () => {
      const categories = ['food', 'health', 'housing', 'sports', 'education'];

      for (const category of categories) {
        const costData = {
          type: 'expense',
          description: `Test ${category}`,
          category: category,
          userid: 1,
          sum: 100
        };

        const response = await request(app)
          .post('/api/add')
          .send(costData)
          .expect(201);

        expect(response.body).toHaveProperty('category', category);
      }
    });
  });
});

