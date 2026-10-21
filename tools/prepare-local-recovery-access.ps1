# Human-run access step only. Does not export data, reset a password or change Supabase.
[CmdletBinding()]
param([switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
$recoveryRoot = Join-Path $env:LOCALAPPDATA 'PokemonStreamLink\recovery\codex65-20261021'
$recoverySid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$metadataFile = Join-Path $recoveryRoot 'workspace.json'
if (!(Test-Path -LiteralPath $metadataFile)) {
  # Prepare in the human session too: its profile location may differ from the runner's.
  if (Test-Path -LiteralPath $recoveryRoot) {
    if (@(Get-ChildItem -LiteralPath $recoveryRoot -Force).Count) { throw 'Unrecognized nonempty recovery directory. Stop; do not overwrite it.' }
  } else { New-Item -ItemType Directory -Path $recoveryRoot -Force | Out-Null }
  & icacls $recoveryRoot /inheritance:r /grant:r "*$($recoverySid):(OI)(CI)F" '*S-1-5-18:(OI)(CI)F' | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Restricted workspace permissions could not be set.' }
  @{projectRef='dtflmlbjhttoewqgkujf';ownerSid=$recoverySid;purpose='Approved CODEX-65 local drill';dataExported=$false;runtimeStarted=$false} | ConvertTo-Json | Set-Content -LiteralPath $metadataFile -Encoding UTF8
}
$workspaceAcl = Get-Acl -LiteralPath $recoveryRoot
if (!$workspaceAcl.AreAccessRulesProtected) { throw 'Workspace permissions must disable inheritance.' }
foreach ($rule in $workspaceAcl.Access) {
  if ($rule.AccessControlType -eq 'Allow' -and $rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -notin @($recoverySid,'S-1-5-18')) { throw 'Unexpected workspace access principal. Stop.' }
}
$metadata = Get-Content -LiteralPath (Join-Path $recoveryRoot 'workspace.json') -Raw | ConvertFrom-Json
if ($metadata.projectRef -ne 'dtflmlbjhttoewqgkujf') { throw 'Wrong project. Stop.' }
if ($metadata.ownerSid -and $metadata.ownerSid -ne $recoverySid) { throw 'Workspace belongs to a different Windows account. Stop.' }
Write-Host "Recovery workspace: $recoveryRoot"
Write-Host "Computer: $env:COMPUTERNAME; Windows account: $([Security.Principal.WindowsIdentity]::GetCurrent().Name)"
if ($CheckOnly) { Write-Host 'Restricted workspace check passed. No credential requested or stored.'; return }
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
