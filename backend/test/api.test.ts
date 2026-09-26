import request from 'supertest';
import { createApp } from '../src/app';
import { initDb, db } from '../src/db';

const app = createApp();

async function authHeader(email = 'test@example.com'): Promise<string> {
  const res = await request(app).post('/api/auth/signup').send({ email, password: 'password123' });
  return `Bearer ${res.body.token}`;
}

beforeAll(async () => {
  await initDb();
});

afterAll(async () => {
  await db.destroy();
});

afterEach(async () => {
  await db('subscriptions').del();
  await db('users').del();
});

describe('auth', () => {
  it('rejects short passwords on signup', async () => {
    const res = await request(app).post('/api/auth/signup').send({ email: 'a@b.com', password: 'short' });
    expect(res.status).toBe(400);
  });

  it('signs up, logs in, and returns the current user', async () => {
    const signup = await request(app).post('/api/auth/signup').send({ email: 'x@y.com', password: 'password123' });
    expect(signup.status).toBe(201);
    expect(signup.body.token).toBeTruthy();

    const login = await request(app).post('/api/auth/login').send({ email: 'x@y.com', password: 'password123' });
    expect(login.status).toBe(200);

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe('x@y.com');
  });

  it('rejects wrong passwords', async () => {
    await request(app).post('/api/auth/signup').send({ email: 'x@y.com', password: 'password123' });
    const login = await request(app).post('/api/auth/login').send({ email: 'x@y.com', password: 'wrongpass1' });
    expect(login.status).toBe(401);
  });
});

describe('subscriptions API (authed)', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/subscriptions');
    expect(res.status).toBe(401);
  });

  it('rejects invalid payloads', async () => {
    const auth = await authHeader();
    const res = await request(app).post('/api/subscriptions').set('Authorization', auth).send({ amount: -5 });
    expect(res.status).toBe(400);
  });

  it('creates, lists, and deletes a subscription', async () => {
    const auth = await authHeader();
    const create = await request(app).post('/api/subscriptions').set('Authorization', auth).send({
      name: 'Netflix', amount: 649, cycle: 'monthly', startDate: '2026-01-15', reminderDays: 3,
    });
    expect(create.status).toBe(201);

    const list = await request(app).get('/api/subscriptions').set('Authorization', auth);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toHaveProperty('nextRenewal');

    const del = await request(app).delete(`/api/subscriptions/${create.body.id}`).set('Authorization', auth);
    expect(del.status).toBe(204);
  });

  it('isolates data between users', async () => {
    const alice = await authHeader('alice@example.com');
    const bob = await authHeader('bob@example.com');

    await request(app).post('/api/subscriptions').set('Authorization', alice).send({
      name: 'Alice Netflix', amount: 649, cycle: 'monthly', startDate: '2026-01-15',
    });

    const bobList = await request(app).get('/api/subscriptions').set('Authorization', bob);
    expect(bobList.body).toHaveLength(0); // Bob cannot see Alice's data

    const aliceList = await request(app).get('/api/subscriptions').set('Authorization', alice);
    expect(aliceList.body).toHaveLength(1);
  });

  it('returns a monthly spend summary scoped to the user', async () => {
    const auth = await authHeader();
    await request(app).post('/api/subscriptions').set('Authorization', auth).send({
      name: 'Yearly Insurance', amount: 12000, cycle: 'yearly', startDate: '2026-01-01',
    });
    const res = await request(app).get('/api/summary').set('Authorization', auth);
    expect(res.body.activeCount).toBe(1);
    expect(res.body.estimatedMonthlySpend).toBe(1000);
  });
});
