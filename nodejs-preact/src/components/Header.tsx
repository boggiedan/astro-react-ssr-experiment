interface HeaderProps {
  title: string;
  subtitle?: string;
}

/**
 * Simple header component for test pages
 */
export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
        {subtitle && <p className="mt-2 text-gray-600">{subtitle}</p>}
        <nav className="mt-4 flex flex-wrap gap-4">
          <a href="/test/simple" className="text-blue-600 hover:text-blue-800 font-medium">Simple</a>
          <a href="/test/api-heavy" className="text-blue-600 hover:text-blue-800 font-medium">API Heavy</a>
          <a href="/test/cpu-intensive" className="text-blue-600 hover:text-blue-800 font-medium">CPU Intensive</a>
          <a href="/test/mixed" className="text-blue-600 hover:text-blue-800 font-medium">Mixed</a>
          <a href="/" className="text-blue-600 hover:text-blue-800 font-medium">Home</a>
        </nav>
      </div>
    </header>
  );
}