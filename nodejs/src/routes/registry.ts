/**
 * Route Registry
 *
 * Central registry of all application routes
 */

import type { RouteDefinition } from './types.js';
import { renderHomePage } from '../pages/HomePage.js';
import { renderSimpleTestPage } from '../pages/SimpleTestPage.js';
import { renderApiHeavyTestPage } from '../pages/ApiHeavyTestPage.js';
import { renderCpuIntensiveTestPage } from '../pages/CpuIntensiveTestPage.js';
import { renderMixedTestPage } from '../pages/MixedTestPage.js';
import { fetchParallel } from '../lib/http-client.js';
import { processData, generateChartData, performComplexCalculations, simulateHeavyComputation } from '../lib/dataProcessing.js';

/**
 * All application routes
 */
export const routes: RouteDefinition[] = [
  {
    name: 'Home',
    pattern: /^\/$/,
    renderer: renderHomePage,
    meta: {
      type: 'simple',
      description: 'Landing page with test scenario cards'
    }
  },

  {
    name: 'Simple Test',
    pattern: /^\/test\/simple$/,
    renderer: renderSimpleTestPage,
    meta: {
      type: 'simple',
      estimatedTime: 20,
      description: 'Baseline SSR test with minimal complexity'
    }
  },

  {
    name: 'API-Heavy Test',
    pattern: /^\/test\/api-heavy$/,
    dataFetcher: async (url, ctx) => {
      const startTime = Date.now();

      // Fetch from mock APIs with delays (parallel requests)
      const data = await fetchParallel({
        user: `${ctx.apiBaseUrl}/api/user?delay=100`,
        posts: `${ctx.apiBaseUrl}/api/posts?delay=150&count=10`,
        comments: `${ctx.apiBaseUrl}/api/comments?delay=200&count=20`
      });

      const renderTime = Date.now() - startTime;

      return {
        ...data,
        renderTime
      };
    },
    renderer: renderApiHeavyTestPage,
    meta: {
      type: 'io-heavy',
      estimatedTime: 450,
      description: 'Multiple sequential API calls simulating I/O-bound scenarios'
    }
  },

  {
    name: 'CPU-Intensive Test',
    pattern: /^\/test\/cpu-intensive$/,
    dataFetcher: async (url, ctx) => {
      const startTime = Date.now();

      // Generate realistic large dataset
      const dataset = Array.from({ length: 2500 }, (_, i) => ({
        id: i + 1,
        value: Math.random() * 100,
        label: `Item ${i + 1}`,
        category: ['Electronics', 'Books', 'Clothing', 'Food', 'Toys'][
          Math.floor(Math.random() * 5)
        ],
      }));

      // Perform realistic CPU-intensive calculations
      const processed = processData(dataset);
      const chartData = generateChartData(processed);
      const statistics = performComplexCalculations(dataset);

      // Simulate heavy computation
      simulateHeavyComputation(750000);

      const renderTime = Date.now() - startTime;

      return {
        dataset,
        processed,
        chartData,
        statistics,
        renderTime
      };
    },
    renderer: renderCpuIntensiveTestPage,
    meta: {
      type: 'cpu-intensive',
      estimatedTime: 400,
      description: 'Heavy analytics dashboard with data processing and calculations'
    }
  },

  {
    name: 'Mixed Scenario Test',
    pattern: /^\/test\/mixed$/,
    dataFetcher: async (url, ctx) => {
      const startTime = Date.now();

      // Fetch data from API (I/O bound - 30%)
      const response = await fetch(`${ctx.apiBaseUrl}/api/data?delay=150&count=300`);
      const apiData = await response.json();

      const apiTime = Date.now() - startTime;

      // Process the data (CPU bound - 70%)
      const processed = processData(apiData);
      const chartData = generateChartData(processed);

      // Group by category for display
      const byCategory = processed.reduce(
        (acc, item) => {
          if (!acc[item.category]) {
            acc[item.category] = [];
          }
          acc[item.category].push(item);
          return acc;
        },
        {} as Record<string, typeof processed>
      );

      // Calculate category stats
      const categoryStats = Object.entries(byCategory)
        .map(([category, items]) => {
          const sum = items.reduce((acc, item) => acc + item.value, 0);
          const avg = sum / items.length;
          return { category, count: items.length, avg, sum };
        })
        .sort((a, b) => b.avg - a.avg);

      const totalTime = Date.now() - startTime;
      const cpuTime = totalTime - apiTime;

      return {
        processed,
        chartData,
        categoryStats,
        apiTime,
        cpuTime,
        totalTime
      };
    },
    renderer: renderMixedTestPage,
    meta: {
      type: 'mixed',
      estimatedTime: 300,
      description: 'Real-world combination of API calls (30%) and CPU work (70%)'
    }
  }
];