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

type TestResult = {
    id: number;
    name: string;
    data: {
        color: string;
        size: string;
    };
}
test('setup db', async () => {
    for (const sql of initSql) {
        await db.query(sql);
    }
});

test('query', async () => {
    await db.query('use test')
    await db.insert<TestResult>(TABLE1, { name: 'testQuery', data: { color: 'white', size: 'M' } })
    const result = await db.query<TestResult[]>('SELECT * FROM test where name = ?', ['testQuery']);
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThanOrEqual(1);
    const result2 = await db.query<TestResult[]>({ sql: 'SELECT * FROM test where name = :name', namedPlaceholders: true }, { name: 'testQuery' });
    expect(result2).toBeDefined();
    expect(result2.length).toBeGreaterThanOrEqual(1);
    const result3 = await db.query<TestResult[]>('SELECT * FROM test where name = :name', { name: 'testQuery', size: 'M' });
    expect(result3).toBeDefined();
    expect(result3.length).toBeGreaterThanOrEqual(1);
    const result4 = await db.query<TestResult>('SELECT * FROM test where name = :name limit 1', { name: 'testQuery', size: 'M' });
    expect(result4).toBeDefined();
    expect(result4).toContainKeys(['id', 'name', 'data']);

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
    console.log('Update 1 result:', result[0]);

    result[1] = await db.update({ table: TABLE1, values: { name: 'test3' }, where: ['name = "test2"', 'id > 1'] });
    console.log('Update 2 result:', result[1]);

    result[2] = await db.update({ table: TABLE1, values: { name: 'test4' }, where: 'name = ?', whereParams: ['test3'] });
    console.log('Update 3 result:', result[2]);

    result[3] = await db.update({ table: TABLE1, values: { name: 'test5' }, where: ['name = ?', 'id > ?'], whereParams: ['test4', 1] });
    console.log('Update 4 result:', result[3]);

    result[4] = await db.update({ table: TABLE1, values: { name: 'test6' }, where: { name: 'test5' } });
    console.log('Update 5 result:', result[4]);

    // Bu ifade sorunlu olabilir, { id: 1 } koşulunu tek başına kullanalım
    result[5] = await db.update({ table: TABLE1, values: { name: 'test7' }, where: { name: 'test6' } });
    console.log('Update 6 result:', result[5]);

    for (const r of result) {
        expect(r).toBeDefined();
        if (r.affectedRows === 0) {
            console.log('UYARI: Etkilenen satır sayısı 0 olan bir update var!');
        }
        expect((r).affectedRows).toBeGreaterThanOrEqual(1);
    }
});

test('objectUpdate multiple records', async () => {
    await db.execute('use test')
    const dataset = [
        { id: 1, name: Math.random().toString(36).substring(2, 15), data: { color: 'white', size: 'M' } },
        { id: 2, name: Math.random().toString(36).substring(2, 15), data: { color: 'black', size: 'L' } },
    ]
    const result = await db.objectUpdate({ table: TABLE1, values: dataset });
    console.log(result);
    expect(result).toBeDefined();
    expect(result.affectedRows).toBeGreaterThanOrEqual(2);
    expect(result.warningStatus).toBe(0);
});

test('objectUpdate single record', async () => {
    await db.execute('use test')
    const result = await db.objectUpdate({ table: TABLE1, values: [{ id: 1, name: 'test1', data: { age: Math.floor(Math.random() * 100) } }], whereField: 'name' });
    console.log(result);
    expect(result).toBeDefined();
    expect(result.affectedRows).toBeGreaterThanOrEqual(1);
});


test('rezerve edilmiş SQL anahtar kelimeleri ile alan adlarını kullanma', async () => {
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