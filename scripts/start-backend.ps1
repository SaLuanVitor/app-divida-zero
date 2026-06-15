param(
  [ValidateSet("dev", "homolog", "prod")]
  [string]$EnvName = "dev"
)

$backendPath = "C:\Users\luanv\Projetos\app-divida-zero\backend\api_divida_zero"

switch ($EnvName) {
  "dev" { $envFile = ".env.development" }
  "homolog" { $envFile = ".env.homolog" }
  "prod" { $envFile = ".env.production" }
}

function Load-EnvFile {
  param([string]$FilePath)
  if (-not (Test-Path $FilePath)) {
    Write-Host "Arquivo não encontrado: $FilePath" -ForegroundColor Yellow
    return
  }

  Get-Content $FilePath | ForEach-Object {
    $line = $_.Trim()
    if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith("#")) { return }
    $parts = $line.Split("=", 2)
    if ($parts.Count -eq 2) {
      [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
    }
  }
}

Set-Location $backendPath
Load-EnvFile (Join-Path $backendPath $envFile)

if ([string]::IsNullOrWhiteSpace($env:PORT)) {
  $env:PORT = "3000"
}

bundle install
ruby .\bin\rails db:prepare
ruby .\bin\rails s -p $env:PORT
