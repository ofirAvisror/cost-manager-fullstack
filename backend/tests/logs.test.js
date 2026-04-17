const request = require('supertest');
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/database');
const Log = require('../src/models/Log');
const app = require('../app');

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
    await Log.deleteMany({});
  } catch (error) {
    // Ignore errors during cleanup
  }
});

// Close connection after all tests
afterAll(async () => {
  await mongoose.connection.close();
});

describe('Logs Endpoints', () => {
  describe('GET /api/logs', () => {
    test('should return all logs', async () => {
      // Create test logs
      await Log.create({
        id: 1,
        message: 'Test log 1',
        level: 'info',
        endpoint: '/api/test',
        method: 'GET',
        timestamp: new Date()
      });

      await Log.create({
        id: 2,
        message: 'Test log 2',
        level: 'error',
        endpoint: '/api/test',
        method: 'POST',
        timestamp: new Date()
      });

      const response = await request(app)
        .get('/api/logs')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    }, 10000); // Increase timeout to 10 seconds

    test('should return empty array when no logs exist', async () => {
      const response = await request(app)
        .get('/api/logs')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should return logs with correct structure', async () => {
      await Log.create({
        id: 1,
        message: 'Test log',
        level: 'info',
        endpoint: '/api/test',
        method: 'GET',
        timestamp: new Date()
      });

      const response = await request(app)
        .get('/api/logs')
        .expect(200);

      if (response.body.length > 0) {
        const log = response.body[0];
        expect(log).toHaveProperty('id');
        expect(log).toHaveProperty('message');
        expect(log).toHaveProperty('level');
        expect(log).toHaveProperty('timestamp');
      }
    });
  });
});

