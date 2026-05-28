param(
  [string]$BaseUrl = "http://localhost:4100",
  [switch]$SkipAi
)

$ErrorActionPreference = "Stop"

function Assert-Condition {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) { throw $Message }
}

function Get-AppJson {
  param([string]$Path)
  Invoke-RestMethod -Method Get -Uri "$BaseUrl$Path" -TimeoutSec 20
}

Write-Host "Smoke target: $BaseUrl"

$homeResponse = Invoke-WebRequest -Method Get -Uri "$BaseUrl/" -TimeoutSec 20
Assert-Condition ($homeResponse.StatusCode -eq 200) "Home page did not return HTTP 200"
Assert-Condition ($homeResponse.Content -match "Wellness Center") "Home page response did not contain Wellness Center content"
Write-Host "OK home page"

$locations = Get-AppJson "/api/visit-context/locations"
Assert-Condition (($locations | Measure-Object).Count -gt 0) "Visit context locations endpoint returned no data"
Write-Host "OK visit context locations"

$weather = Get-AppJson "/api/visit-context/weather/current"
Assert-Condition ([string]::IsNullOrWhiteSpace($weather.summary) -eq $false) "Weather endpoint returned no summary"
Write-Host "OK visit context weather"

$packages = Get-AppJson "/api/configurator/packages"
Assert-Condition (($packages | Measure-Object).Count -gt 0) "Configurator packages endpoint returned no data"
Write-Host "OK configurator packages"

$calcBody = @{
  package = "neck-shoulder-relief"
  duration = 60
  intensity = "medium"
  addOns = @("aroma-oil")
} | ConvertTo-Json -Depth 5

$configured = Invoke-RestMethod `
  -Method Post `
  -Uri "$BaseUrl/api/configurator/configuration/calculate" `
  -ContentType "application/json" `
  -Body $calcBody `
  -TimeoutSec 20

Assert-Condition ($configured.name -or $configured.package) "Configurator calculate endpoint did not return a configured result"
Write-Host "OK configurator calculate"

$products = Get-AppJson "/api/aftercare/products"
Assert-Condition (($products | Measure-Object).Count -gt 0) "Aftercare products endpoint returned no data"
Write-Host "OK aftercare products"

$firstProduct = @($products)[0]
$productDetail = Get-AppJson "/api/aftercare/products/$($firstProduct.slug)"
Assert-Condition ($productDetail.name -eq $firstProduct.name) "Aftercare product detail did not match list item"
Write-Host "OK aftercare product detail"

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$cartItem = @{
  type = "aftercare"
  name = "Smoke Test Heat Wrap"
  price = 1.23
  quantity = 1
  imageUrl = $null
  details = @{ source = "smoke-test" }
} | ConvertTo-Json -Depth 5

$created = Invoke-RestMethod `
  -Method Post `
  -Uri "$BaseUrl/api/cart/items" `
  -WebSession $session `
  -ContentType "application/json" `
  -Body $cartItem `
  -TimeoutSec 20

Assert-Condition ($created.name -eq "Smoke Test Heat Wrap") "Cart add endpoint did not return the created item"

$cart = Invoke-RestMethod `
  -Method Get `
  -Uri "$BaseUrl/api/cart" `
  -WebSession $session `
  -TimeoutSec 20

$matchingItems = @($cart.items | Where-Object { $_.name -eq "Smoke Test Heat Wrap" })
Assert-Condition ($matchingItems.Count -gt 0) "Fresh-session cart item was not persisted"
Write-Host "OK fresh-session cart persistence"

if (-not $SkipAi) {
  $aiBody = @{
    prompt = "My shoulders feel tense and I want one calming aftercare product."
  } | ConvertTo-Json

  $ai = Invoke-RestMethod `
    -Method Post `
    -Uri "$BaseUrl/api/ai/recommend" `
    -ContentType "application/json" `
    -Body $aiBody `
    -TimeoutSec 60

  Assert-Condition ([string]::IsNullOrWhiteSpace($ai.text) -eq $false) "AI recommendation did not include text"
  Assert-Condition ($null -ne $ai.packageLink -or (($ai.aftercareLinks | Measure-Object).Count -gt 0)) "AI recommendation did not include links"
  Write-Host "OK AI recommendation"
} else {
  Write-Host "SKIP AI recommendation"
}

Write-Host "Smoke test passed"
