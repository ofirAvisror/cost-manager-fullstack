const request = require('supertest');
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/database');
const User = require('../src/models/User');
const Goal = require('../src/models/Goal');
const app = require('../app_goals');

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
    await Goal.deleteMany({});
  } catch (error) {
    // Ignore errors during cleanup
  }
});

// Close connection after all tests
afterAll(async () => {
  await mongoose.connection.close();
});

describe('Goal Endpoints', () => {
  // Create a test user before each test
  beforeEach(async () => {
    await User.create({
      id: 1,
      first_name: 'John',
      last_name: 'Doe',
      birthday: new Date('1990-01-01')
    });
  });

  describe('POST /api/goals', () => {
    test('should create a new goal with valid data', async () => {
      const goalData = {
        userid: 1,
        title: 'Save for vacation',
        target_amount: 10000,
        current_amount: 2000
      };

      const response = await request(app)
        .post('/api/goals')
        .send(goalData)
        .expect(201);

      expect(response.body).toHaveProperty('userid', 1);
      expect(response.body).toHaveProperty('title', 'Save for vacation');
      expect(response.body).toHaveProperty('target_amount', 10000);
      expect(response.body).toHaveProperty('current_amount', 2000);
      expect(response.body).toHaveProperty('status', 'active');
    });

    test('should create goal with deadline', async () => {
      const goalData = {
        userid: 1,
        title: 'Buy a car',
        target_amount: 50000,
        deadline: '2025-12-31'
      };

      const response = await request(app)
        .post('/api/goals')
        .send(goalData)
        .expect(201);

      expect(response.body).toHaveProperty('deadline');
    });

    test('should return error when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/goals')
        .send({ userid: 1 })
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
    });

    test('should return error when target_amount is invalid', async () => {
      const goalData = {
        userid: 1,
        title: 'Test',
        target_amount: -1000
      };

      const response = await request(app)
        .post('/api/goals')
        .send(goalData)
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
    });

    test('should return error when user does not exist', async () => {
      const goalData = {
        userid: 999,
        title: 'Test',
        target_amount: 1000
      };

      const response = await request(app)
        .post('/api/goals')
        .send(goalData)
        .expect(404);

      expect(response.body).toHaveProperty('id', 'NOT_FOUND');
    });
  });

  describe('GET /api/goals', () => {
    test('should return goals for a user', async () => {
      await Goal.create({
        userid: 1,
        title: 'Goal 1',
        target_amount: 1000
      });

      await Goal.create({
        userid: 1,
        title: 'Goal 2',
        target_amount: 2000
      });

      const response = await request(app)
        .get('/api/goals?userid=1')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    test('should filter goals by status', async () => {
      await Goal.create({
        userid: 1,
        title: 'Active Goal',
        target_amount: 1000,
        status: 'active'
      });

      await Goal.create({
        userid: 1,
        title: 'Completed Goal',
        target_amount: 2000,
        status: 'completed'
      });

      const response = await request(app)
        .get('/api/goals?userid=1&status=active')
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty('status', 'active');
    });

    test('should return error when userid is missing', async () => {
      const response = await request(app)
        .get('/api/goals')
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
    });
  });

  describe('PUT /api/goals/:id', () => {
    test('should update a goal', async () => {
      const goal = await Goal.create({
        userid: 1,
        title: 'Original Goal',
        target_amount: 1000
      });

      const response = await request(app)
        .put(`/api/goals/${goal._id}`)
        .send({ title: 'Updated Goal', current_amount: 500 })
        .expect(200);

      expect(response.body).toHaveProperty('title', 'Updated Goal');
      expect(response.body).toHaveProperty('current_amount', 500);
    });

    test('should return error when goal not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/goals/${fakeId}`)
        .send({ title: 'Updated' })
        .expect(404);

      expect(response.body).toHaveProperty('id', 'NOT_FOUND');
    });
  });

  describe('DELETE /api/goals/:id', () => {
    test('should delete a goal', async () => {
      const goal = await Goal.create({
        userid: 1,
        title: 'Goal to delete',
        target_amount: 1000
      });

      await request(app)
        .delete(`/api/goals/${goal._id}`)
        .expect(204);

      const deleted = await Goal.findById(goal._id);
      expect(deleted).toBeNull();
    });

    test('should return error when goal not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/goals/${fakeId}`)
        .expect(404);

      expect(response.body).toHaveProperty('id', 'NOT_FOUND');
    });
  });

  describe('GET /api/goals/:id/progress', () => {
    test('should return goal progress', async () => {
      const goal = await Goal.create({
        userid: 1,
        title: 'Test Goal',
        target_amount: 1000,
        current_amount: 500
      });

      const response = await request(app)
        .get(`/api/goals/${goal._id}/progress`)
        .expect(200);

      expect(response.body).toHaveProperty('progress_percentage', 50);
      expect(response.body).toHaveProperty('remaining', 500);
      expect(response.body).toHaveProperty('is_completed', false);
    });

    test('should return 100% progress when goal is completed', async () => {
      const goal = await Goal.create({
        userid: 1,
        title: 'Completed Goal',
        target_amount: 1000,
        current_amount: 1000
      });

      const response = await request(app)
        .get(`/api/goals/${goal._id}/progress`)
        .expect(200);

      expect(response.body).toHaveProperty('progress_percentage', 100);
      expect(response.body).toHaveProperty('is_completed', true);
    });

    test('should return error when goal not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/goals/${fakeId}/progress`)
        .expect(404);

      expect(response.body).toHaveProperty('id', 'NOT_FOUND');
    });
  });
});



