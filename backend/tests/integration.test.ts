import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';

describe('API Integration Tests', () => {
  let server: any;

  beforeAll(() => {
    server = app.listen(0);
  });

  afterAll(() => {
    server.close();
  });

  describe('Health Check', () => {
    it('GET /health should return healthy status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.version).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('API Status', () => {
    it('GET /api/status should return system information', async () => {
      const response = await request(app).get('/api/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('running');
      expect(response.body.data.uptime).toBeDefined();
      expect(response.body.data.memory).toBeDefined();
      expect(response.body.data.node_version).toBeDefined();
    });
  });

  describe('Agent API', () => {
    it('POST /api/agent/chat should require authentication', async () => {
      const response = await request(app)
        .post('/api/agent/chat')
        .send({});

      expect(response.status).toBe(401);
    });

    it('GET /api/agent/sessions should require authentication', async () => {
      const response = await request(app)
        .get('/api/agent/sessions');

      expect(response.status).toBe(401);
    });
  });

  describe('Salesmen API', () => {
    it('POST /api/salesmen should require authentication', async () => {
      const response = await request(app)
        .post('/api/salesmen')
        .send({
          name: 'Integration Test User',
          phone: '13800138000',
          email: 'integration@test.com',
          department: 'Test Department',
        });

      expect(response.status).toBe(401);
    });

    it('GET /api/salesmen should require authentication', async () => {
      const response = await request(app)
        .get('/api/salesmen');

      expect(response.status).toBe(401);
    });
  });

  describe('Sales API', () => {
    it('POST /api/sales should require authentication', async () => {
      const response = await request(app)
        .post('/api/sales')
        .send({
          salesperson_id: 1,
          product_name: 'Test Product',
          quantity: 100,
          unit_price: 50,
          total_amount: 5000,
          sale_date: '2026-05-15',
          region: '华东',
          category: '测试',
        });

      expect(response.status).toBe(401);
    });

    it('GET /api/sales should require authentication', async () => {
      const response = await request(app)
        .get('/api/sales');

      expect(response.status).toBe(401);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should handle invalid JSON body gracefully', async () => {
      const response = await request(app)
        .post('/api/salesmen')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers in responses for preflight requests', async () => {
      const response = await request(app)
        .options('/health')
        .set('Origin', 'http://localhost:5173');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });
});
