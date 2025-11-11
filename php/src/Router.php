<?php

namespace App;

class Router
{
    private array $routes = [];
    private string $requestUri;
    private string $requestMethod;
    private array $queryParams;

    public function __construct()
    {
        $this->requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $this->requestMethod = $_SERVER['REQUEST_METHOD'];
        $this->queryParams = [];
        parse_str($_SERVER['QUERY_STRING'] ?? '', $this->queryParams);
    }

    /**
     * Register a GET route
     */
    public function get(string $pattern, callable $handler): void
    {
        $this->addRoute('GET', $pattern, $handler);
    }

    /**
     * Register a POST route
     */
    public function post(string $pattern, callable $handler): void
    {
        $this->addRoute('POST', $pattern, $handler);
    }

    /**
     * Add a route to the registry
     */
    private function addRoute(string $method, string $pattern, callable $handler): void
    {
        $this->routes[] = [
            'method' => $method,
            'pattern' => $pattern,
            'handler' => $handler,
        ];
    }

    /**
     * Dispatch the current request
     */
    public function dispatch(): void
    {
        foreach ($this->routes as $route) {
            if ($route['method'] !== $this->requestMethod) {
                continue;
            }

            $pattern = $this->convertPatternToRegex($route['pattern']);

            if (preg_match($pattern, $this->requestUri, $matches)) {
                // Remove the full match
                array_shift($matches);

                // Call the handler with matches and query params
                $response = call_user_func($route['handler'], $matches, $this->queryParams);

                if (is_array($response)) {
                    // JSON response
                    header('Content-Type: application/json');
                    echo json_encode($response);
                } else {
                    // HTML response
                    echo $response;
                }
                return;
            }
        }

        // 404 Not Found
        http_response_code(404);
        echo '<!DOCTYPE html>
<html>
<head>
    <title>404 Not Found</title>
    <style>
        body { font-family: system-ui; max-width: 600px; margin: 100px auto; text-align: center; }
        h1 { color: #ef4444; }
    </style>
</head>
<body>
    <h1>404 Not Found</h1>
    <p>The requested URL ' . htmlspecialchars($this->requestUri) . ' was not found on this server.</p>
</body>
</html>';
    }

    /**
     * Convert route pattern to regex
     * Examples:
     *   /api/user -> ^/api/user$
     *   /test/:name -> ^/test/([^/]+)$
     */
    private function convertPatternToRegex(string $pattern): string
    {
        // Escape forward slashes
        $pattern = str_replace('/', '\/', $pattern);

        // Convert :param to regex capture groups
        $pattern = preg_replace('/:\w+/', '([^\/]+)', $pattern);

        // Add anchors
        return '/^' . $pattern . '$/';
    }

    /**
     * Get query parameters
     */
    public function getQueryParams(): array
    {
        return $this->queryParams;
    }

    /**
     * Get a specific query parameter
     */
    public function getQueryParam(string $key, mixed $default = null): mixed
    {
        return $this->queryParams[$key] ?? $default;
    }
}