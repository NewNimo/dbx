<#
.SYNOPSIS
    DBX Windows 安装包编译打包脚本 (PowerShell 7)

.DESCRIPTION
    一键构建 DBX 的 Windows 发行版安装包（NSIS .exe / MSI / 独立免安装程序）。
    支持自动检测构建依赖、前端预编译、Tauri 原生编译打包与结果校验。

.PARAMETER Bundle
    打包类型：
    - "nsis" (默认): 生成主流的 NSIS 安装向导安装包 (.exe)
    - "msi": 生成 Windows Installer 安装包 (.msi)
    - "all": 同时生成 NSIS 和 MSI 安装包
    - "none": 仅编译 Release 可执行文件 (.exe)，不生成安装包

.PARAMETER Target
    编译目标架构，默认为 "x86_64-pc-windows-msvc" (64位)。
    支持 "aarch64-pc-windows-msvc" (ARM64)。

.PARAMETER OfflineWebView2
    是否使用内置 WebView2 离线运行时配置进行打包（适合内网无外网环境）。

.PARAMETER Clean
    编译前是否清理旧的 dist 与 target 输出目录。

.PARAMETER SkipFrontend
    跳过前端构建（仅在 dist/ 已经构建且未改动前端时使用以加速）。

.PARAMETER DebugBuild
    以 Debug 模式编译（默认构建 Release 优化版）。

.PARAMETER OpenOutput
    编译完成后自动打开安装包所在文件夹。

.EXAMPLE
    pwsh ./scripts/build-windows.ps1
    # 默认构建 NSIS 安装包 (DBX_0.6.6_x64-setup.exe)

.EXAMPLE
    pwsh ./scripts/build-windows.ps1 -Bundle all -OpenOutput
    # 同时生成 exe 与 msi 安装包并打开输出目录

.EXAMPLE
    pwsh ./scripts/build-windows.ps1 -OfflineWebView2
    # 构建包含 WebView2 离线运行时的安装包
#>

[CmdletBinding()]
param(
    [ValidateSet("nsis", "msi", "all", "none")]
    [string]$Bundle = "nsis",

    [string]$Target = "x86_64-pc-windows-msvc",

    [switch]$OfflineWebView2,

    [switch]$Clean,

    [switch]$SkipFrontend,

    [switch]$DebugBuild,

    [switch]$OpenOutput
)

$ErrorActionPreference = "Stop"

# 1. 路径定位
$repoRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
Set-Location -LiteralPath $repoRoot

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "       DBX Windows 打包编译脚本 (PowerShell 7)      " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "[1/5] 项目根目录: $repoRoot" -ForegroundColor DarkGray

# 2. 依赖环境检查
Write-Host "`n[2/5] 检查构建环境..." -ForegroundColor Yellow

function Assert-ToolInstalled {
    param([string]$Name, [string]$Command, [string]$VersionArg = "--version")
    $tool = Get-Command $Command -ErrorAction SilentlyContinue
    if (-not $tool) {
        Write-Error "未找到命令 '$Command' ($Name)。请确保已正确安装并添加到 PATH 环境变量中。"
        exit 1
    }
    $ver = & $Command $VersionArg 2>&1 | Select-Object -First 1
    Write-Host "  ✔ $Name : $ver" -ForegroundColor Green
}

Assert-ToolInstalled -Name "Node.js" -Command "node"
Assert-ToolInstalled -Name "pnpm" -Command "pnpm"
Assert-ToolInstalled -Name "Rustc" -Command "rustc"
Assert-ToolInstalled -Name "Cargo" -Command "cargo"

# 3. 清理旧构建 (如果指定)
if ($Clean) {
    Write-Host "`n[3/5] 清理旧构建输出..." -ForegroundColor Yellow
    $distPath = Join-Path $repoRoot "dist"
    $bundlePath = Join-Path $repoRoot "target/$Target/release/bundle"
    if (Test-Path $distPath) {
        Remove-Item -Recurse -Force $distPath
        Write-Host "  ✔ 已清除 dist/" -ForegroundColor DarkGray
    }
    if (Test-Path $bundlePath) {
        Remove-Item -Recurse -Force $bundlePath
        Write-Host "  ✔ 已清除 bundle 目录" -ForegroundColor DarkGray
    }
} else {
    Write-Host "`n[3/5] 跳过清理目录 (可添加 -Clean 参数强制清理)" -ForegroundColor DarkGray
}

# 4. 生成数据库连接元数据 & 编译前端
Write-Host "`n[4/5] 准备前端静态资源..." -ForegroundColor Yellow

Write-Host "  -> 同步数据库连接类型定义..." -ForegroundColor DarkCyan
& pnpm generate:connection-types
if ($LASTEXITCODE -ne 0) {
    Write-Error "generate:connection-types 失败！"
    exit $LASTEXITCODE
}

if (-not $SkipFrontend) {
    Write-Host "  -> 编译前端资源 (pnpm build)..." -ForegroundColor DarkCyan
    & pnpm build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "前端构建 (pnpm build) 失败！"
        exit $LASTEXITCODE
    }
    Write-Host "  ✔ 前端构建完成 -> dist/" -ForegroundColor Green
} else {
    Write-Host "  ✔ 已跳过前端构建 (-SkipFrontend)" -ForegroundColor DarkGray
}

# 5. 调用 Tauri CLI 编译与打包
Write-Host "`n[5/5] 执行 Tauri 后端编译与安装包生成..." -ForegroundColor Yellow

$tauriArgs = @("tauri", "build", "--no-sign")

if ($DebugBuild) {
    $tauriArgs += "--debug"
}

if ($Target) {
    $tauriArgs += @("--target", $Target)
}

if ($Bundle -eq "none") {
    $tauriArgs += "--no-bundle"
} else {
    $tauriArgs += @("--bundles", $Bundle)
}

if ($OfflineWebView2) {
    $offlineConfig = Join-Path $repoRoot "src-tauri/tauri.webview2-offline.conf.json"
    if (Test-Path $offlineConfig) {
        $tauriArgs += @("--config", "src-tauri/tauri.webview2-offline.conf.json")
        Write-Host "  ℹ 已启用 WebView2 离线运行时打包配置" -ForegroundColor Cyan
    } else {
        Write-Warning "未找到 src-tauri/tauri.webview2-offline.conf.json，采用默认配置打包"
    }
}

Write-Host "  -> 执行命令: pnpm $($tauriArgs -join ' ')" -ForegroundColor DarkCyan
$sw = [System.Diagnostics.Stopwatch]::StartNew()

& pnpm @tauriArgs

if ($LASTEXITCODE -ne 0) {
    Write-Error "Tauri 编译打包失败，退出码: $LASTEXITCODE"
    exit $LASTEXITCODE
}
$sw.Stop()

# 6. 输出结果与摘要
Write-Host "`n==================================================" -ForegroundColor Green
Write-Host "            🎉 DBX Windows 编译打包成功!           " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host "总耗时: $([Math]::Round($sw.Elapsed.TotalSeconds, 1)) 秒`n" -ForegroundColor DarkCyan

# 检索产物
$possibleBundleDirs = @(
    (Join-Path $repoRoot "target/$Target/release/bundle"),
    (Join-Path $repoRoot "target/release/bundle"),
    (Join-Path $repoRoot "src-tauri/target/$Target/release/bundle"),
    (Join-Path $repoRoot "src-tauri/target/release/bundle")
)

$bundleDir = $possibleBundleDirs | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($bundleDir) {
    Write-Host "📦 生成的安装包产物位于: $bundleDir" -ForegroundColor Cyan
    $installerFiles = Get-ChildItem -Path $bundleDir -Recurse -File -Include "*.exe", "*.msi" | Where-Object { $_.FullName -notmatch "\\build\\" }

    foreach ($file in $installerFiles) {
        $sizeMB = [Math]::Round($file.Length / 1MB, 2)
        $hash = (Get-FileHash -Path $file.FullName -Algorithm SHA256).Hash
        Write-Host "`n  📄 文件名: $($file.Name)" -ForegroundColor White
        Write-Host "     完整路径: $($file.FullName)" -ForegroundColor DarkGray
        Write-Host "     文件大小: $sizeMB MB" -ForegroundColor DarkGray
        Write-Host "     SHA-256 : $hash" -ForegroundColor DarkGray
    }

    if ($OpenOutput -and $installerFiles.Count -gt 0) {
        $first = $installerFiles[0]
        Start-Process "explorer.exe" -ArgumentList "/select,`"$($first.FullName)`""
    }
} else {
    $exePath = Join-Path $repoRoot "target/$Target/release/dbx.exe"
    if (-not (Test-Path $exePath)) {
        $exePath = Join-Path $repoRoot "target/release/dbx.exe"
    }
    if (Test-Path $exePath) {
        $file = Get-Item $exePath
        $sizeMB = [Math]::Round($file.Length / 1MB, 2)
        Write-Host "📦 生成的可执行文件: $($file.FullName) ($sizeMB MB)" -ForegroundColor Cyan
    }
}
