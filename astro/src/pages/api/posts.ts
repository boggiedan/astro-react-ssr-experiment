import type { APIRoute } from 'astro';

/**
 * Mock posts API endpoint
 * Simulates fetching multiple posts with configurable delay
 */
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const delay = parseInt(url.searchParams.get('delay') || process.env.API_DELAY_MS || '100');
  const count = parseInt(url.searchParams.get('count') || '10');

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, delay));

  const posts = Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    userId: 1,
    title: `Test Post ${i + 1}`,
    body: `This is the content of test post ${i + 1}. It contains some sample text to simulate a real blog post or article. The content can be of varying lengths to test different rendering scenarios.`
  }));

  return new Response(JSON.stringify(posts), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
};