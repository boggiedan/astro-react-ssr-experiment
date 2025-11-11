<?php

/**
 * Front Controller for PHP SSR Performance Testing
 *
 * This is the entry point for all requests to the PHP application.
 */

// Enable error reporting (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', '1');

// Autoloader
spl_autoload_register(function ($class) {
    $prefix = 'App\\';
    $base_dir = __DIR__ . '/../src/';

    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }

    $relative_class = substr($class, $len);
    $file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';

    if (file_exists($file)) {
        require $file;
    }
});

use App\Router;

// Serve static assets directly
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (preg_match('/\.(css|js|svg|png|jpg|jpeg|gif|ico)$/', $requestUri)) {
    $filePath = __DIR__ . $requestUri;
    if (file_exists($filePath)) {
        $mimeTypes = [
            'css' => 'text/css',
            'js' => 'application/javascript',
            'svg' => 'image/svg+xml',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'ico' => 'image/x-icon',
        ];
        $extension = pathinfo($filePath, PATHINFO_EXTENSION);
        $contentType = $mimeTypes[$extension] ?? 'application/octet-stream';

        header("Content-Type: $contentType");
        readfile($filePath);
        exit;
    } else {
        http_response_code(404);
        exit;
    }
}

// Create router instance
$router = new Router();

// ============================================================================
// API Routes
// ============================================================================

$router->get('/api/server-info', function ($params, $query) {
    return require __DIR__ . '/../src/Api/ServerInfo.php';
});

$router->get('/api/user', function ($params, $query) {
    return require __DIR__ . '/../src/Api/User.php';
});

$router->get('/api/posts', function ($params, $query) {
    return require __DIR__ . '/../src/Api/Posts.php';
});

$router->get('/api/comments', function ($params, $query) {
    return require __DIR__ . '/../src/Api/Comments.php';
});

$router->get('/api/data', function ($params, $query) {
    return require __DIR__ . '/../src/Api/Data.php';
});

$router->get('/api/metrics', function ($params, $query) {
    return require __DIR__ . '/../src/Api/Metrics.php';
});

// ============================================================================
// Page Routes
// ============================================================================

$router->get('/', function ($params, $query) {
    $page = new \App\Pages\Home();
    return $page->render();
});

$router->get('/test/simple', function ($params, $query) {
    $page = new \App\Pages\SimpleTest();
    return $page->render();
});

$router->get('/test/api-heavy', function ($params, $query) {
    $page = new \App\Pages\ApiHeavyTest();
    return $page->render();
});

$router->get('/test/cpu-intensive', function ($params, $query) {
    $page = new \App\Pages\CpuIntensiveTest();
    return $page->render();
});

$router->get('/test/mixed', function ($params, $query) {
    $page = new \App\Pages\MixedTest();
    return $page->render();
});

// Dispatch the request
$router->dispatch();