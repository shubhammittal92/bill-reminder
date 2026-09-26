import request from 'supertest';
import { createApp } from '../src/app';
import { initDb, db } from '../src/db';

const app = createApp();

beforeAll(async () => {
  await initDb();
});

afterAll(async () => {
  await db.destroy();
});

afterEach(async () => {
  await db('subscriptions').del();
});

describe('subscriptions API', () => {
  it('rejects invalid payloads', async () => {
    const res = await request(app).post('/api/subscriptions').send({ amount: -5 });
    expect(res.status).toBe(400);
  });

  it('creates, lists, and deletes a subscription', async () => {
    const create = await request(app).post('/api/subscriptions').send({
      name: 'Netflix',
      amount: 649,
      cycle: 'monthly',
      startDate: '2026-01-15',
      reminderDays: 3,
    });
    expect(create.status).toBe(201);
    const id = create.body.id;

    const list = await request(app).get('/api/subscriptions');
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toHaveProperty('nextRenewal');
    expect(list.body[0]).toHaveProperty('daysUntil');

    const del = await request(app).delete(`/api/subscriptions/${id}`);
    expect(del.status).toBe(204);
  });

  it('returns a monthly spend summary', async () => {
    await request(app).post('/api/subscriptions').send({
      name: 'Yearly Insurance', amount: 12000, cycle: 'yearly', startDate: '2026-01-01',
    });
    const res = await request(app).get('/api/summary');
    expect(res.status).toBe(200);
    expect(res.body.activeCount).toBe(1);
    expect(res.body.estimatedMonthlySpend).toBe(1000); // 12000 / 12
  });
});
