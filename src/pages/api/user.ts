import type { APIRoute } from 'astro';

/**
 * Mock user API endpoint
 * Simulates database/external API call with configurable delay
 */
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const delay = parseInt(url.searchParams.get('delay') || process.env.API_DELAY_MS || '50');

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, delay));

  const user = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    username: 'testuser',
    address: {
      street: '123 Test St',
      city: 'Test City',
      zipcode: '12345'
    },
    phone: '555-1234',
    website: 'test.example.com'
  };

  return new Response(JSON.stringify(user), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
};