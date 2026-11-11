# Bakes the pack pictures that packtex.js used to rotate/crop/thin in the browser into plain PNG files,
# so every texture loads straight from a file (the same path that works in the exe).
# Re-run after changing a source picture: powershell -ExecutionPolicy Bypass -File tools/bake_pack.ps1
Add-Type -AssemblyName System.Drawing
$pack = Join-Path $PSScriptRoot "..\src\pack"

function Save-Png($bmp, $name) {
  $bmp.Save((Join-Path $pack $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  "wrote $name"
}

# brick and facade pictures run vertically in the file: turn them a quarter clockwise so the courses lie level
foreach ($pair in @(@("brick_wall_rough.png", "brick_wall_rough_level.png"), @("facade_brick_neat.png", "facade_brick_level.png"))) {
  $src = [System.Drawing.Bitmap]::FromFile((Join-Path $pack $pair[0]))
  $src.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone)
  Save-Png $src $pair[1]
}

# flagstone: cut the grey plaster strip off the left edge, stretch the rest to 1024x512 (power-of-two)
$src = [System.Drawing.Bitmap]::FromFile((Join-Path $pack "ground_flagstone.png"))
$sx = [int][math]::Round($src.Width * 0.135)
$bmp = New-Object System.Drawing.Bitmap 1024, 512
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.DrawImage($src, (New-Object System.Drawing.Rectangle 0, 0, 1024, 512), (New-Object System.Drawing.Rectangle $sx, 0, ($src.Width - $sx), $src.Height), [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose(); $src.Dispose()
Save-Png $bmp "ground_flagstone_crop.png"

# ivy: thin the leaves out toward the top of the picture (same rule as the old sparseIvy)
$src = [System.Drawing.Bitmap]::FromFile((Join-Path $pack "ivy_wall.png"))
$W = $src.Width; $H = $src.Height
$seed = [double]7
for ($y = 0; $y -lt $H; $y++) {
  $keep = 0.4 * [math]::Pow(1 - $y / $H, 2)
  for ($x = 0; $x -lt $W; $x++) {
    $p = $src.GetPixel($x, $y)
    if ($p.A -gt 128) {
      $seed = ($seed * 16807) % 2147483647
      if (($seed / 2147483647) -gt $keep) { $src.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, $p.R, $p.G, $p.B)) }
    }
  }
}
Save-Png $src "ivy_wall_sparse.png"
