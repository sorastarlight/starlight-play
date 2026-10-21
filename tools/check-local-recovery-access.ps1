# Uses only the human-provided DPAPI credential. No export/restore or credential output.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$recoveryRoot = Join-Path $env:LOCALAPPDATA 'PokemonStreamLink\recovery\codex65-20261021'
$credentialFile = Join-Path $recoveryRoot 'database-password.dpapi'
if (!(Test-Path -LiteralPath $credentialFile)) { throw 'Local protected database credential is not ready. No connection attempted.' }
if (Test-Path Env:CODEX65_DB_PASSWORD) { throw 'Unexpected existing credential environment; stop.' }
$recoverySid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$acl = Get-Acl -LiteralPath $recoveryRoot
$allowed = @($recoverySid, 'S-1-5-18')
if (!$acl.AreAccessRulesProtected) { throw 'Recovery workspace must disable inherited access.' }
foreach ($rule in $acl.Access) {
  if ($rule.AccessControlType -eq 'Allow' -and $rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -notin $allowed) { throw 'Unexpected workspace access principal.' }
}
$secret = (Get-Content -LiteralPath $credentialFile -Raw).Trim() | ConvertTo-SecureString
$secretPointer = [IntPtr]::Zero
try {
  $secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
  $env:CODEX65_DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
  & node (Join-Path $PSScriptRoot 'local-recovery-preflight.js')
  if ($LASTEXITCODE -ne 0) { throw 'Native read-only preflight failed. No export attempted.' }
} finally {
  Remove-Item Env:CODEX65_DB_PASSWORD -ErrorAction SilentlyContinue
  if ($secretPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer) }
  $secret.Dispose()
}
