
interface ProcessedItem {
  id: number;
  value: number;
  label: string;
  category: string;
  rank: number;
}

interface DataProcessorProps {
  items: ProcessedItem[];
}

/**
 * Component that performs heavy data processing during render
 * Tests CPU-intensive SSR scenarios
 */
export default function DataProcessor({ items }: DataProcessorProps) {
  // Group by category (CPU work)
  const grouped = items.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, ProcessedItem[]>,
  );

  // Calculate category statistics
  const categoryStats = Object.entries(grouped).map(
    ([category, categoryItems]) => {
      const sum = categoryItems.reduce((acc, item) => acc + item.value, 0);
      const avg = sum / categoryItems.length;
      const max = Math.max(...categoryItems.map((i) => i.value));
      const min = Math.min(...categoryItems.map((i) => i.value));

      return {
        category,
        count: categoryItems.length,
        avg,
        max,
        min,
        sum,
      };
    },
  );

  // Sort by average value
  categoryStats.sort((a, b) => b.avg - a.avg);

  // Get top items across all categories
  const topItems = [...items].sort((a, b) => b.value - a.value).slice(0, 20);

  return (
    <div className="w-full">
      <h3 className="mb-6 text-2xl font-bold text-gray-800">Processed Data Analysis</h3>

      <section className="mb-8">
        <h4 className="mb-4 text-xl font-semibold text-gray-700">Category Statistics</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full rounded-lg border border-gray-200 bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Count</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Average</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Min</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Max</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {categoryStats.map((stat) => (
                <tr key={stat.category} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{stat.category}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{stat.count}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{stat.avg.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{stat.min.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{stat.max.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{stat.sum.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h4 className="mb-4 text-xl font-semibold text-gray-700">Top 20 Items by Value</h4>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
          {topItems.map((item) => (
            <div key={item.id} className="rounded-lg border border-gray-200 bg-gradient-to-br from-blue-50 to-purple-50 p-3 text-center">
              <div className="text-xs font-bold text-gray-500">#{item.rank}</div>
              <div className="my-1 text-sm font-semibold text-gray-800">{item.label}</div>
              <div className="text-lg font-bold text-blue-600">{item.value.toFixed(2)}</div>
              <div className="text-xs text-gray-500">{item.category}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h4 className="mb-4 text-xl font-semibold text-gray-700">Value Distribution</h4>
        <div className="space-y-3">
          {categoryStats.map((stat) => (
            <div key={stat.category} className="mb-2 flex items-center gap-3">
              <span className="w-24 text-sm font-medium text-gray-700">{stat.category}</span>
              <div className="h-6 flex-1 rounded bg-gray-200">
                <div
                  className="h-full rounded bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                  style={{
                    width: `${(stat.avg / Math.max(...categoryStats.map((s) => s.avg))) * 100}%`,
                  }}
                />
              </div>
              <span className="w-16 text-right text-sm font-semibold text-gray-700">{stat.avg.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}