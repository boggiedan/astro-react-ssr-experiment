/**
 * /api/comments endpoint
 *
 * Returns mock comments data
 */

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function handleComments(url: URL): Promise<any[]> {
  const delayMs = parseInt(url.searchParams.get('delay') || '0', 10);
  const count = parseInt(url.searchParams.get('count') || '20', 10);

  if (delayMs > 0) {
    await delay(delayMs);
  }

  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    postId: Math.floor(i / 2) + 1,
    name: `Commenter ${i + 1}`,
    email: `commenter${i + 1}@example.com`,
    body: `This is comment ${i + 1}. It provides feedback or additional information about the post.`
  }));
}