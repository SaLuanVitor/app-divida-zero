param(
    [string]$TunnelName = "divida-zero",
    [string]$ConfigPath = (Join-Path $env:USERPROFILE ".cloudflared\config.yml")
)

Write-Host "Iniciando tunnel nomeado '$TunnelName' (URL fixa: https://api.dividazeropa.sbs)..." -ForegroundColor Cyan

$procInfo = New-Object System.Diagnostics.ProcessStartInfo
$procInfo.FileName = "cloudflared"
$procInfo.Arguments = "tunnel --config `"$ConfigPath`" run $TunnelName"
$procInfo.UseShellExecute = $false

$proc = New-Object System.Diagnostics.Process
$proc.StartInfo = $procInfo

$proc.Start() | Out-Null

Write-Host "`nTunnel '$TunnelName' ativo. A API esta disponivel em:" -ForegroundColor Green
Write-Host "  https://api.dividazeropa.sbs/api/v1" -ForegroundColor Green
Write-Host "`nNao feche esta janela. Pressione Ctrl+C para encerrar.`n" -ForegroundColor Cyan

$proc.WaitForExit()
