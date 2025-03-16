# nats - NATS Wrapper

## Installation

[Installation](../common.md#installation), [Singleton Pattern](../common.md#singleton-pattern), [Multiton Pattern](../common.md#multiton-pattern) and [Default Import](../common.md#default-import) is documented in [here](../common.md)

```ts
import { nats } from "@dokuzbit/utils/server";
// or
import natsclient from "@dokuzbit/utils/server/nats";
// ☝️ We export the singleton instance as default for easy aliasing
```

## .config(config) - Initialize the database connection

- config: `object` - The configuration object for the database connection.
  - servers: `string` | `string[]` - The server or servers array to connect to.
  - user: `string` - The user to connect to the database with.
  - pass: `string` - The password to connect to the database with.

```ts
const config = {
  servers: ["nats://localhost:4222"],
  user: "root",
  pass: "password",
};
nats.config(config);
```

## .request(subject, data) - Request a message from the server

- subject: `string` - The subject to request a message from.
- data: `string` | `object` - The data to send to the server.
- options (optional): `object` - Standart NATS request options. [See NATS Request Options](https://github.com/nats-io/nats.js/blob/main/core/README.md#requestoptions)
  - timeout: `number` - The timeout for the request.
- returns: `Promise<any>` - The data returned from the server, not the original response object. This is the decoded data from the response. May be a string or an object depending on service response.

Example request:

```ts
const result = await nats.request("public.ping", "test");
```

Example response:

```json
{ "success": true, "message": "test" }
```

## .publish(subject, data) - Publish a message to the server

- subject: `string` - The subject to publish a message to.
- data: `string` | `object` - The data to send to the server.
- returns: `Promise<void>` - Returns a promise that resolves when the message is published.

Example publish:

```ts
nats.publish("public.ping", { success: true, message: "test" });
// or you can await the promise
await nats.publish("public.ping", "test");
```

## .subscribe(subject, callback) - Subscribe to a subject

- subject: `string` - The subject to subscribe to.
- callback: `function(data: any) => void` - The callback function to handle the message.
- returns: `Promise<Subscription>` - The subscription object.

Example subscribe:

```ts
nats.subscribe("public.ping", (message) => {
  console.log(message);
});
```

### Example pub / sub loop with cancel:

```ts
nats.config(NATS_URL, NATS_USER, NATS_PASS);
let count = 0;
const subscription = await nats.subscribe("public.ping", (data) => {
  if (data === "cancel") {
    cancel();
  } else {
    count++;
  }
});
for (let i = 0; i < 10; i++) {
  const data = await nats.publish("public.ping", "test");
}
await nats.publish("public.ping", "cancel");

async function cancel() {
  await nats.unsubscribe(subscription);
  await nats.disconnect();
}
```
