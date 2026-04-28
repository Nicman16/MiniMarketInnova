$ErrorActionPreference = 'Stop'

$baseUrl = "https://minimarketinnova-production.up.railway.app"

Write-Host "1) Verificando /health..." -ForegroundColor Cyan
try {
  $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
  Write-Host "✅ Health OK" -ForegroundColor Green
  $health | ConvertTo-Json -Depth 10
} catch {
  Write-Host "❌ Falló /health" -ForegroundColor Red
  Write-Host $_.Exception.Message
  exit 1
}

Write-Host "`n2) Probando login..." -ForegroundColor Cyan
$body = '{"email":"jefe@demo.local","contrase\u00f1a":"DemoJefe2024!"}'

try {
  $login = Invoke-RestMethod `
    -Uri "$baseUrl/api/auth/login" `
    -Method Post `
    -ContentType "application/json; charset=utf-8" `
    -Body $body

  $token = [string]$login.token
  Write-Host "✅ Login OK" -ForegroundColor Green
  Write-Host "Usuario:" $login.usuario.email
  Write-Host "Rol:" $login.usuario.rol
  Write-Host "Token length:" $token.Length

  if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "❌ Token vacío" -ForegroundColor Red
    exit 1
  }
} catch {
  Write-Host "❌ Falló login" -ForegroundColor Red
  $statusCode = 0
  if ($_.Exception.Response) {
    $statusCode = [int]$_.Exception.Response.StatusCode
    try {
      $stream = $_.Exception.Response.GetResponseStream()
      $reader = New-Object System.IO.StreamReader($stream)
      $responseBody = $reader.ReadToEnd()
      Write-Host "Status:" $statusCode
      Write-Host "Respuesta:" $responseBody
    } catch {
      Write-Host "Status:" $statusCode
      Write-Host "(no se pudo leer cuerpo de la respuesta)"
    }
  } else {
    Write-Host $_.Exception.Message
  }
  exit 1
}

Write-Host "`n3) Probando /api/auth/me..." -ForegroundColor Cyan
try {
  $me = Invoke-RestMethod `
    -Uri "$baseUrl/api/auth/me" `
    -Method Get `
    -Headers @{ Authorization = "Bearer $token" }

  Write-Host "✅ /api/auth/me OK" -ForegroundColor Green
  $me | ConvertTo-Json -Depth 10
} catch {
  Write-Host "❌ Falló /api/auth/me" -ForegroundColor Red
  Write-Host $_.Exception.Message
  exit 1
}

Write-Host "`nListo: Railway responde correctamente." -ForegroundColor Green
