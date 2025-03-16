# cache - Memory Cache Wrapper

## Installation

[Installation](../common.md#installation), [Singleton Pattern](../common.md#singleton-pattern), [Multiton Pattern](../common.md#multiton-pattern) and [Default Import](../common.md#default-import) is documented in [here](../common.md)

```ts
import { cache } from "@dokuzbit/utils/server";
// or
import cacheClient from "@dokuzbit/utils/server/cache";
// ☝️ We export the singleton instance as default for easy aliasing
```

## .config(options) - Configure cache settings

- options: `object` - The configuration object for the cache settings.
  - maxItemSizeMB: `number` - Maximum size for a single cached item in MB (default: 10MB)
  - maxTotalSizeMB: `number` - Maximum total cache size in MB (default: 300MB)
  - defaultTTLSec: `number` - Default Time-To-Live in seconds (default: 300s)

```ts
const options = {
  maxItemSizeMB: 20, // 20MB per item
  maxTotalSizeMB: 500, // 500MB total
  defaultTTLSec: 600, // 10 minutes
};
cache.config(options);
```

## .set(key, value, ttl?) - Store data in cache

- key: `string` - The unique identifier for the cached item
- value: `T` - The data to be cached
- ttl?: `number` - Optional Time-To-Live in seconds (uses defaultTTL if not specified)
- returns: `void`

```ts
cache.set("user-123", { name: "John", age: 30 });
// or with custom TTL
cache.set("temp-data", data, 60); // expires in 60 seconds
```

## .get(key) - Retrieve data from cache

- key: `string` - The unique identifier for the cached item
- returns: `T | null` - The cached data or null if not found/expired

```ts
const data = cache.get("user-123");
```

## .remove(key) - Remove data from cache

- key: `string` - The unique identifier for the cached item
- returns: `void`

```ts
cache.remove("user-123");
```

## .getMeta(key) - Get metadata about cached item

- key: `string` - The unique identifier for the cached item
- returns: `{ timeStamp?: number, expiryTime?: number, size?: number } | null`

```ts
const meta = cache.getMeta("user-123");
```

## .clear() - Clear all cached data

- returns: `void`

```ts
cache.clear();
```

## .getSize() - Get current cache size

- returns: `number` - Current total size of cached data in bytes

```ts
const currentSize = cache.getSize();
```

## Example Usage

```ts
// Configure cache
cache.config({
  maxItemSizeMB: 5,
  maxTotalSizeMB: 100,
  defaultTTLSec: 300,
});

// Store data
cache.set("key1", "test");

// Retrieve data
const value = cache.get("key1");
console.log(value); // 'test'

// Get metadata
const meta = cache.getMeta("key1");
console.log(meta); // { timeStamp: 1234567890, expiryTime: 1234568190, size: 4 }

// Clear cache
cache.clear();
```

## Example with Type Generic (multiton pattern)

```ts
const cache = new Cache<string>();
cache.set("test", "test");
cache.set("test", 1);
// ☝️ This is rise type error because we set cache to string type
```
