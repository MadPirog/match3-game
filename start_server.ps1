$server = [System.Net.HttpListener]::new()
$server.Prefixes.Add('http://*:8080/')
try {
    $server.Start()
} catch {
    # Try without admin (might not work for all URLs)
    $server.Close()
    $server = [System.Net.HttpListener]::new()
    $server.Prefixes.Add('http://localhost:8080/')
    $server.Prefixes.Add('http://127.0.0.1:8080/')
    $server.Start()
}
Write-Output "Server started on http://localhost:8080/"

while ($true) {
    $ctx = $server.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response

    $path = $req.Url.AbsolutePath.TrimStart('/').Replace('/', '\')
    if ([string]::IsNullOrEmpty($path)) { $path = 'index.html' }

    $filePath = Join-Path 'C:\match3-game-master' $path
    if (Test-Path $filePath -PathType Leaf) {
        $content = [System.IO.File]::ReadAllBytes($filePath)
        $ext = [System.IO.Path]::GetExtension($filePath)
        $mime = switch ($ext) {
            '.html' { 'text/html; charset=utf-8' }
            '.css'  { 'text/css; charset=utf-8' }
            '.js'   { 'application/javascript; charset=utf-8' }
            '.png'  { 'image/png' }
            default { 'application/octet-stream' }
        }
        $res.ContentType = $mime
        $res.ContentLength64 = $content.Length
        $res.OutputStream.Write($content, 0, $content.Length)
    } else {
        $res.StatusCode = 404
    }
    $res.Close()
}
