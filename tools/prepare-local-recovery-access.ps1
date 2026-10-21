# Human-run access step only. Does not export data, reset a password or change Supabase.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$recoveryRoot = Join-Path $env:LOCALAPPDATA 'PokemonStreamLink\recovery\codex65-20261021'
if (!(Test-Path -LiteralPath (Join-Path $recoveryRoot 'workspace.json'))) {
  throw 'Restricted recovery workspace is not prepared. Stop and return to Codex.'
}
$metadata = Get-Content -LiteralPath (Join-Path $recoveryRoot 'workspace.json') -Raw | ConvertFrom-Json
if ($metadata.projectRef -ne 'dtflmlbjhttoewqgkujf') { throw 'Wrong project. Stop.' }
$credentialFile = Join-Path $recoveryRoot 'database-password.dpapi'
if (Test-Path -LiteralPath $credentialFile) { throw 'A credential file already exists; do not overwrite it.' }
Write-Host 'Enter the EXISTING starlight-play database password locally. Do not paste it into chat.'
Write-Host 'This only stores a current-Windows-user DPAPI-protected credential outside Git. No database call runs.'
$databaseSecret = Read-Host 'Existing database password (blank cancels)' -AsSecureString
if ($databaseSecret.Length -eq 0) { throw 'Cancelled; no credential stored.' }
try {
  $databaseSecret | ConvertFrom-SecureString | Set-Content -LiteralPath $credentialFile -Encoding ASCII
  Write-Host 'Protected credential saved. Tell Codex the local access step is ready; do not send the password.'
} finally { $databaseSecret.Dispose() }
