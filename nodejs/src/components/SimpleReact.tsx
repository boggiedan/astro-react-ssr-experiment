import React from 'react';

interface SimpleReactProps {
  message: string;
  count: number;
}

/**
 * Simple React component for baseline SSR testing
 * Minimal rendering logic, no complex operations
 */
export default function SimpleReact({ message, count }: SimpleReactProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="w-full rounded-lg bg-white p-6 shadow-lg">
      <h2 className="mb-4 text-2xl font-bold text-gray-800">{message}</h2>
      <p className="mb-4 text-gray-600">This is a simple React component with {count} items.</p>
      <ul className="space-y-1 list-disc list-inside text-gray-700">
        {items.map((item) => (
          <li key={item}>Item {item}</li>
        ))}
      </ul>
    </div>
  );
}