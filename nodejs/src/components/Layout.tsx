import React, { ReactNode } from 'react';

interface LayoutProps {
  title?: string;
  children: ReactNode;
}

/**
 * Base HTML layout wrapper
 * Provides the document structure with TailwindCSS
 */
export default function Layout({ title = 'Node.js React SSR', children }: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <title>{title}</title>
        <link rel="stylesheet" href="/assets/styles.css" />
        <style>{`
          html, body {
            margin: 0;
            width: 100%;
            height: 100%;
          }
        `}</style>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}