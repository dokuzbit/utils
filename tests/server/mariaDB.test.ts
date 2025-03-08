import { expect, test } from 'bun:test';
import db from '../../server/mariadb.server';
import { merge } from 'lodash';
import { SqlError, type TypeCastResult, type UpsertResult } from 'mariadb';

const { DB_HOST, DB_USER, DB_PASS, DB_NAME, TABLE1, TABLE2 } = process.env;

db.config({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,

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
    `use test;`
];


test('setup db', async () => {
    for (const sql of initSql) {
        await db.query(sql);
    }
});

test('query', async () => {
    await db.query('use test')
    await db.insert(TABLE1, { name: 'testQuery' })
    const result = await db.query('SELECT * FROM test where name = ?', ['testQuery']);
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThanOrEqual(1);
    const result2 = await db.query({ sql: 'SELECT * FROM test where name = :name', namedPlaceholders: true }, { name: 'testQuery' });
    expect(result2).toBeDefined();
    expect(result2.length).toBeGreaterThanOrEqual(1);
    const result3 = await db.query('SELECT * FROM test where name = :name', { name: 'testQuery' });
    expect(result3).toBeDefined();
    expect(result3.length).toBeGreaterThanOrEqual(1);

});

test.skip('getFirst', async () => {
    await db.execute('use test')
    await db.insert(TABLE1, { name: 'test1', data: { color: 'white', size: 'M' } });
    const result = await db.select({ from: TABLE1, where: 'name = ?', whereParams: ['test1'] });
    expect(result).toBeDefined();
    expect(result.name).toBe('test1');
    const result2 = await db.select({ from: TABLE1, where: { name: 'test1' } });
    expect(result2).toBeDefined();
    expect(result2.name).toBe('test1');
});

test.skip('getMany', async () => {
    await db.execute('use test')
    await db.insert(TABLE1, [{ name: 'test2', data: { color: 'white', size: 'M' } }, { name: 'test3', data: { color: 'black', size: 'L' } }]);
    const result = await db.select({ from: TABLE1, where: 'name LIKE ?', whereParams: ['test%'], limit: 10 });
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(1);
});

test.skip('getRelated', async () => {
    await db.execute('use test')
    await db.delete(TABLE2, '1 = 1');
    await db.delete(TABLE1, '1 = 1');
    const result1 = await db.insert(TABLE1, { name: 'test1', data: { color: 'white', size: 'M' } });
    await db.insert(TABLE1, { name: 'test2', data: { color: 'red', size: 'L' } });
    const id = Number(result1.insertId);
    await db.insert(TABLE2, { master_id: id, data: { stock: 100 } });
    db.config({ rowsAsArray: true });
    const result = await db.select({ from: [TABLE1 + ' t1', TABLE2 + ' t2'], join: 't2.master_id = t1.id', limit: 10 })
    expect(result).toBeDefined();
    expect(result.meta).toBeDefined();
    expect(result[0][2]).toBe('test1');
    expect(result[0][3].color).toBe('white');
    expect(result[0][7].stock).toBe(100);
});

test('insert', async () => {
    await db.execute('use test')
    const result = await db.insert(TABLE1, { name: 'test1', data: { color: 'white', size: 'M' } });
    expect(result).toBeDefined();
    expect(result.affectedRows).toBe(1);
});

test('batch', async () => {
    await db.execute('use test')
    const result = await db.insert(TABLE1, [{ name: 'test2', data: { color: 'white', size: 'M' } }, { name: 'test3', data: { color: 'black', size: 'L' } }]);
    console.log(result);
    expect(result).toBeDefined();
    expect(result.affectedRows).toBe(2);
});

test('update', async () => {
    await db.execute('use test')
    await db.insert(TABLE1, { name: 'test1', data: { color: 'white', size: 'M' } });
    let result = []
    result[0] = await db.update({ table: TABLE1, values: { name: 'test2' }, where: 'name = "test1"' });
    result[1] = await db.update({ table: TABLE1, values: { name: 'test3' }, where: ['name = "test2"', 'id > 1'] });
    result[2] = await db.update({ table: TABLE1, values: { name: 'test4' }, where: 'name = ?', whereParams: ['test3'] });
    result[3] = await db.update({ table: TABLE1, values: { name: 'test5' }, where: ['name = ?', 'id > ?'], whereParams: ['test4', 1] });
    result[4] = await db.update({ table: TABLE1, values: { name: 'test6' }, where: { name: 'test5' } });
    result[5] = await db.update({ table: TABLE1, values: { name: 'test7' }, where: [{ name: 'test6' }, { id: 1 }] });
    for (const r of result) {
        expect(r).toBeDefined();
        expect((r).affectedRows).toBeGreaterThanOrEqual(1);
    }
});

test('batchUpdate', async () => {
    await db.execute('use test')
    const result = await db.batchUpdate({ table: TABLE1, values: [{ id: 1, name: 'test1' }, { id: 2, name: 'test2' }] });
    expect(result).toBeDefined();
    expect(result.affectedRows).toBeGreaterThanOrEqual(2);
});