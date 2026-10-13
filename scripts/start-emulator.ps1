$ErrorActionPreference = "Stop"

$backendRoot = Split-Path -Parent $PSScriptRoot
Set-Location $backendRoot

$settingsPath = Join-Path $backendRoot "local.settings.json"
if (-not (Test-Path $settingsPath)) {
  throw "Create local.settings.json from local.settings.json.example first."
}

$settings = Get-Content $settingsPath -Raw | ConvertFrom-Json
if ($settings.Values.FUNCTIONS_WORKER_RUNTIME -ne "node") {
  throw "Set FUNCTIONS_WORKER_RUNTIME to node in local.settings.json."
}

$match = [regex]::Match(
  [string]$settings.Values.CosmosDB,
  "AccountEndpoint=(?<endpoint>[^;]+)",
  [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
)
if (-not $match.Success) {
  throw "Set a valid CosmosDB AccountEndpoint in local.settings.json."
}

$endpoint = [Uri]$match.Groups["endpoint"].Value
if (
  $endpoint.Scheme -ne "https" -or
  $endpoint.Port -ne 8081 -or
  $endpoint.Host -notin @("localhost", "127.0.0.1")
) {
  throw "This script only supports the local Cosmos DB Emulator at https://localhost:8081."
}

$tcpClient = [System.Net.Sockets.TcpClient]::new(
  $endpoint.DnsSafeHost,
  $endpoint.Port
)
$callback = [System.Net.Security.RemoteCertificateValidationCallback]{
  param($sender, $certificate, $chain, $sslPolicyErrors)
  return $true
}
$sslStream = [System.Net.Security.SslStream]::new(
  $tcpClient.GetStream(),
  $false,
  $callback
)

try {
  $sslStream.AuthenticateAsClient($endpoint.Host)
  $emulatorCertificate =
    [System.Security.Cryptography.X509Certificates.X509Certificate2]::new(
      $sslStream.RemoteCertificate
    )
}
finally {
  $sslStream.Dispose()
  $tcpClient.Dispose()
}

if ($emulatorCertificate.GetNameInfo(
    [System.Security.Cryptography.X509Certificates.X509NameType]::SimpleName,
    $false
  ) -ne "localhost") {
  throw "The certificate presented by the emulator is not for localhost."
}

$trustedCertificates = @(
  Get-ChildItem Cert:\CurrentUser\Root, Cert:\LocalMachine\Root `
    -ErrorAction SilentlyContinue
)
$isTrusted = $trustedCertificates |
  Where-Object { $_.Thumbprint -eq $emulatorCertificate.Thumbprint } |
  Select-Object -First 1
if (-not $isTrusted) {
  throw "Trust the Cosmos DB Emulator certificate in the Windows certificate store, then retry."
}

$localDirectory = Join-Path $backendRoot ".local"
New-Item -ItemType Directory -Force -Path $localDirectory | Out-Null
$certificatePath = Join-Path $localDirectory "cosmos-emulator-ca.pem"
$base64 = [Convert]::ToBase64String(
  $emulatorCertificate.RawData,
  [Base64FormattingOptions]::InsertLineBreaks
)
$pem = "-----BEGIN CERTIFICATE-----`r`n$base64`r`n-----END CERTIFICATE-----`r`n"
[System.IO.File]::WriteAllText(
  $certificatePath,
  $pem,
  [System.Text.Encoding]::ASCII
)

$settings.Values |
  Add-Member -NotePropertyName NODE_EXTRA_CA_CERTS `
    -NotePropertyValue $certificatePath -Force
[System.IO.File]::WriteAllText(
  $settingsPath,
  ($settings | ConvertTo-Json -Depth 10),
  (New-Object System.Text.UTF8Encoding($false))
)

Write-Output "Using the Windows-trusted local emulator certificate."
npm start
exit $LASTEXITCODE
