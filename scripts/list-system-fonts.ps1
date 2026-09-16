$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Drawing
$collection = [System.Drawing.Text.InstalledFontCollection]::new()
try {
  $families = @($collection.Families | ForEach-Object { $_.Name })
  $files = @()
  foreach ($registryPath in @('HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts', 'HKCU:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts')) {
    if (Test-Path -LiteralPath $registryPath) {
      $key = Get-Item -LiteralPath $registryPath
      foreach ($name in $key.GetValueNames()) {
        $value = $key.GetValue($name)
        if ($value -is [string] -and $value -match '\.(ttf|otf|ttc|otc)$') {
          if (-not [System.IO.Path]::IsPathRooted($value)) { $value = Join-Path -Path "$env:WINDIR\Fonts" -ChildPath $value }
          $files += $value
        }
      }
    }
  }
  @{ families = @($families | Sort-Object -Unique); files = @($files | Sort-Object -Unique) } | ConvertTo-Json -Depth 4 -Compress
} finally { $collection.Dispose() }
