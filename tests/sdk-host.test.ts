import { getLatestEmails } from '../src/mail-monster-lib';

describe('getLatestEmails host', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [] });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('uses the default API host', async () => {
    await getLatestEmails({ api_key: 'key' });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://mail-monster-api.create-flow.ai/api/latest?apikey=key',
    );
  });

  test('uses an overridden host with the same path and filters', async () => {
    await getLatestEmails({ api_key: 'key', host: 'http://localhost:3000/base/', email: 'a@example.com' });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/latest?apikey=key&email=a%40example.com',
    );
  });
});
