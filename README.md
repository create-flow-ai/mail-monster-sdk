## mail-monster-lib
Typescript library for Flow AI's MailMonster

`getLatestEmails` uses `https://mail-monster-api.create-flow.ai` by default. Set
the optional `host` parameter to an absolute URL to use another API deployment:

```ts
await getLatestEmails({ api_key: 'YOUR_API_KEY', host: 'http://localhost:3000' });
```

*Build by [create-typescript-library](https://github.com/ryancat/create-typescript-library)*
