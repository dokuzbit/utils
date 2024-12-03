import { expect, test } from 'bun:test';
import db from '../../server/mariaDB';

// TODO: DB_HOST, DB_USER, DB_PASS, DB_NAME'i test'e gönderelim
// testi düzenleyelim
test('mariaDB', async () => {
    const result = await db.query('SELECT "test" as test');
    console.log("result:", result);

    expect(result).toBeDefined();
});
