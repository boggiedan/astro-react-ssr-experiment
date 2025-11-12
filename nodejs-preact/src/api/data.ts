/**
 * /api/data endpoint
 *
 * Returns dataset for CPU-intensive tests
 */

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const CATEGORIES = ['Electronics', 'Books', 'Clothing', 'Food', 'Toys'];

export async function handleData(url: URL): Promise<any[]> {
  const delayMs = parseInt(url.searchParams.get('delay') || '0', 10);
  const count = parseInt(url.searchParams.get('count') || '300', 10);

  if (delayMs > 0) {
    await delay(delayMs);
  }

  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    value: Math.random() * 100,
    label: `Item ${i + 1}`,
    category: CATEGORIES[i % CATEGORIES.length]
  }));
}