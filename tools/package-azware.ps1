# Packages the current Azware build for Az.Armory. Read-only on the Azware project.
#  1. release\Azware.zip  <- K:\Softwares\Az.Armory\Azware\dist\Azware   (upload this to the GitHub Release)
#  2. app\azware\         <- dist\Azware\web + demo-lock.js       (the locked "Try the demo" on the site)
$ErrorActionPreference = 'Stop'
$dist = 'K:\Softwares\Az.Armory\Azware\dist\Azware'
$site = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path "$dist\Azware.exe")) { throw "No build found at $dist. Run build-app.ps1 in the Azware project first." }

New-Item -ItemType Directory -Force "$site\release" | Out-Null
Compress-Archive -Path $dist -DestinationPath "$site\release\Azware.zip" -Force

$live = "$site\app\azware"
Get-ChildItem $live -Exclude 'demo-lock.js' | Remove-Item -Recurse -Force
Copy-Item "$dist\web\*" $live -Recurse -Force
$utf8 = New-Object Text.UTF8Encoding($false)
$html = [IO.File]::ReadAllText("$live\index.html", $utf8)
$html = $html.Replace('</body>', "<script src=`"demo-lock.js`"></script>`n</body>")
$html = $html.Replace('<title>', '<meta name="robots" content="noindex"><title>')
[IO.File]::WriteAllText("$live\index.html", $html, $utf8)

Get-Item "$site\release\Azware.zip" | Select-Object Name, @{n='MB';e={[math]::Round($_.Length/1MB,2)}}
Write-Host "Demo synced to $live"
