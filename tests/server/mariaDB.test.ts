import { expect, test } from 'bun:test';
import db from '../../server/mariaDB';

const { DB_HOST, DB_USER, DB_PASS, DB_NAME, TABLE1, TABLE2 } = process.env;

db.config({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME
});

if (!DB_HOST || !DB_USER || !DB_PASS || !DB_NAME || !TABLE1 || !TABLE2) throw new Error('DB_HOST, DB_USER, DB_PASS, DB_NAME, TABLE1 and TABLE2 are required');

const initSql = [
    `DROP DATABASE IF EXISTS test;`,
    `CREATE DATABASE test;`,
    `CREATE TABLE test (
        id int NOT NULL PRIMARY KEY AUTO_INCREMENT COMMENT 'Primary Key',
        create_time DATETIME COMMENT 'Create Time',
        name VARCHAR(255),
        data JSON);`,
    `CREATE TABLE testDetail (
        id int NOT NULL PRIMARY KEY AUTO_INCREMENT COMMENT 'Primary Key',
        create_time DATETIME COMMENT 'Create Time',
        master_id int,
        data JSON,
        FOREIGN KEY (master_id) REFERENCES test (id));`,
    `USE test`
];

for (const sql of initSql) {
    console.log(sql);
    console.log(await db.execute(sql));
}

test('insert', async () => {
    const result = await db.insert(TABLE1, { name: 'test1', data: { color: 'white', size: 'M' } });
    expect(result).toBeDefined();
    expect(result.affectedRows).toBe(1);
});

test('batch', async () => {
    const result = await db.insert(TABLE1, [{ name: 'test2', data: { color: 'white', size: 'M' } }, { name: 'test3', data: { color: 'black', size: 'L' } }]);
    expect(result).toBeDefined();
    expect(result.affectedRows).toBe(2);
});

test('update', async () => {
    db.execute('use test')
    await db.insert(TABLE1, { name: 'test1', data: { color: 'white', size: 'M' } });
    const result1 = await db.update({ table: TABLE1, values: { name: 'test2' }, where: 'name = "test1"' });
    const result2 = await db.update({ table: TABLE1, values: { name: 'test3' }, where: ['id = 1', 'name = "test2"'] });
    const result3 = await db.update({ table: TABLE1, values: { name: 'test4' }, where: { name: 'test3' } });
    const result4 = await db.update({ table: TABLE1, values: { name: 'test5' }, where: [{ name: 'test4' }, { id: "1" }] });

    expect(result1).toBeDefined();
    expect(result1.affectedRows).toBe(1);
    expect(result2).toBeDefined();
    expect(result2.affectedRows).toBe(1);
    expect(result3).toBeDefined();
    expect(result3.affectedRows).toBe(1);
    expect(result4).toBeDefined();
    expect(result4.affectedRows).toBe(1);
});
