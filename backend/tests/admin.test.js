const request = require('supertest');
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/database');
const app = require('../app_admin');

// Test database connection
beforeAll(async () => {
  if (process.env.MONGO_URI_TEST) {
    await mongoose.connect(process.env.MONGO_URI_TEST);
  } else {
    await connectDB();
  }
});

// Close connection after all tests
afterAll(async () => {
  await mongoose.connection.close();
});

describe('Admin Endpoints', () => {
  describe('GET /api/about', () => {
    test('should return team members with first_name and last_name only', async () => {
      const response = await request(app)
        .get('/api/about')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Check that each team member has only first_name and last_name
      response.body.forEach(member => {
        expect(member).toHaveProperty('first_name');
        expect(member).toHaveProperty('last_name');
        expect(Object.keys(member).length).toBe(2);
      });
    });

    test('should return valid team member data', async () => {
      const response = await request(app)
        .get('/api/about')
        .expect(200);

      response.body.forEach(member => {
        expect(typeof member.first_name).toBe('string');
        expect(typeof member.last_name).toBe('string');
        expect(member.first_name.length).toBeGreaterThan(0);
        expect(member.last_name.length).toBeGreaterThan(0);
      });
    });
  });
});

