import type { APIRoute } from 'astro';

/**
 * Mock comments API endpoint
 * Simulates fetching comments with configurable delay
 */
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const delay = parseInt(url.searchParams.get('delay') || process.env.API_DELAY_MS || '150');
  const count = parseInt(url.searchParams.get('count') || '20');

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, delay));

  const comments = Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    postId: Math.floor(i / 2) + 1,
    name: `Commenter ${i + 1}`,
    email: `commenter${i + 1}@example.com`,
    body: `This is comment ${i + 1}. It provides feedback or additional information about the post. Comments can vary in length and complexity.`
  }));

  return new Response(JSON.stringify(comments), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
};