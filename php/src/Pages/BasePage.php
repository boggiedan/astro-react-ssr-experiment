<?php

namespace App\Pages;

abstract class BasePage
{
    protected float $startTime;

    public function __construct()
    {
        $this->startTime = microtime(true);
    }

    /**
     * Render the page
     */
    abstract public function render(): string;

    /**
     * Get elapsed time in milliseconds
     */
    protected function getElapsedTime(): float
    {
        return round((microtime(true) - $this->startTime) * 1000, 2);
    }

    /**
     * Wrap content in layout
     */
    protected function layout(string $content, string $title = 'PHP SSR Test'): string
    {
        ob_start();
        include __DIR__ . '/../Views/layout.php';
        return ob_get_clean();
    }
}