# api - API Wrapper for API Requests

```ts
import { api } from "@dokuzbit/utils/client";
// or
import { api } from "@dokuzbit/utils/client/api";
```

## .setBaseUrl(url) - Set the base URL for the API - _optional_

- url: `string` - The base URL to request.

```ts
api.setBaseUrl("https://jsonplaceholder.typicode.com/");
```

## .get\<T>(url, params?, ttl?) - Simple GET request with cache

## .get0\<T>(url, params?) - Simple GET request with no cache

- url: `string` - The URL to request.
- params (optional): `string | Record<string, string | number> | undefined` - The parameters to send with the request.
- ttl (optional): `number` - Number of seconds to cache the response. Default is 300 seconds. 0 means no caching.
- returns: `Promise<{data: <T>, error: any, status: number, ok: boolean}>` - The response from the API.

Example requests:

```ts
api.setBaseUrl("https://jsonplaceholder.typicode.com/");
// Above is optional, you can request full url instead
const result = await api.get("comments?postId=1");
const result2 = await api.get("comments", { postId: 1 });
const result3 = await api.get("comments", "postId=1");
```

Example response:

```ts
{
  data: [{ id: 1, postId: 1, name: "John Doe", email: "john@doe.com", body: "Lorem ipsum dolor sit amet" }],
  error: null,
  status: 200,
  ok: true
}
```

## Payload type (used for POST, PUT, PATCH requests)

```ts
type Payload =
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>
  | Payload[]
  | FormData;
```

## .post\<T>(url, payload) - Simple POST request

- url: `string` - The URL to request.
- payload: `Payload` - The payload to send with the request. See [Payload type](#payload-type) for more information.
- returns: `Promise<{data: <T>, error: any, status: number, ok: boolean}>` - The response from the API.

Example requests:

```ts
const result = await api.post("posts", {
  title: "test",
  body: "test",
});
```

Example response:

```ts
{
  data: { id: 2, title: "test", body: "test" },
  error: null,
  status: 201,
  ok: true
}
```

## .put\<T>(url, payload) - Simple PUT request

- url: `string` - The URL to request.
- payload: `Payload` - The payload to send with the request. See [Payload type](#payload-type) for more information.
- returns: `Promise<{data: <T>, error: any, status: number, ok: boolean}>` - The response from the API.

Example requests:

```ts
const result = await api.put("posts/2", {
  title: "Test",
  body: "Test",
});
```

Example response:

```ts
{
  data: { id: 2, title: "Test", body: "Test" },
  error: null,
  status: 200,
  ok: true
}
```

## .patch\<T>(url, payload) - Simple PATCH request

- url: `string` - The URL to request.
- payload: `Payload` - The payload to send with the request. See [Payload type](#payload-type) for more information.
- returns: `Promise<{data: <T>, error: any, status: number, ok: boolean}>` - The response from the API.

Example requests:

```ts
const result = await api.patch("posts/2", {
  title: "Test",
});
```

Example response:

```ts
{
  data: { id: 2, title: "Test" },
  error: null,
  status: 200,
  ok: true
}
```

## .delete\<T>(url) - Simple DELETE request

- url: `string` - The URL to request.
- returns: `Promise<{data: <T>, error: any, status: number, ok: boolean}>` - The response from the API.

Example requests:

```ts
const result = await api.delete("posts/2");
```

Example response:

```ts
{
  data: {},
  error: null,
  status: 200,
  ok: true
}
```
