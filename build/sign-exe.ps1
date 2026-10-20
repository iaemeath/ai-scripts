# ai-scripts 构建后签名：用自签代码签名证书给产物签 Authenticode（离线，无需 signtool）。
# 证书：Cert:\CurrentUser\My，CN=ai-scripts-dev（build/ai-scripts-dev.cer 已导入本机
# LocalMachine\Root + TrustedPeople——本机弹窗消失、信任通过）。签名会失效文件的旧签名，
# 故只签我们自己的两个 exe；node.exe/elevate.exe 保留原厂签名。
$ErrorActionPreference = 'Stop'
$cert = Get-ChildItem Cert:\CurrentUser\My | Where-Object { $_.Subject -eq 'CN=ai-scripts-dev' } | Sort-Object NotBefore -Descending | Select-Object -First 1
if (-not $cert) { throw 'signing cert CN=ai-scripts-dev not found' }
$targets = @(
	'D:\cly\ai-scripts\release\win-unpacked\ai-scripts.exe',
	'D:\cly\ai-scripts\release\ai-scripts-portable.exe'
)
foreach ($f in $targets) {
	if (-not (Test-Path $f)) { throw "missing artifact: $f" }
	$r = Set-AuthenticodeSignature -FilePath $f -Certificate $cert -HashAlgorithm SHA256
	"{0}  ->  {1}" -f (Split-Path $f -Leaf), $r.Status
}
