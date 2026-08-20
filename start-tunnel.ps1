param(
    [string]$MobileEnvPath = (Join-Path $PSScriptRoot "mobile" ".env")
)

Write-Host "Iniciando tunnel Cloudflare..." -ForegroundColor Cyan

$procInfo = New-Object System.Diagnostics.ProcessStartInfo
$procInfo.FileName = "cloudflared"
$procInfo.Arguments = "tunnel --url http://localhost:3000"
$procInfo.RedirectStandardOutput = $true
$procInfo.RedirectStandardError = $true
$procInfo.UseShellExecute = $false
$procInfo.CreateNoWindow = $true

$proc = New-Object System.Diagnostics.Process
$proc.StartInfo = $procInfo

$urlRegex = [regex]'https://[a-z0-9-]+\.trycloudflare\.com'

$proc.Start() | Out-Null

# Lê stderr (cloudflared escreve a URL em stderr)
while (-not $proc.HasExited) {
    $line = $proc.StandardError.ReadLine()
    if ($line) {
        Write-Host $line -ForegroundColor Gray
        $match = $urlRegex.Match($line)
        if ($match.Success) {
            $tunnelUrl = $match.Value
            $apiUrl = "$tunnelUrl/api/v1"
            Write-Host "`nTunnel URL: $tunnelUrl" -ForegroundColor Green
            Write-Host "Atualizando $MobileEnvPath ..." -ForegroundColor Yellow
            
            $envContent = Get-Content $MobileEnvPath -Raw
            if ($envContent -match 'EXPO_PUBLIC_API_URL=.*') {
                $envContent = $envContent -replace 'EXPO_PUBLIC_API_URL=.*', "EXPO_PUBLIC_API_URL=$apiUrl"
            } else {
                $envContent += "`nEXPO_PUBLIC_API_URL=$apiUrl"
            }
            Set-Content $MobileEnvPath -Value $envContent
            Write-Host "OK! EXPO_PUBLIC_API_URL=$apiUrl" -ForegroundColor Green
            break
        }
    }
}

if (-not $proc.HasExited) {
    Write-Host "`nTunnel ativo. Pressione Ctrl+C para encerrar.`n" -ForegroundColor Cyan
    $proc.WaitForExit()
}
