[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Drawing

$W = 1200; $H = 630
$bmp = New-Object System.Drawing.Bitmap($W, $H)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

function FillRoundRect($brush, $x, $y, $w, $h, $r) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($x, $y, $r*2, $r*2, 180, 90)
    $path.AddArc($x+$w-$r*2, $y, $r*2, $r*2, 270, 90)
    $path.AddArc($x+$w-$r*2, $y+$h-$r*2, $r*2, $r*2, 0, 90)
    $path.AddArc($x, $y+$h-$r*2, $r*2, $r*2, 90, 90)
    $path.CloseFigure()
    $g.FillPath($brush, $path)
    $path.Dispose()
}

$cOrange = [System.Drawing.Color]::FromArgb(255, 232, 168, 56)
$cWhite = [System.Drawing.Color]::FromArgb(255, 240, 237, 229)
$cMuted = [System.Drawing.Color]::FromArgb(160, 240, 237, 229)
$cDim = [System.Drawing.Color]::FromArgb(100, 240, 237, 229)
$cGreen = [System.Drawing.Color]::FromArgb(255, 124, 179, 66)
$cBlue = [System.Drawing.Color]::FromArgb(255, 100, 181, 246)
$cBadgeBg = [System.Drawing.Color]::FromArgb(40, 232, 168, 56)
$cTagBg = [System.Drawing.Color]::FromArgb(25, 255, 255, 255)
$cBarBg = [System.Drawing.Color]::FromArgb(25, 255, 255, 255)
$cAvatarBg = [System.Drawing.Color]::FromArgb(30, 100, 181, 246)

$bOrange = New-Object System.Drawing.SolidBrush($cOrange)
$bWhite = New-Object System.Drawing.SolidBrush($cWhite)
$bMuted = New-Object System.Drawing.SolidBrush($cMuted)
$bDim = New-Object System.Drawing.SolidBrush($cDim)
$bGreen = New-Object System.Drawing.SolidBrush($cGreen)
$bBlue = New-Object System.Drawing.SolidBrush($cBlue)
$bBadgeBg = New-Object System.Drawing.SolidBrush($cBadgeBg)
$bTagBg = New-Object System.Drawing.SolidBrush($cTagBg)
$bBarBg = New-Object System.Drawing.SolidBrush($cBarBg)
$bAvatarBg = New-Object System.Drawing.SolidBrush($cAvatarBg)

$fBadge = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
$fTitle = New-Object System.Drawing.Font('Segoe UI', 34, [System.Drawing.FontStyle]::Bold)
$fSub = New-Object System.Drawing.Font('Segoe UI', 16, [System.Drawing.FontStyle]::Bold)
$fDate = New-Object System.Drawing.Font('Segoe UI', 13, [System.Drawing.FontStyle]::Bold)
$fDesc = New-Object System.Drawing.Font('Segoe UI', 13)
$fTag = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$fSmall = New-Object System.Drawing.Font('Segoe UI', 11)
$fStat = New-Object System.Drawing.Font('Segoe UI', 24, [System.Drawing.FontStyle]::Bold)
$fStatL = New-Object System.Drawing.Font('Segoe UI', 10)
$fBrand = New-Object System.Drawing.Font('Segoe UI', 15, [System.Drawing.FontStyle]::Bold)

# Background
$cBg = [System.Drawing.Color]::FromArgb(255, 15, 25, 35)
$bBg = New-Object System.Drawing.SolidBrush($cBg)
$g.FillRectangle($bBg, 0, 0, $W, $H)

# Left bar
$g.FillRectangle($bOrange, 0, 0, 6, $H)

# Mission badge
FillRoundRect $bBadgeBg 40 40 130 32 8

# Use Unicode escapes for all Cyrillic
$badge = [char]0x041C + [char]0x0418 + [char]0x0421 + [char]0x0421 + [char]0x0418 + [char]0x042F + " 1"
$g.DrawString($badge, $fBadge, $bOrange, 52, 46)

# Title line 1
$t1 = [char]0x00AB + [char]0x041A + [char]0x0438 + [char]0x0431 + [char]0x0435 + [char]0x0440 + "-" + [char]0x0410 + [char]0x0442 + [char]0x043B + [char]0x0435 + [char]0x0442 + [char]0x044B + ":"
$g.DrawString($t1, $fTitle, $bWhite, 40, 100)

# Title line 2
$t2 = [char]0x0425 + [char]0x0440 + [char]0x043E + [char]0x043D + [char]0x0438 + [char]0x043A + [char]0x0438 + " " + [char]0x0411 + [char]0x0443 + [char]0x0434 + [char]0x0443 + [char]0x0449 + [char]0x0435 + [char]0x0433 + [char]0x043E + [char]0x00BB
$g.DrawString($t2, $fTitle, $bWhite, 40, 145)

# Subtitle
$g.DrawString('PHYGITAL & SCI-FI', $fSub, $bOrange, 40, 190)

# Date pill
FillRoundRect $bBadgeBg 40 218 280 34 8
$g.DrawString("05.10 - 09.10.2026", $fDate, $bOrange, 54, 224)

# Legend label
$ll = [char]0x270D + " " + [char]0x041B + [char]0x0435 + [char]0x0433 + [char]0x0435 + [char]0x043D + [char]0x0434 + [char]0x0430
$g.DrawString($ll, $fSmall, $bOrange, 40, 275)

# Legend text
$l1 = [char]0x0423 + [char]0x0447 + [char]0x0430 + [char]0x0441 + [char]0x0442 + [char]0x043D + [char]0x0438 + [char]0x043A + [char]0x0438 + " " + [char]0x2014 + " " + [char]0x00AB + [char]0x0410 + [char]0x0433 + [char]0x0435 + [char]0x043D + [char]0x0442 + [char]0x044B + " " + [char]0x0411 + [char]0x0443 + [char]0x0434 + [char]0x0443 + [char]0x0449 + [char]0x0435 + [char]0x0433 + [char]0x043E + [char]0x00BB + " " + [char]0x0432 + " " + [char]0x0441 + [char]0x0435 + [char]0x043A + [char]0x0440 + [char]0x0435 + [char]0x0442 + [char]0x043D + [char]0x043E + [char]0x0439 + " " + [char]0x0430 + [char]0x043A + [char]0x0430 + [char]0x0434 + [char]0x0435 + [char]0x043C + [char]0x0438 + [char]0x0438 + "."
$g.DrawString($l1, $fDesc, $bMuted, 40, 298)

$l2 = [char]0x0418 + [char]0x0445 + " " + [char]0x0437 + [char]0x0430 + [char]0x0434 + [char]0x0430 + [char]0x0447 + [char]0x0430 + " " + [char]0x2014 + " " + [char]0x0441 + [char]0x043F + [char]0x0430 + [char]0x0441 + [char]0x0442 + [char]0x0438 + " " + [char]0x0446 + [char]0x0438 + [char]0x0444 + [char]0x0440 + [char]0x043E + [char]0x0432 + [char]0x0443 + [char]0x044E + " " + [char]0x0432 + [char]0x0441 + [char]0x0435 + [char]0x043B + [char]0x0435 + [char]0x043D + [char]0x043D + [char]0x0443 + [char]0x044E + ","
$g.DrawString($l2, $fDesc, $bMuted, 40, 320)

$l3 = [char]0x0440 + [char]0x0430 + [char]0x0437 + [char]0x0432 + [char]0x0438 + [char]0x0432 + [char]0x0430 + [char]0x044F + " " + [char]0x0444 + [char]0x0438 + [char]0x0437 + [char]0x0438 + [char]0x0447 + [char]0x0435 + [char]0x0441 + [char]0x043A + [char]0x0438 + [char]0x0435 + " " + [char]0x0438 + " " + [char]0x0438 + [char]0x043D + [char]0x0442 + [char]0x0435 + [char]0x043B + [char]0x043B + [char]0x0435 + [char]0x043A + [char]0x0442 + [char]0x0443 + [char]0x0430 + [char]0x043B + [char]0x044C + [char]0x043D + [char]0x044B + [char]0x0435 + " " + [char]0x0441 + [char]0x043F + [char]0x043E + [char]0x0441 + [char]0x043E + [char]0x0431 + [char]0x043D + [char]0x043E + [char]0x0441 + [char]0x0442 + [char]0x0438 + "."
$g.DrawString($l3, $fDesc, $bMuted, 40, 342)

# Tags
$tx = 40
$tagTexts = @(
    [char]0x0421 + [char]0x043F + [char]0x043E + [char]0x0440 + [char]0x0442,
    "IT",
    [char]0x0411 + [char]0x0438 + [char]0x043E + [char]0x0442 + [char]0x0435 + [char]0x0445,
    [char]0x041F + [char]0x0440 + [char]0x0435 + [char]0x0434 + [char]0x043F + [char]0x0440 + [char]0x0438 + [char]0x043D + [char]0x0438 + [char]0x043C + [char]0x0430 + [char]0x0442 + [char]0x0435 + [char]0x043B + [char]0x044C + [char]0x0441 + [char]0x0442 + [char]0x0432 + [char]0x043E
)
foreach ($tag in $tagTexts) {
    $tw = [int]($g.MeasureString($tag, $fTag).Width) + 24
    FillRoundRect $bTagBg $tx 378 $tw 28 6
    $g.DrawString($tag, $fTag, $bMuted, [int]($tx + 12), 397)
    $tx += $tw + 8
}

# RIGHT SIDE
# Level bar
$g.DrawString("LEVEL", $fSmall, $bMuted, 750, 110)
FillRoundRect $bBarBg 750 125 400 14 7
FillRoundRect $bGreen 750 125 270 14 7
$g.DrawString("260 / 400 XP", $fSmall, $bWhite, 762, 124)

# Streak
$g.DrawString("5", $fStat, $bOrange, 810, 230)
$streak = [char]0x0434 + [char]0x043D + [char]0x0435 + [char]0x0439 + " " + [char]0x043F + [char]0x043E + [char]0x0434 + [char]0x0440 + [char]0x044F + [char]0x0434
$g.DrawString($streak, $fSmall, $bDim, 790, 265)

# Coins
$g.DrawString("1,250", $fStat, $bOrange, 940, 230)
$coins = [char]0x043C + [char]0x043E + [char]0x043D + [char]0x0435 + [char]0x0442
$g.DrawString($coins, $fSmall, $bDim, 960, 265)

# Squad
$squad = [char]0x0424 + [char]0x041B + [char]0x0410 + [char]0x0414 + [char]0x0416 + [char]0x0418 + [char]0x041D + [char]0x0413
$g.DrawString($squad, $fSmall, $bBlue, 1060, 230)
$squadSub = [char]0x043E + [char]0x0442 + [char]0x0440 + [char]0x044F + [char]0x0434 + " 4/5"
$g.DrawString($squadSub, $fSmall, $bDim, 1070, 265)

# Avatar
$g.FillEllipse($bAvatarBg, 950, 320, 100, 100)
$fAv = New-Object System.Drawing.Font('Segoe UI', 30, [System.Drawing.FontStyle]::Bold)
$g.DrawString("A", $fAv, $bBlue, 980, 355)
$name = [char]0x0410 + [char]0x043B + [char]0x0435 + [char]0x043A + [char]0x0441 + [char]0x0435 + [char]0x0439 + ", 10 " + [char]0x043B + [char]0x0435 + [char]0x0442
$g.DrawString($name, $fSmall, $bWhite, 955, 435)
$level = [char]0x0423 + [char]0x0440 + [char]0x043E + [char]0x0432 + [char]0x0435 + [char]0x043D + [char]0x044C + " 5"
$g.DrawString($level, $fSmall, $bDim, 970, 455)

# Bottom bar
$brushBottomBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(12, 255, 255, 255))
$g.FillRectangle($brushBottomBg, 0, $H-50, $W, 50)
$brand = [char]0x041A + [char]0x0410 + [char]0x041D + [char]0x0418 + [char]0x041A + [char]0x0423 + [char]0x041B + [char]0x042B + " " + [char]0x0421 + " ONE!"
$g.DrawString($brand, $fBrand, $bOrange, 40, $H-35)
$g.DrawString('Phygital-platform for kids camps', $fSmall, $bDim, 850, $H-33)

# Save
$outDir = Join-Path $PSScriptRoot 'img'
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
$outPath = Join-Path $outDir 'og-card.png'
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Host "OK: $outPath"
