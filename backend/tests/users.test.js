const request = require('supertest');
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/database');
const User = require('../src/models/User');
const Cost = require('../src/models/Cost');
const app = require('../app_users');

// Test database connection
beforeAll(async () => {
  // Use a test database URI or mock connection
  if (process.env.MONGO_URI_TEST) {
    await mongoose.connect(process.env.MONGO_URI_TEST);
  } else {
    // For testing, we'll use the same connection
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

describe('User Endpoints', () => {
  describe('POST /api/add', () => {
    test('should create a new user with valid data', async () => {
      const userData = {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        birthday: '1990-01-01'
      };

      const response = await request(app)
        .post('/api/add')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).toHaveProperty('first_name', 'John');
      expect(response.body).toHaveProperty('last_name', 'Doe');
    });

    test('should return error when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/add')
        .send({ id: 1 })
        .expect(400);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('message');
      expect(response.body.id).toBe('VALIDATION_ERROR');
    });

    test('should return error when id is not a number', async () => {
      const userData = {
        id: 'not-a-number',
        first_name: 'John',
        last_name: 'Doe',
        birthday: '1990-01-01'
      };

      const response = await request(app)
        .post('/api/add')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
    });

    test('should return error when birthday is invalid', async () => {
      const userData = {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        birthday: 'invalid-date'
      };

      const response = await request(app)
        .post('/api/add')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
    });

    test('should return error when user with same id already exists', async () => {
      const userData = {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        birthday: '1990-01-01'
      };

      // Create first user
      await request(app)
        .post('/api/add')
        .send(userData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/add')
        .send(userData)
        .expect(409);

      expect(response.body).toHaveProperty('id', 'DUPLICATE_ERROR');
    });
  });

  describe('GET /api/users', () => {
    test('should return all users', async () => {
      // Create test users with unique emails to avoid sparse index issues
      // Note: Users with email don't need password if created directly (not through API)
      await User.create({
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        birthday: new Date('1990-01-01'),
        email: 'john@example.com',
        password: 'password123' // Required when email is provided
      });

      await User.create({
        id: 2,
        first_name: 'Jane',
        last_name: 'Smith',
        birthday: new Date('1992-05-15'),
        email: 'jane@example.com',
        password: 'password123' // Required when email is provided
      });

      const response = await request(app)
        .get('/api/users')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('first_name');
      expect(response.body[0]).toHaveProperty('last_name');
    });

    test('should return empty array when no users exist', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/users/:id', () => {
    test('should return user with total costs', async () => {
      // Create user
      await User.create({
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        birthday: new Date('1990-01-01')
      });

      // Create costs for user
      await Cost.create({
        type: 'expense',
        description: 'Lunch',
        category: 'food',
        userid: 1,
        sum: 50
      });

      await Cost.create({
        type: 'expense',
        description: 'Book',
        category: 'education',
        userid: 1,
        sum: 100
      });

      const response = await request(app)
        .get('/api/users/1')
        .expect(200);

      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).toHaveProperty('first_name', 'John');
      expect(response.body).toHaveProperty('last_name', 'Doe');
      expect(response.body).toHaveProperty('total', 150); // Backward compatibility
      expect(response.body).toHaveProperty('total_expenses', 150);
      expect(response.body).toHaveProperty('total_income', 0);
      expect(response.body).toHaveProperty('balance', -150);
    });

    test('should return error when user not found', async () => {
      const response = await request(app)
        .get('/api/users/999')
        .expect(404);

      expect(response.body).toHaveProperty('id', 'NOT_FOUND');
      expect(response.body).toHaveProperty('message');
    });

    test('should return error when id is invalid', async () => {
      const response = await request(app)
        .get('/api/users/invalid')
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
    });

    test('should return total of 0 when user has no costs', async () => {
      await User.create({
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        birthday: new Date('1990-01-01')
      });

      const response = await request(app)
        .get('/api/users/1')
        .expect(200);

      expect(response.body).toHaveProperty('total', 0);
    });
  });

  describe('POST /api/register', () => {
    test('should register a new user with valid data', async () => {
      const userData = {
        id: 2,
        first_name: 'Jane',
        last_name: 'Smith',
        birthday: '1992-05-15',
        email: 'jane@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('id', 2);
      expect(response.body.user).toHaveProperty('email', 'jane@example.com');
      expect(response.body.user).not.toHaveProperty('password');
    });

    test('should return error when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({ id: 2 })
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
    });

    test('should return error when email format is invalid', async () => {
      const userData = {
        id: 2,
        first_name: 'Jane',
        last_name: 'Smith',
        birthday: '1992-05-15',
        email: 'invalid-email',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
    });

    test('should return error when password is too short', async () => {
      const userData = {
        id: 2,
        first_name: 'Jane',
        last_name: 'Smith',
        birthday: '1992-05-15',
        email: 'jane@example.com',
        password: '12345'
      };

      const response = await request(app)
        .post('/api/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
    });

    test('should return error when user with same id already exists', async () => {
      await User.create({
        id: 2,
        first_name: 'John',
        last_name: 'Doe',
        birthday: new Date('1990-01-01')
      });

      const userData = {
        id: 2,
        first_name: 'Jane',
        last_name: 'Smith',
        birthday: '1992-05-15',
        email: 'jane@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/register')
        .send(userData)
        .expect(409);

      expect(response.body).toHaveProperty('id', 'DUPLICATE_ERROR');
    });

    test('should return error when user with same email already exists', async () => {
      await User.create({
        id: 2,
        first_name: 'John',
        last_name: 'Doe',
        birthday: new Date('1990-01-01'),
        email: 'jane@example.com',
        password: 'password123'
      });

      const userData = {
        id: 3,
        first_name: 'Jane',
        last_name: 'Smith',
        birthday: '1992-05-15',
        email: 'jane@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/register')
        .send(userData)
        .expect(409);

      expect(response.body).toHaveProperty('id', 'DUPLICATE_ERROR');
    });
  });

  describe('POST /api/login', () => {
    beforeEach(async () => {
      // Create a user with email and password for login tests
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);
      await User.create({
        id: 2,
        first_name: 'Jane',
        last_name: 'Smith',
        birthday: new Date('1992-05-15'),
        email: 'jane@example.com',
        password: hashedPassword
      });
    });

    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          email: 'jane@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', 'jane@example.com');
      expect(response.body.user).not.toHaveProperty('password');
    });

    test('should return error when email is missing', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({ password: 'password123' })
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
    });

    test('should return error when password is missing', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({ email: 'jane@example.com' })
        .expect(400);

      expect(response.body).toHaveProperty('id', 'VALIDATION_ERROR');
    });

    test('should return error when email does not exist', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        })
        .expect(401);

      expect(response.body).toHaveProperty('id', 'UNAUTHORIZED');
    });

    test('should return error when password is incorrect', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          email: 'jane@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('id', 'UNAUTHORIZED');
    });

    test('should return error when user does not have password (not registered)', async () => {
      // Create user without password
      await User.create({
        id: 3,
        first_name: 'Bob',
        last_name: 'Jones',
        birthday: new Date('1985-03-20')
      });

      const response = await request(app)
        .post('/api/login')
        .send({
          email: 'bob@example.com',
          password: 'password123'
        })
        .expect(401);

      expect(response.body).toHaveProperty('id', 'UNAUTHORIZED');
    });
  });

  describe('GET /api/users/me', () => {
    test('should return current user when authenticated', async () => {
      // Register a user first
      const registerResponse = await request(app)
        .post('/api/register')
        .send({
          id: 3,
          first_name: 'Bob',
          last_name: 'Jones',
          birthday: '1985-03-20',
          email: 'bob@example.com',
          password: 'password123'
        })
        .expect(201);

      const token = registerResponse.body.token;

      // Get current user
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', 3);
      expect(response.body).toHaveProperty('first_name', 'Bob');
      expect(response.body).toHaveProperty('email', 'bob@example.com');
      expect(response.body).not.toHaveProperty('password');
    });

    test('should return user with cost totals when authenticated', async () => {
      // Register a user
      const registerResponse = await request(app)
        .post('/api/register')
        .send({
          id: 4,
          first_name: 'Alice',
          last_name: 'Brown',
          birthday: '1990-01-01',
          email: 'alice@example.com',
          password: 'password123'
        })
        .expect(201);

      const token = registerResponse.body.token;

      // Create costs
      await Cost.create({
        type: 'income',
        description: 'Salary',
        category: 'salary',
        userid: 4,
        sum: 5000
      });

      await Cost.create({
        type: 'expense',
        description: 'Lunch',
        category: 'food',
        userid: 4,
        sum: 100
      });

      // Get current user
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('total_income', 5000);
      expect(response.body).toHaveProperty('total_expenses', 100);
      expect(response.body).toHaveProperty('balance', 4900);
    });

    test('should return error when not authenticated', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .expect(401);

      expect(response.body).toHaveProperty('id', 'UNAUTHORIZED');
    });

    test('should return error when token is invalid', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('id', 'UNAUTHORIZED');
    });
  });
});

