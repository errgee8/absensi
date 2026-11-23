# Slices the 8 HD transparent streak frames from the user's source PNG into public/streak-frames/
Add-Type -AssemblyName System.Drawing

$src = "C:/Users/Ryand/.gemini/antigravity/brain/833df715-009d-494a-ab73-e3383f0e0218/.user_uploaded/media_1795455662525_85b13b6f.png"
if (-not (Test-Path $src)) {
    Write-Error "Source file not found at $src"
    exit 1
}

$bmp = New-Object System.Drawing.Bitmap($src)
$outDir = "$PSScriptRoot/../public/streak-frames"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$frames = @(
    @{ name='white_cat'; cx=138; cy=126 },
    @{ name='frog'; cx=379; cy=112 },
    @{ name='pink_angel'; cx=613; cy=118 },
    @{ name='orange_fox'; cx=848; cy=130 },
    @{ name='blue_angel'; cx=144; cy=322 },
    @{ name='witch_hat'; cx=393; cy=351 },
    @{ name='cyber_cat'; cx=599; cy=334 },
    @{ name='winged_crown'; cx=850; cy=360 }
)

$cropRadius = 130
$size = $cropRadius * 2

foreach ($f in $frames) {
    # 1. Flood fill to get exact pixel coordinates of this frame only
    $sx = $f.cx + 55; $sy = $f.cy
    while ($bmp.GetPixel($sx, $sy).A -lt 50) { $sx-- }

    $queue = New-Object System.Collections.Generic.Queue[System.Drawing.Point]
    $visited = New-Object 'System.Collections.Generic.HashSet[string]'
    $start = New-Object System.Drawing.Point($sx, $sy)
    $queue.Enqueue($start)
    $visited.Add(($sx.ToString() + ',' + $sy.ToString())) | Out-Null

    while ($queue.Count -gt 0) {
        $pt = $queue.Dequeue()
        $x = $pt.X; $y = $pt.Y
        for ($dy = -1; $dy -le 1; $dy++) {
            for ($dx = -1; $dx -le 1; $dx++) {
                if ($dx -eq 0 -and $dy -eq 0) { continue }
                $nx = $x + $dx; $ny = $y + $dy
                if ($nx -ge 0 -and $nx -lt $bmp.Width -and $ny -ge 0 -and $ny -lt $bmp.Height) {
                    $key = $nx.ToString() + ',' + $ny.ToString()
                    if (-not $visited.Contains($key)) {
                        $p = $bmp.GetPixel($nx, $ny)
                        if ($p.A -gt 5) {
                            $visited.Add($key) | Out-Null
                            $queue.Enqueue((New-Object System.Drawing.Point($nx, $ny)))
                        }
                    }
                }
            }
        }
    }

    # 2. Write only visited pixels onto destination 260x260 image
    $destBmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $cx = $f.cx
    $cy = $f.cy

    for ($dy = -$cropRadius; $dy -lt $cropRadius; $dy++) {
        for ($dx = -$cropRadius; $dx -lt $cropRadius; $dx++) {
            $srcX = $cx + $dx
            $srcY = $cy + $dy
            $dxOut = $dx + $cropRadius
            $dyOut = $dy + $cropRadius

            $key = $srcX.ToString() + ',' + $srcY.ToString()
            if ($visited.Contains($key)) {
                $p = $bmp.GetPixel($srcX, $srcY)
                $destBmp.SetPixel($dxOut, $dyOut, $p)
            }
        }
    }

    $outPath = Join-Path $outDir ($f.name + '.png')
    $destBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBmp.Dispose()
    Write-Host ("Exported: " + $f.name + ".png (" + $visited.Count + " px)")
}

$bmp.Dispose()
Write-Host "All 8 streak frames extracted cleanly."
