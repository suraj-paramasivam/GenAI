import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../server.js';

describe('Authentication Flow', () => {
  it('POST /api/login with valid credentials should return 200 and set cookie', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'testuser', password: 'testpass' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toContain('auth_token');
  });

  it('POST /api/login with invalid credentials should return 401', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'testuser', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid username or password.');
  });

  it('POST /api/login with missing fields should return 400', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'testuser' });

    expect(res.status).toBe(400);
  });

  it('GET / should redirect to /login when unauthenticated', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(302);
    expect(res.header.location).toBe('/login');
  });

  it('POST /api/logout should clear cookie', async () => {
    const res = await request(app).post('/api/logout');
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'][0]).toContain('auth_token=;');
  });
});
