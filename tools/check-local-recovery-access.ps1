# Uses only the human-provided DPAPI credential. Preflight is default; Plan/Drill are explicit.
[CmdletBinding()]
param([ValidateSet('Preflight','Plan','Drill')][string]$Operation = 'Preflight')
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
  if ($Operation -eq 'Preflight') {
    & node (Join-Path $PSScriptRoot 'local-recovery-preflight.js')
  } elseif ($Operation -eq 'Plan') {
    & node (Join-Path $PSScriptRoot 'local-recovery-drill.js') --plan
  } else {
    & node (Join-Path $PSScriptRoot 'local-recovery-drill.js') --run
  }
  if ($LASTEXITCODE -ne 0) { throw 'Recovery operation stopped. Inspect its safe status; no credentials are printed.' }
} finally {
  Remove-Item Env:CODEX65_DB_PASSWORD -ErrorAction SilentlyContinue
  if ($secretPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer) }
  $secret.Dispose()
}
