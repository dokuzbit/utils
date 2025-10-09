/**
 * @description MariaDB/MySQL class for database operations
 * @lastModified 2025-10-10
 * 
 * Pass 10/14 tests, 4 skipped
 */
import { expect, test, describe } from 'bun:test';
import db from '../../server/mariadb.server';

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
    `INSERT INTO test (name, data) VALUES ('test1', '{"color": "white", "size": "M"}');`,
];

type TestResult = {
    id: number;
    name: string;
    data: {
        color: string;
        size: string;
    };
}

describe('MariaDB Utilities Tests', () => {
    test('setup db', async () => {
        for (const sql of initSql) {
            await db.query(sql);
        }
    });

    test('select single record', async () => {
        await db.execute('use test')
        const result = await db.select({ command: 'findFirst', from: TABLE1, where: 'name = ?', whereParams: ['test1'], limit: 1 });
        expect(result).toBeDefined();
        expect(result.name).toBe('test1');
    });

    test('wrong_query', async () => {
        await db.query('use test')
        const result = await db.query<TestResult[]>("select name from wrong_table")
        expect(result).toHaveProperty('error');
        if ('error' in result) {
            expect(result.error.code).toContain('ER_NO_SUCH_TABLE');
        }
    });

    test('wrong_objectUpdate', async () => {
        await db.query('use test')
        const dataset = [
            { id: 1, name: Math.random().toString(36).substring(2, 15), data: { color: 'white', size: 'M' } },
            { id: 2, name: Math.random().toString(36).substring(2, 15), data: { color: 'black', size: 'L' } },
        ]
        const result = await db.objectUpdate({ table: "WRONG_TABLE", values: dataset });
        expect(result).toHaveProperty('error');

        if ('error' in result) {
            expect(result.error.code).toContain('ER_NO_SUCH_TABLE');
        }
    });

    test('query', async () => {
        await db.query('use test')
        await db.insert<TestResult>(TABLE1, { name: 'testQuery', data: { color: 'white', size: 'M' } })
        const result = await db.query<TestResult[]>('SELECT * FROM test where name = ?', ['testQuery']);
        if ('error' in result) { throw result.error; }
        expect(result).toBeDefined();
        expect(result?.length).toBeGreaterThanOrEqual(1);
        const result2 = await db.query<TestResult[]>({ sql: 'SELECT * FROM test where name = :name', namedPlaceholders: true }, { name: 'testQuery' });
        if ('error' in result2) { throw result2.error; }
        expect(result2).toBeDefined();
        expect(result2?.length).toBeGreaterThanOrEqual(1);
        const result3 = await db.query<TestResult[]>('SELECT * FROM test where name = :name', { name: 'testQuery', size: 'M' });
        if ('error' in result3) { throw result3.error; }
        expect(result3).toBeDefined();
        expect(result3?.length).toBeGreaterThanOrEqual(1);
        const result4 = await db.query<TestResult>('SELECT * FROM test where name = :name limit 1', { name: 'testQuery', size: 'M' });
        if ('error' in result4) { throw result4.error; }
        expect(result4).toBeDefined();
        expect(result4).toContainKeys(['id', 'name', 'data']);

    });

    test.skip('findFirst', async () => {
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
        expect(result).not.toHaveProperty('error');
    });

    test('batch', async () => {
        await db.execute('use test')
        const result = await db.insert(TABLE1, [{ name: 'test2', data: { color: 'white', size: 'M' } }, { name: 'test3', data: { color: 'black', size: 'L' } }]);
        console.log(result);
        expect(result).toBeDefined();
        expect(result.affectedRows).toBe(2);
        expect(result).not.toHaveProperty('error');
    });

    test('update', async () => {
        await db.execute('use test')
        await db.delete(TABLE1, '1 = 1');
        await db.insert(TABLE1, { name: 'test1', data: { color: 'white', size: 'M' } });
        let result: any;

        result = await db.update({ table: TABLE1, values: { name: 'test2' }, where: 'name = "test1"' });
        expect(result.affectedRows).toBe(1);

        result = await db.update({ table: TABLE1, values: { name: 'test3' }, where: ['name = "test2"', 'id > 1'] });
        expect(result.affectedRows).toBe(1);

        result = await db.update({ table: TABLE1, values: { name: 'test4' }, where: 'name = ?', whereParams: ['test3'] });
        expect(result.affectedRows).toBe(1);

        result = await db.update({ table: TABLE1, values: { name: 'test5' }, where: ['name = ?', 'id > ?'], whereParams: ['test4', 1] });
        expect(result.affectedRows).toBe(1);

        result = await db.update({ table: TABLE1, values: { name: 'test6' }, where: { name: 'test5' } });
        expect(result.affectedRows).toBe(1);

        result = await db.update({ table: TABLE1, values: { name: 'test7' }, where: { name: 'test6' } });
        expect(result.affectedRows).toBe(1);

    });

    test('objectUpdate multiple records', async () => {
        await db.execute('use test')
        await db.delete(TABLE1, '1 = 1');
        // AUTO_INCREMENT'i resetle
        await db.execute(`ALTER TABLE ${TABLE1} AUTO_INCREMENT = 1`);

        // Önce 2 kayıt ekleyelim
        const insertResult = await db.insert(TABLE1, [
            { name: 'initial1', data: { color: 'red', size: 'S' } },
            { name: 'initial2', data: { color: 'blue', size: 'XL' } }
        ]);

        const dataset = [
            { id: 1, name: Math.random().toString(36).substring(2, 15), data: { color: 'white', size: 'M' } },
            { id: 2, name: Math.random().toString(36).substring(2, 15), data: { color: 'black', size: 'L' } },
        ]
        const result = await db.objectUpdate({ table: TABLE1, values: dataset });
        expect(result).toBeDefined();
        if (result && 'affectedRows' in result) {
            expect(result.affectedRows).toBe(2); // 2 kayıt güncellendi
        }
    });

    test('objectUpdate single record', async () => {
        await db.execute('use test')
        // Tabloyu temizle ve AUTO_INCREMENT'i resetle
        await db.delete(TABLE1, '1 = 1');
        await db.execute(`ALTER TABLE ${TABLE1} AUTO_INCREMENT = 1`);

        // test1 adında bir kayıt ekleyelim
        await db.insert(TABLE1, { name: 'test1', data: { color: 'red', size: 'S' } });

        const result = await db.objectUpdate({ table: TABLE1, values: [{ id: 1, name: 'test1', data: { age: Math.floor(Math.random() * 100) } }], whereField: 'name' });
        expect(result).toBeDefined();
        if (result && 'affectedRows' in result) {
            expect(result.affectedRows).toBe(1);
        }
    });


    test.skip('rezerve edilmiş SQL anahtar kelimeleri ile alan adlarını kullanma', async () => {
        await db.execute('use test');

        // Rezerve edilmiş SQL anahtar kelimeleri içeren tablo oluştur
        await db.execute(`DROP TABLE IF EXISTS reserved_fields`);
        await db.execute(`
            CREATE TABLE reserved_fields (
                id INT AUTO_INCREMENT PRIMARY KEY,
                \`not\` VARCHAR(255),
                \`order\` VARCHAR(255),
                \`group\` VARCHAR(255),
                \`limit\` INT,
                \`select\` VARCHAR(255),
                \`update\` VARCHAR(255),
                \`delete\` VARCHAR(255),
                \`where\` VARCHAR(255),
                \`from\` VARCHAR(255),
                \`join\` VARCHAR(255),
                \`inner\` VARCHAR(255),
                \`outer\` VARCHAR(255),
                \`by\` VARCHAR(255),
                \`as\` VARCHAR(255),
                \`case\` VARCHAR(255),
                \`when\` VARCHAR(255),
                \`then\` VARCHAR(255),
                normal_field VARCHAR(255)
            )
        `);

        // Veri ekle
        const insertResult = await db.insert('reserved_fields', {
            'not': 'not değeri',
            'order': 'order değeri',
            'group': 'group değeri',
            'limit': 100,
            'select': 'select değeri',
            'update': 'update değeri',
            'delete': 'delete değeri',
            'where': 'where değeri',
            'from': 'from değeri',
            'join': 'join değeri',
            'inner': 'inner değeri',
            'outer': 'outer değeri',
            'by': 'by değeri',
            'as': 'as değeri',
            'case': 'case değeri',
            'when': 'when değeri',
            'then': 'then değeri',
            'normal_field': 'normal değer'
        });

        expect(insertResult.affectedRows).toBe(1);

        // Rezerve edilmiş alan adlarıyla sorgu yap
        const selectResult = await db.query('SELECT `not`, `order`, `group`, `limit`, `select`, `update`, `delete`, `where`, `from` FROM reserved_fields');
        expect(selectResult).toBeDefined();
        expect(selectResult[0].not).toBe('not değeri');
        expect(selectResult[0].order).toBe('order değeri');
        expect(selectResult[0].group).toBe('group değeri');
        expect(selectResult[0].limit).toBe(100);
        expect(selectResult[0].select).toBe('select değeri');
        expect(selectResult[0].update).toBe('update değeri');
        expect(selectResult[0].delete).toBe('delete değeri');
        expect(selectResult[0].where).toBe('where değeri');
        expect(selectResult[0].from).toBe('from değeri');

        // Rezerve edilmiş alan adları ile WHERE koşulu kullan
        const whereResult = await db.select({
            from: 'reserved_fields',
            where: '`not` = ? AND `order` = ?',
            whereParams: ['not değeri', 'order değeri']
        });

        console.log('whereResult:', whereResult);

        // whereResult bir dizi değil, tek bir obje olduğundan length kontrolü yerine objenin kendisini kontrol edelim
        expect(whereResult).toBeDefined();
        expect(whereResult.not).toBe('not değeri');
        expect(whereResult.order).toBe('order değeri');

        // MariaDB select fonksiyonunu özel alan adlarıyla kullan
        const advancedSelect = await db.select({
            select: ['`not`', '`order`', '`group`', '`join`', '`as`'],
            from: 'reserved_fields',
            where: '`select` = ?',
            whereParams: ['select değeri'],
            order: '`by` ASC'
        });

        expect(advancedSelect).toBeDefined();
        expect(advancedSelect.not).toBe('not değeri');
        expect(advancedSelect.order).toBe('order değeri');
        expect(advancedSelect.group).toBe('group değeri');
        expect(advancedSelect.join).toBe('join değeri');
        expect(advancedSelect.as).toBe('as değeri');

        // Update işlemini test et
        const updateResult = await db.update({
            table: 'reserved_fields',
            values: {
                'not': 'yeni not değeri',
                'order': 'yeni order değeri',
                'when': 'yeni when değeri'
            },
            where: '`group` = ?',
            whereParams: ['group değeri']
        });

        expect(updateResult.affectedRows).toBe(1);

        // Güncellenmiş veriyi kontrol et
        const updatedResult = await db.query('SELECT * FROM reserved_fields');
        expect(updatedResult[0].not).toBe('yeni not değeri');
        expect(updatedResult[0].order).toBe('yeni order değeri');
        expect(updatedResult[0].when).toBe('yeni when değeri');

        // Birden fazla koşul ile WHERE kullanarak test et
        const complexSelect = await db.select({
            from: 'reserved_fields',
            where: {
                'select': 'select değeri',
                'delete': 'delete değeri'
            }
        });

        expect(complexSelect).toBeDefined();
        expect(complexSelect.not).toBe('yeni not değeri');

        // Tabloyu temizle
        await db.execute('DROP TABLE IF EXISTS reserved_fields');
    });

    test('JSON_VALUE conversion for dot notation', async () => {
        await db.execute('use test');
        await db.execute('DROP TABLE IF EXISTS json_test');
        // Tablo oluştur
        await db.execute(`
            CREATE TABLE IF NOT EXISTS json_test (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50),
                data JSON
            )
        `);

        // Test verisi ekle
        await db.execute(`
            INSERT INTO json_test (name, data) VALUES 
            ('test1', '{"color": "red", "size": "M"}'),
            ('test2', '{"color": "blue", "size": "L"}'),
            ('test3', '{"color": "green", "metadata": {"variant": "dark", "style": "modern"}}')
        `);

        // Dot notation ile sorgu (otomatik olarak JSON_VALUE'ya dönüşmeli)
        const result1 = await db.query<any>('SELECT id, name, data.color as color FROM json_test WHERE name = ? limit 1', ['test1']);
        expect(result1).toBeDefined();
        expect(result1.color).toBe('red');

        // İç içe path testi
        const result2 = await db.query<any[]>('SELECT id, data.metadata.variant as variant FROM json_test WHERE name = ?', ['test3']);
        expect(result2).toBeDefined();
        expect(result2[0]).toBeDefined();
        expect(result2[0].variant).toBe('dark');

        // JSON in where clause
        const result3 = await db.query<any>('SELECT * FROM json_test WHERE data.color = ?', ['red']);
        expect(result3).toBeDefined();
        expect(result3.length).toBe(1);
        expect(result3[0].name).toBe('test1');

    });

    test('query with error', async () => {
        const result = await db.query('SELECT 1 as error, name FROM json_test limit 1');
        console.log("result", result);
        expect(result).toBeDefined();
        expect(result).toBeArray();
    });
});