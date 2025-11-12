/**
 * /api/posts endpoint
 *
 * Returns mock posts data
 */

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function handlePosts(url: URL): Promise<any[]> {
  const delayMs = parseInt(url.searchParams.get('delay') || '0', 10);
  const count = parseInt(url.searchParams.get('count') || '10', 10);

  if (delayMs > 0) {
    await delay(delayMs);
  }

  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    userId: 1,
    title: `Post ${i + 1}: Sample Blog Post Title`,
    body: `This is the body of post ${i + 1}. It contains some sample text to demonstrate the API response structure.`
  }));
}