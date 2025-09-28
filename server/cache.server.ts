/**
 * @version 0.2.12
 * Cache sınıfı, bellekte verileri saklamak ve erişim hızını artırmak için kullanılır.
 * 
 * @method set: Veriyi cache'e ekler.
 * @param key: Cache'e eklenen verinin anahtarı.
 * @param value: Cache'e eklenen veri.
 * @param ttl: Cache'teki verinin süresi. (saniye)
 * @param expireDate: Cache'teki verinin süresi. (ISO formatında veya + 1s, +1m, +1h, +1d, +1w)
 * @method get: Cache'teki veriyi döndürür.
 * @method getMeta: Cache'teki verinin meta bilgilerini döndürür.
 * @method remove: Cache'teki veriyi siler.
 * @method clear: Cache'i temizler.
 * @method getSize: Cache'teki verilerin toplam boyutunu döndürür.
 */


// import { Database } from "bun:sqlite";
let cacheDB: any | null = null;
// const cacheDB = new Database(process.env.NODE_ENV === 'production' ? "/www/sqlite/cache.db" : "cache.db");
// cacheDB.exec("pragma journal_mode = WAL;");
// cacheDB.exec("CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value TEXT, expireDate TEXT);");

interface CacheItem<T> {
    value: T;
    size: number;
    expiryTime: number;
    timeStamp: number;
    expireDate: string;

}

class CacheNode<T> {
    key: string;
    value: CacheItem<T>;
    prev: CacheNode<T> | null;
    next: CacheNode<T> | null;

    constructor(key: string, value: CacheItem<T>) {
        this.key = key;
        this.value = value;
        this.prev = null;
        this.next = null;
    }
}

export class Cache<T> {
    private cache: Map<string, CacheNode<T>>;
    private currentSize: number
    private maxItemSize: number
    private maxTotalSize: number
    private defaultTTL: number
    private head: CacheNode<T> | null
    private tail: CacheNode<T> | null

    constructor() {
        this.cache = new Map();
        this.currentSize = 0;
        this.maxItemSize = 10 * 1024 * 1024; // varsayılan 10MB
        this.maxTotalSize = 300 * 1024 * 1024; // varsayılan 300MB
        this.defaultTTL = 300; // varsayılan 300 saniye
        this.head = null;
        this.tail = null;
    }

    public config(options?: { maxItemSizeMB?: number, maxTotalSizeMB?: number, defaultTTLSec?: number }): { maxItemSizeMB: number, maxTotalSizeMB: number, defaultTTLSec: number } {
        if (options) {
            this.maxItemSize = (options.maxItemSizeMB ?? (this.maxItemSize / 1024 / 1024)) * 1024 * 1024;
            this.maxTotalSize = (options.maxTotalSizeMB ?? (this.maxTotalSize / 1024 / 1024)) * 1024 * 1024;
            this.defaultTTL = options.defaultTTLSec ?? this.defaultTTL;
        }
        return {
            maxItemSizeMB: this.maxItemSize / 1024 / 1024,
            maxTotalSizeMB: this.maxTotalSize / 1024 / 1024,
            defaultTTLSec: this.defaultTTL
        }
    }

    private getMySQLDateTime(timestamp: number): string {
        const date = new Date(timestamp);
        // const offset = date.getTimezoneOffset();
        // const localDate = new Date(date.getTime() - (offset * 60 * 1000));
        return date.toISOString().slice(0, 19).replace('T', ' ');
    }

    public set(key: string, value: T, ttl?: number, expireDate?: string): void {

        // Eğer expireDate bir tarih ise ve bugünden büyükse, o tarihi kullan.
        // Eğer + ile başlıyorsa, o kadar saniye dakika saat gün veya ay ekle.
        if (expireDate && expireDate.startsWith('+')) {
            const multiplier = {
                s: 1,
                m: 60,
                h: 3600,
                d: 86400,
                w: 604800,
            }
            // expireDate in sonuncu harfini al
            const timeScale = expireDate.replace('+', '').slice(-1);
            const timeValue = expireDate.replace('+', '').slice(0, -1);
            expireDate = new Date(Date.now() + parseInt(timeValue) * 1000 * multiplier[timeScale as keyof typeof multiplier]).toISOString();
        } else if (expireDate) {
            expireDate = new Date(expireDate).toISOString();
        }


        this.removeExpired();
        this.removeUntilFreeSpace();

        const valueSize = this.calculateSize(value);

        if (valueSize > this.maxItemSize) {
            console.log("Max item size exceeded");
            return;
        }

        // Eski değeri varsa sil
        if (this.cache.has(key)) {
            this.currentSize -= this.cache.get(key)!.value.size;
            this.removeNode(this.cache.get(key)!);
        }

        // Yeni değeri ekle
        const now = Date.now();
        const expiryTime = now + (ttl ?? this.defaultTTL) * 1000;
        const newNode = new CacheNode<T>(key, {
            value,
            size: valueSize,
            expiryTime,
            timeStamp: Math.floor(new Date(now).getTime() / 1000),
            expireDate: expireDate ?? ''
        });
        this.cache.set(key, newNode);
        this.addNodeToHead(newNode);
        this.currentSize += valueSize;
    }

    public get(key: string): T | null {
        this.removeExpired();

        const node = this.cache.get(key);
        if (!node && cacheDB) {
            const dbNode: any = cacheDB.prepare("SELECT value, expireDate FROM cache WHERE key = ? AND datetime(expireDate) > datetime('now')").get(key);
            if (dbNode) {
                console.log("found on db")
                const newNode = new CacheNode<T>(key, {
                    value: JSON.parse(dbNode.value),
                    size: this.calculateSize(JSON.parse(dbNode.value)),
                    expiryTime: new Date(dbNode.expireDate).getTime(),
                    timeStamp: Math.floor(new Date(dbNode.expireDate).getTime() / 1000),
                    expireDate: dbNode.expireDate
                });
                this.cache.set(key, newNode);
                this.addNodeToHead(newNode);
                this.currentSize += newNode.value.size;
                return newNode.value.value;
            }
        } else {

            // Düğümü başa taşı
            if (node) {
                this.removeNode(node);
                this.addNodeToHead(node);
            }

            return node?.value.value ?? null;
        }

        return null;
    }

    public remove(key: string): void {
        this.removeExpired();

        const node = this.cache.get(key);
        // Eğer expireDate varsa veritabanından sil.
        if (node?.value.expireDate) {
            if (cacheDB) cacheDB.prepare("DELETE FROM cache WHERE key = ?").run(key);
        }

        if (this.cache.has(key)) {
            this.currentSize -= this.cache.get(key)!.value.size;
            this.removeNode(this.cache.get(key)!);
            this.cache.delete(key);
        }
    }

    public getMeta(key: string): Partial<CacheItem<T>> | null {
        this.removeExpired();
        return {
            timeStamp: this.cache.get(key)?.value.timeStamp,
            expiryTime: this.cache.get(key)?.value.expiryTime,
            size: this.cache.get(key)?.value.size,
        };
    }


    private removeExpired(): void {
        const now = Date.now();
        for (const [key, node] of this.cache.entries()) {
            if (node.value.expiryTime <= now) {
                if (node.value.expireDate) {
                    if (cacheDB) cacheDB.prepare("INSERT INTO cache (key, value, expireDate) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, expireDate = ?").run(key, JSON.stringify(node.value.value), node.value.expireDate, JSON.stringify(node.value.value), node.value.expireDate);
                }
                this.currentSize -= node.value.size;
                this.removeNode(node);
                this.cache.delete(key);
                console.log('🗑️ src/lib/server/cache.ts 👉 154 👀 expired ➤ ', key);
            }
        }
        // Veritamanında expireDate'i geçmiş verileri sil.
        if (cacheDB) cacheDB.prepare("DELETE FROM cache WHERE datetime(expireDate) < datetime('now')").run();
    }

    private removeUntilFreeSpace(): void {
        while (this.currentSize > this.maxTotalSize && this.cache.size > 0) {
            const tail = this.tail;
            if (!tail) break;
            this.currentSize -= tail.value.size;
            this.removeNode(tail);
            this.cache.delete(tail.key);
            console.log('🗑️ src/lib/server/cache.ts 👉 110 👀 removed ➤ ', tail.key);
        }
    }

    private calculateSize(value: T): number {
        return new TextEncoder().encode(JSON.stringify(value)).length;
    }

    public clear(): void {
        this.cache.clear();
        this.currentSize = 0;
    }

    public getSize(): number {
        return this.currentSize;
    }

    private removeNode(node: CacheNode<T>): void {
        if (node.prev) {
            node.prev.next = node.next;
        } else {
            this.head = node.next;
        }

        if (node.next) {
            node.next.prev = node.prev;
        } else {
            this.tail = node.prev;
        }
    }

    private addNodeToHead(node: CacheNode<T>): void {
        node.next = this.head;
        node.prev = null;

        if (this.head) {
            this.head.prev = node;
        }

        this.head = node;

        if (!this.tail) {
            this.tail = node;
        }
    }
}

export const cache = new Cache<unknown>();
export default cache;
