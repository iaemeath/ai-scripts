# one-off: create desktop shortcuts for ai-scripts start/stop
$desktop = [Environment]::GetFolderPath('Desktop')
$ws = New-Object -ComObject WScript.Shell

$items = @(
    @{ name = 'ai-scripts 启动'; target = 'D:\cly\ai-scripts\start.bat'; desc = '启动 ai-scripts 脚本卡片控制台' }
)

foreach ($it in $items) {
    $path = Join-Path $desktop ($it.name + '.lnk')
    $lnk = $ws.CreateShortcut($path)
    $lnk.TargetPath = $it.target
    $lnk.WorkingDirectory = 'D:\cly\ai-scripts'
    $lnk.Description = $it.desc
    $lnk.WindowStyle = 7   # minimized
    $lnk.Save()
    Write-Host "created: $path"
}
