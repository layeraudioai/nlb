import os
import re
import shutil

def _read_php_body(path):
    with open(path, "r", encoding="utf-8") as php_file:
        source = php_file.read()
    source = re.sub(r'^\s*<\?php', '', source, count=1, flags=re.IGNORECASE)
    source = re.sub(r'\?>\s*$', '', source, count=1)
    source = re.sub(r'^\s*declare\s*\(\s*strict_types\s*=\s*1\s*\)\s*;\s*', '', source, count=1)
    source = re.sub(r'^\s*require\s+__DIR__\s*\.\s*\'/common\.php\'\s*;\s*', '', source, count=1)
    source = re.sub(r'^\s*require\s+__DIR__\s*\.\s*\'/google/common\.php\'\s*;\s*', '', source, count=1)
    return source.strip()


def build_inline_php_router(api_dir):
    common_path = os.path.join(api_dir, "google", "common.php")
    endpoint_paths = {
        "generate.php": os.path.join(api_dir, "generate.php"),
        "google/login.php": os.path.join(api_dir, "google", "login.php"),
        "google/callback.php": os.path.join(api_dir, "google", "callback.php"),
        "google/session.php": os.path.join(api_dir, "google", "session.php"),
        "google/logout.php": os.path.join(api_dir, "google", "logout.php"),
        "google/keys.php": os.path.join(api_dir, "google", "keys.php"),
        "google/keys-create.php": os.path.join(api_dir, "google", "keys-create.php"),
    }
    if not os.path.isfile(common_path):
        raise FileNotFoundError(f"Missing PHP common file: {common_path}")
    missing = [path for path in endpoint_paths.values() if not os.path.isfile(path)]
    if missing:
        raise FileNotFoundError(f"Missing PHP endpoint: {missing[0]}")

    routes = []
    for index, (route, path) in enumerate(endpoint_paths.items()):
        body = _read_php_body(path)
        branch = "if" if index == 0 else "elseif"
        routes.append(f"{branch} ($apiRoute === {route!r}) {{\n{body}\n}}")

    common = _read_php_body(common_path)
    return """<?php
declare(strict_types=1);

$apiRoute = trim((string)($_GET['api'] ?? ''), '/');
if ($apiRoute !== '') {
""" + common + "\n\n" + "\n".join(routes) + """
    exit;
}
?>
"""


def inline_assets(html_path, output_path=None, api_dir=None):
    if not os.path.isfile(html_path):
        raise FileNotFoundError(f"File not found: {html_path}")

    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()

    base_dir = os.path.dirname(html_path)

    css_files = []
    js_files = []

    # Collect CSS
    def collect_css(match):
        href = match.group(1)
        css_path = os.path.join(base_dir, href)
        if os.path.isfile(css_path):
            with open(css_path, "r", encoding="utf-8") as css_file:
                css_files.append(css_file.read())
        return ""  # Remove the tag

    html = re.sub(
        r'<link[^>]+rel=["\']stylesheet["\'][^>]+href=["\']([^"\']+)["\'][^>]*>',
        collect_css,
        html,
        flags=re.IGNORECASE
    )

    # Collect JS
    def collect_js(match):
        src = match.group(1)
        js_path = os.path.join(base_dir, src)
        if os.path.isfile(js_path):
            with open(js_path, "r", encoding="utf-8") as js_file:
                js_files.append(js_file.read())
        return ""  # Remove the tag

    html = re.sub(
        r'<script[^>]+src=["\']([^"\']+)["\'][^>]*>\s*</script>',
        collect_js,
        html,
        flags=re.IGNORECASE
    )

    # Prepare inlined tags
    inline_tags = ""
    if css_files:
        inline_tags += "<style>\n" + "\n".join(css_files) + "\n</style>\n"
    if js_files:
        inline_tags += "<script>\n" + "\n".join(js_files) + "\n</script>\n"

    # Insert after </body> (case-insensitive)
    if re.search(r'</body>', html, flags=re.IGNORECASE):
        html = re.sub(
            r'</body>',
            lambda m: m.group(0) + inline_tags,
            html,
            flags=re.IGNORECASE
        )
    else:
        html += inline_tags

    # A PHP-served AIO file routes every backend request through itself.
    # Apply this after JS inlining so URLs inside the bundled script are covered.
    if api_dir:
        html = html.replace("/api/generate.php", "?api=generate.php")
        html = html.replace("/api/google/", "?api=google/")

    output_path = output_path or html_path
    php_prefix = build_inline_php_router(api_dir) if api_dir else ""
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(php_prefix + html)

    print(f"Inlined CSS and JS into: {output_path}")
    return html


if __name__ == "__main__":
    try:
        dist_dir = os.path.abspath("../dist")
        html_path = os.path.join(dist_dir, "index.html")
        php_path = os.path.join(dist_dir, "index.php")
        api_source = os.path.abspath("../api")
        inline_assets(html_path, php_path, api_source)
        stale_api = os.path.join(dist_dir, "api")
        if os.path.isdir(stale_api):
            shutil.rmtree(stale_api)
            print(f"Removed stale API directory: {stale_api}")
    except Exception as e:
        print(f"Error: {e}")
        raise
