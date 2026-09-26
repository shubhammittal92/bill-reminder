import knexFactory, { Knex } from 'knex';
import path from 'path';

/**
 * Database connection. Uses Postgres when DATABASE_URL is set (production /
 * hosted, e.g. Render), and falls back to a local SQLite file for development
 * so the app runs with zero setup. Both are driven through Knex, so the query
 * code is identical for either backend.
 */
const databaseUrl = process.env.DATABASE_URL;
const dbFile = process.env.DB_FILE || path.join(__dirname, '..', '..', 'data.sqlite');

export const isPostgres = Boolean(databaseUrl);

export const db: Knex = databaseUrl
  ? knexFactory({
      client: 'pg',
      connection: {
        connectionString: databaseUrl,
        // Hosted Postgres (Render/Heroku) requires SSL.
        ssl: { rejectUnauthorized: false },
      },
      pool: { min: 0, max: 5 },
    })
  : knexFactory({
      client: 'sqlite3',
      connection: { filename: dbFile },
      useNullAsDefault: true,
    });

/** Create tables if they do not exist. */
export async function initDb(): Promise<void> {
  const hasUsers = await db.schema.hasTable('users');
  if (!hasUsers) {
    await db.schema.createTable('users', (t) => {
      t.increments('id').primary();
      t.string('email').notNullable().unique();
      t.string('passwordHash').notNullable();
      t.timestamp('createdAt').defaultTo(db.fn.now());
    });
  }

  const hasSubs = await db.schema.hasTable('subscriptions');
  if (!hasSubs) {
    await db.schema.createTable('subscriptions', (t) => {
      t.increments('id').primary();
      t.integer('userId').notNullable().references('id').inTable('users').onDelete('CASCADE');
      t.string('name').notNullable();
      t.float('amount').notNullable().defaultTo(0);
      t.string('currency').notNullable().defaultTo('INR');
      t.string('cycle').notNullable().defaultTo('monthly');
      t.string('startDate').notNullable();
      t.integer('reminderDays').notNullable().defaultTo(3);
      t.boolean('active').notNullable().defaultTo(true);
      t.timestamp('createdAt').defaultTo(db.fn.now());
      t.index(['userId']);
    });
  } else {
    // Migrate an existing single-user table: add userId if missing.
    const hasUserId = await db.schema.hasColumn('subscriptions', 'userId');
    if (!hasUserId) {
      await db.schema.alterTable('subscriptions', (t) => {
        t.integer('userId').references('id').inTable('users').onDelete('CASCADE');
      });
    }
  }
}
