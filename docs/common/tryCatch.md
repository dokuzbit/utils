# tryCatch

Safe function execution with automatic error handling. Supports both synchronous and asynchronous functions.

## Import

```ts
import {
  tryCatch,
  type Result,
  type AsyncResult,
} from "@dokuzbit/utils/common";
```

## Type Definitions

```ts
type Result<T> = {
  data: T;
  error: Error | null;
};

type AsyncResult<T> = Promise<Result<Awaited<T>>>;
```

## Function Signatures

```ts
// Synchronous overload
function tryCatch<T>(fn: () => T): Result<T>;

// Asynchronous overload
function tryCatch<T>(fn: () => Promise<T>): AsyncResult<T>;
```

## Usage

### Synchronous Operations

#### Basic Example

```ts
const result = tryCatch(() => JSON.parse(jsonString));

if (result.error) {
  console.error("Parse failed:", result.error);
  // Handle error
} else {
  console.log("Data:", result.data);
  // Use data safely
}
```

#### With Complex Logic

```ts
const result = tryCatch(() => {
  const data = localStorage.getItem("user");
  if (!data) throw new Error("No user data found");
  return JSON.parse(data);
});

if (result.error) {
  // Redirect to login or show error
  return null;
}

return result.data;
```

#### Mathematical Operations

```ts
const result = tryCatch(() => {
  const arr = [1, 2, 3, 4, 5];
  return arr.reduce((sum, num) => sum + num, 0);
});

console.log(result.data); // 15
console.log(result.error); // null
```

### Asynchronous Operations

#### Fetch API

```ts
const result = await tryCatch(async () => {
  const response = await fetch("/api/users");
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
});

if (result.error) {
  console.error("Fetch failed:", result.error);
  return { users: [] };
}

return { users: result.data };
```

#### Database Operations

```ts
const result = await tryCatch(async () => {
  return await database.query("SELECT * FROM users WHERE id = ?", [userId]);
});

if (result.error) {
  console.error("Database error:", result.error);
  throw error(500, "Failed to fetch user");
}

return result.data;
```

#### Multiple Async Operations

```ts
const result = await tryCatch(async () => {
  const user = await fetchUser(userId);
  const posts = await fetchUserPosts(userId);
  const comments = await fetchUserComments(userId);

  return {
    user,
    posts,
    comments,
  };
});

if (result.error) {
  // Handle error gracefully
  return null;
}

// All data fetched successfully
const { user, posts, comments } = result.data;
```

## Use Cases

### 1. Form Validation

```ts
const result = tryCatch(() => {
  const schema = z.object({
    email: z.string().email(),
    age: z.number().min(18),
  });

  return schema.parse(formData);
});

if (result.error) {
  showValidationError(result.error.message);
}
```

### 2. API Requests in SvelteKit

```ts
// +page.server.ts
export async function load() {
  const result = await tryCatch(async () => {
    const response = await fetch("https://api.example.com/data");
    return response.json();
  });

  if (result.error) {
    throw error(503, "External API unavailable");
  }

  return { data: result.data };
}
```

### 3. File Operations

```ts
const result = await tryCatch(async () => {
  const file = await fs.readFile("config.json", "utf-8");
  return JSON.parse(file);
});

if (result.error) {
  console.warn("Config file not found, using defaults");
  return DEFAULT_CONFIG;
}

return result.data;
```

### 4. Third-party Library Integration

```ts
const result = tryCatch(() => {
  return complexLibrary.doSomething(input);
});

if (result.error) {
  // Library threw an error, handle it gracefully
  logError(result.error);
  return fallbackValue;
}

return result.data;
```

## Error Handling Patterns

### Pattern 1: Early Return

```ts
const result = tryCatch(() => riskyOperation());
if (result.error) return null;

// Continue with result.data
processData(result.data);
```

### Pattern 2: Default Values

```ts
const result = tryCatch(() => JSON.parse(str));
const data = result.error ? DEFAULT_VALUE : result.data;
```

### Pattern 3: Error Logging

```ts
const result = await tryCatch(async () => {
  return await fetchData();
});

if (result.error) {
  logToService({
    level: "error",
    message: result.error.message,
    stack: result.error.stack,
  });
  return null;
}
```

### Pattern 4: Retry Logic

```ts
async function fetchWithRetry(url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const result = await tryCatch(async () => {
      const response = await fetch(url);
      return response.json();
    });

    if (!result.error) return result.data;

    // Wait before retry
    await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
  }

  throw new Error("Max retries reached");
}
```

## Benefits

### 1. **Type Safety**

TypeScript automatically infers the correct return type based on whether your function is sync or async.

```ts
const syncResult = tryCatch(() => 42);
// Type: Result<number>

const asyncResult = await tryCatch(async () => "hello");
// Type: Result<string>
```

### 2. **No Try-Catch Blocks**

Cleaner code without nested try-catch blocks:

```ts
// ❌ Traditional approach
let data;
try {
  data = JSON.parse(str);
} catch (error) {
  console.error(error);
  data = null;
}

// ✅ With tryCatch
const result = tryCatch(() => JSON.parse(str));
if (result.error) console.error(result.error);
```

### 3. **Consistent Error Handling**

Always returns the same structure, making it easy to handle errors consistently across your application.

### 4. **Works Everywhere**

Being in the `common` module, it works in both client and server environments.

### 5. **Automatic Logging**

Errors are automatically logged to console.error, helping with debugging.

## Important Notes

- Errors are automatically logged to `console.error`
- When an error occurs, `data` will be `null` and `error` will contain the Error object
- When successful, `data` will contain the result and `error` will be `null`
- The function automatically detects if the result is a Promise and handles it appropriately
- Works with any type of error (Error objects, strings, etc.)

## Related

- [Common utilities](../common.md)
- [Error handling best practices](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling)
