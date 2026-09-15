$Flag = Join-Path $HOME ".context-saver\lazy-state-claude.json"
if (-not (Test-Path $Flag)) { exit 0 }

$Mode = ""
try {
    $Json = Get-Content $Flag -Raw | ConvertFrom-Json
    $Mode = $Json.mode
} catch { exit 0 }
if ([string]::IsNullOrEmpty($Mode)) { exit 0 }

$Esc = [char]27
$Color = if ($Mode -eq "ultra") { "173" } else { "108" }
if ($Mode -eq "full") {
    [Console]::Write("${Esc}[38;5;${Color}m[LAZY]${Esc}[0m")
} else {
    $Suffix = $Mode.ToUpperInvariant()
    [Console]::Write("${Esc}[38;5;${Color}m[LAZY:$Suffix]${Esc}[0m")
}
