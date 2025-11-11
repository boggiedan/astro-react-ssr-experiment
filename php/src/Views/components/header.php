<?php
/**
 * Header Component
 * Renders page header with navigation
 */
function renderHeader(string $title, string $subtitle = ''): string {
    return <<<HTML
<header class="bg-white shadow-md">
    <div class="container mx-auto px-4 py-6">
        <h1 class="text-3xl font-bold text-gray-800">{$title}</h1>
        {$subtitle}
        <nav class="mt-4 flex flex-wrap gap-4">
            <a href="/test/simple" class="text-blue-600 hover:text-blue-800 font-medium">Simple</a>
            <a href="/test/api-heavy" class="text-blue-600 hover:text-blue-800 font-medium">API Heavy</a>
            <a href="/test/cpu-intensive" class="text-blue-600 hover:text-blue-800 font-medium">CPU Intensive</a>
            <a href="/test/mixed" class="text-blue-600 hover:text-blue-800 font-medium">Mixed</a>
            <a href="/" class="text-blue-600 hover:text-blue-800 font-medium">Home</a>
        </nav>
    </div>
</header>
HTML;
}

$subtitle = $subtitle ? "<p class=\"mt-2 text-gray-600\">{$subtitle}</p>" : '';
return renderHeader($title, $subtitle);