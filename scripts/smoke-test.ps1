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

function Get-AppStatus {
  param([string]$Path)
  try {
    $response = Invoke-WebRequest -Method Get -Uri "$BaseUrl$Path" -TimeoutSec 20
    return [int]$response.StatusCode
  } catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      return [int]$_.Exception.Response.StatusCode
    }
    throw
  }
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
Assert-Condition (@("fallback", "google") -contains $weather.provider) "Weather endpoint did not report provider fallback or google"
Write-Host "OK visit context weather provider $($weather.provider)"

$packages = Get-AppJson "/api/configurator/packages"
Assert-Condition (($packages | Measure-Object).Count -gt 0) "Configurator packages endpoint returned no data"
Write-Host "OK configurator packages"

$configurations = Get-AppJson "/api/configurator/configurations"
Assert-Condition (($configurations | Measure-Object).Count -gt 0) "Configurator configurations endpoint returned no data"
Write-Host "OK configurator configurations"

Assert-Condition ((Get-AppStatus "/api/configurator/assets/package-configurator/neck-shoulder-relief.png") -eq 200) "Owned configurator package asset did not return HTTP 200"
Write-Host "OK configurator owned package asset"

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

Assert-Condition ((Get-AppStatus "/api/aftercare/assets/aftercare-shop/heated-neck-wrap.png") -eq 200) "Owned aftercare asset did not return HTTP 200"
Write-Host "OK aftercare owned asset"

$firstProduct = @($products)[0]
$productDetail = Get-AppJson "/api/aftercare/products/$($firstProduct.slug)"
Assert-Condition ($productDetail.name -eq $firstProduct.name) "Aftercare product detail did not match list item"
Write-Host "OK aftercare product detail"

Assert-Condition ((Get-AppStatus "/media/home/home-video.mp4") -eq 200) "Homepage media exception did not return HTTP 200"
Write-Host "OK homepage media exception"

Assert-Condition ((Get-AppStatus "/api/configurator/assets/aftercare-shop/heated-neck-wrap.png") -eq 400) "Configurator asset API did not reject aftercare object prefix"
Assert-Condition ((Get-AppStatus "/api/configurator/assets/home/home-video.mp4") -eq 400) "Configurator asset API did not reject homepage media prefix"
Assert-Condition ((Get-AppStatus "/api/aftercare/assets/package-configurator/neck-shoulder-relief.png") -eq 400) "Aftercare asset API did not reject package object prefix"
Assert-Condition ((Get-AppStatus "/api/aftercare/assets/home/home-video.mp4") -eq 400) "Aftercare asset API did not reject homepage media prefix"
Write-Host "OK business asset prefix boundaries"

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
Assert-Condition ([string]::IsNullOrWhiteSpace([string]$created.id) -eq $false) "Cart add endpoint did not return an item id"

$cart = Invoke-RestMethod `
  -Method Get `
  -Uri "$BaseUrl/api/cart" `
  -WebSession $session `
  -TimeoutSec 20

$matchingItems = @($cart.items | Where-Object { $_.name -eq "Smoke Test Heat Wrap" })
Assert-Condition ($matchingItems.Count -gt 0) "Fresh-session cart item was not persisted"
Write-Host "OK fresh-session cart persistence"

$updated = Invoke-RestMethod `
  -Method Patch `
  -Uri "$BaseUrl/api/cart/items/$($created.id)" `
  -WebSession $session `
  -ContentType "application/json" `
  -Body (@{ quantity = 2 } | ConvertTo-Json) `
  -TimeoutSec 20

Assert-Condition ($updated.ok -eq $true) "Cart item PATCH did not return success"

$cartAfterPatch = Invoke-RestMethod `
  -Method Get `
  -Uri "$BaseUrl/api/cart" `
  -WebSession $session `
  -TimeoutSec 20

$patchedItems = @($cartAfterPatch.items | Where-Object { $_.id -eq $created.id -and [int]$_.quantity -eq 2 })
Assert-Condition ($patchedItems.Count -eq 1) "Patched cart item quantity was not persisted"
Write-Host "OK cart item quantity update"

Invoke-RestMethod `
  -Method Delete `
  -Uri "$BaseUrl/api/cart/items/$($created.id)" `
  -WebSession $session `
  -TimeoutSec 20 | Out-Null

$cartAfterDelete = Invoke-RestMethod `
  -Method Get `
  -Uri "$BaseUrl/api/cart" `
  -WebSession $session `
  -TimeoutSec 20

$deletedItems = @($cartAfterDelete.items | Where-Object { $_.id -eq $created.id })
Assert-Condition ($deletedItems.Count -eq 0) "Cart item DELETE did not remove the item"
Write-Host "OK cart item delete"

$clearItem = Invoke-RestMethod `
  -Method Post `
  -Uri "$BaseUrl/api/cart/items" `
  -WebSession $session `
  -ContentType "application/json" `
  -Body $cartItem `
  -TimeoutSec 20

Assert-Condition ([string]::IsNullOrWhiteSpace([string]$clearItem.id) -eq $false) "Cart add before clear did not return an item id"

Invoke-RestMethod `
  -Method Delete `
  -Uri "$BaseUrl/api/cart" `
  -WebSession $session `
  -TimeoutSec 20 | Out-Null

$cartAfterClear = Invoke-RestMethod `
  -Method Get `
  -Uri "$BaseUrl/api/cart" `
  -WebSession $session `
  -TimeoutSec 20

Assert-Condition ((@($cartAfterClear.items) | Measure-Object).Count -eq 0) "Cart CLEAR did not empty the cart"
Write-Host "OK cart clear"

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
