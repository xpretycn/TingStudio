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
    it('POST /api/agent/chat should require message field', async () => {
      const response = await request(app)
        .post('/api/agent/chat')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Message is required');
    });

    it('GET /api/agent/sessions should return session list', async () => {
      const response = await request(app)
        .get('/api/agent/sessions');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Salespersons API', () => {
    let createdId: number;

    it('POST /api/salespersons should create a new salesperson', async () => {
      const response = await request(app)
        .post('/api/salespersons')
        .send({
          name: 'Integration Test User',
          phone: '13800138000',
          email: 'integration@test.com',
          department: 'Test Department',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Integration Test User');
      expect(response.body.data.id).toBeDefined();

      createdId = response.body.data.id;
    });

    it('GET /api/salespersons/:id should retrieve the created salesperson', async () => {
      const response = await request(app)
        .get(`/api/salespersons/${createdId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Integration Test User');
    });

    it('PUT /api/salespersons/:id should update the salesperson', async () => {
      const response = await request(app)
        .put(`/api/salespersons/${createdId}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
    });

    it('GET /api/salespersons should support pagination and search', async () => {
      const response = await request(app)
        .get('/api/salespersons')
        .query({ page: 1, limit: 10, search: 'Updated' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(10);
    });

    it('DELETE /api/salespersons/:id should delete the salesperson', async () => {
      const response = await request(app)
        .delete(`/api/salespersons/${createdId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('GET /api/salespersons/:id after delete should return 404', async () => {
      const response = await request(app)
        .get(`/api/salespersons/${createdId}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Sales Analysis API', () => {
    it('POST /api/sales/records should add a sales record', async () => {
      const response = await request(app)
        .post('/api/sales/records')
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

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.product_name).toBe('Test Product');
    });

    it('GET /api/sales/analyze should return analysis report', async () => {
      const response = await request(app)
        .get('/api/sales/analyze')
        .query({ group_by: 'day' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.trends).toBeDefined();
      expect(response.body.data.top_products).toBeDefined();
      expect(response.body.data.top_salespersons).toBeDefined();
      expect(response.body.data.regional_breakdown).toBeDefined();
      expect(response.body.data.anomalies).toBeDefined();
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
        .post('/api/salespersons')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers in responses', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });
});
