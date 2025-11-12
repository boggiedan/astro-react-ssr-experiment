/**
 * /api/user endpoint
 *
 * Returns mock user data
 */

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function handleUser(url: URL): Promise<any> {
  const delayMs = parseInt(url.searchParams.get('delay') || '0', 10);

  if (delayMs > 0) {
    await delay(delayMs);
  }

  return {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@example.com',
    username: 'johndoe',
    phone: '+1-555-0123',
    website: 'example.com'
  };
}