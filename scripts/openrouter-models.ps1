param(
  [string]$OutputPath = "dist/openrouter-models.json",
  [switch]$WriteTextList
)

$ErrorActionPreference = "Stop"

$uri = "https://openrouter.ai/api/v1/models?output_modalities=text"
$response = Invoke-RestMethod -Method Get -Uri $uri -Headers @{
  "Accept" = "application/json"
}

if ($null -eq $response.data) {
  throw "OpenRouter returned no model data."
}

$models = @(
  $response.data |
    Sort-Object id |
    ForEach-Object {
      [pscustomobject]@{
        id = $_.id
        name = $_.name
        context_length = $_.context_length
        supported_parameters = @($_.supported_parameters)
      }
    }
)

$outputFile = Join-Path (Get-Location) $OutputPath
$outputDir = Split-Path -Parent $outputFile

if (-not [string]::IsNullOrWhiteSpace($outputDir)) {
  New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

$models | ConvertTo-Json -Depth 6 | Set-Content -Path $outputFile -Encoding UTF8
Write-Host "Saved $($models.Count) OpenRouter models to $outputFile"

if ($WriteTextList) {
  $textPath = [System.IO.Path]::ChangeExtension($outputFile, ".txt")
  $lines = $models | ForEach-Object { $_.id }
  $lines | Set-Content -Path $textPath -Encoding UTF8
  Write-Host "Saved model id list to $textPath"
}

