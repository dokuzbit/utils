import { expect, test } from 'bun:test';
import db from '../../server/mariaDB';

test('mariaDB', async () => {
    const result = await db.query('SELECT "test" as test');
    expect(result).toBeDefined();
});
