import knexFactory, { Knex } from 'knex';
import path from 'path';

const dbFile = process.env.DB_FILE || path.join(__dirname, '..', '..', 'data.sqlite');

export const db: Knex = knexFactory({
  client: 'sqlite3',
  connection: { filename: dbFile },
  useNullAsDefault: true,
});

/** Create the subscriptions table if it does not exist. */
export async function initDb(): Promise<void> {
  const exists = await db.schema.hasTable('subscriptions');
  if (!exists) {
    await db.schema.createTable('subscriptions', (t) => {
      t.increments('id').primary();
      t.string('name').notNullable();
      t.float('amount').notNullable().defaultTo(0);
      t.string('currency').notNullable().defaultTo('INR');
      t.string('cycle').notNullable().defaultTo('monthly');
      t.string('startDate').notNullable();
      t.integer('reminderDays').notNullable().defaultTo(3);
      t.boolean('active').notNullable().defaultTo(true);
      t.timestamp('createdAt').defaultTo(db.fn.now());
    });
  }
}
