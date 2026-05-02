import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../server.js';

describe('AI Agent Proxy', () => {
  let authToken;

  beforeEach(async () => {
    // Get a valid token for authenticated requests
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'testuser', password: 'testpass' });
    authToken = res.headers['set-cookie'][0].split(';')[0];
    
    vi.clearAllMocks();
  });

  it('POST /api/ai should return AI response on success', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: 'Hello, I am AI.' }] } }]
      })
    });

    const res = await request(app)
      .post('/api/ai')
      .set('Cookie', [authToken])
      .send({ userMessage: 'Hi', userName: 'Test', tasks: '', chatContext: '' });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe('Hello, I am AI.');
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('gemini-1.5-flash'), expect.any(Object));
  });

  it('POST /api/ai should return 500 if Gemini API fails', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: () => Promise.resolve('Forbidden')
    });

    const res = await request(app)
      .post('/api/ai')
      .set('Cookie', [authToken])
      .send({ userMessage: 'Hi', userName: 'Test', tasks: '', chatContext: '' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('API Error: 403');
  });

  it('POST /api/ai should handle empty responses from Gemini', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ candidates: [] })
    });

    const res = await request(app)
      .post('/api/ai')
      .set('Cookie', [authToken])
      .send({ userMessage: 'Hi', userName: 'Test', tasks: '', chatContext: '' });

    expect(res.status).toBe(200);
    expect(res.body.reply).toContain("couldn't generate a response");
  });

  it('POST /api/ai should return 401 if unauthenticated', async () => {
    const res = await request(app)
      .post('/api/ai')
      .set('Accept', 'application/json')
      .send({ userMessage: 'Hi' });

    expect(res.status).toBe(401);
  });
});
