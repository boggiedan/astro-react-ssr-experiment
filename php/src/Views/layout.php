<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <meta name="generator" content="PHP <?= PHP_VERSION ?>">
    <title><?= htmlspecialchars($title ?? 'PHP SSR Test') ?></title>
    <link rel="stylesheet" href="/assets/styles.css">
</head>
<body>
    <?= $content ?>
</body>
</html>