import type { APIRoute } from 'astro';

/**
 * Mock generic data API endpoint
 * Returns large dataset for CPU-intensive processing
 */
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const delay = parseInt(url.searchParams.get('delay') || process.env.API_DELAY_MS || '200');
  const count = parseInt(url.searchParams.get('count') || '500');

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, delay));

  const categories = ['Electronics', 'Books', 'Clothing', 'Food', 'Toys', 'Sports'];

  const data = Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    value: Math.random() * 100,
    label: `Item ${i + 1}`,
    category: categories[Math.floor(Math.random() * categories.length)],
    timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    metadata: {
      popularity: Math.floor(Math.random() * 1000),
      rating: (Math.random() * 5).toFixed(1),
      inStock: Math.random() > 0.2
    }
  }));

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
};