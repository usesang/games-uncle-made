Add-Type -AssemblyName System.Drawing

$iconFolder = Split-Path -Parent $PSScriptRoot
foreach ($iconSize in @(192, 512)) {
    $bitmap = [System.Drawing.Bitmap]::new($iconSize, $iconSize)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $brushes = @(
        [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#173d43')),
        [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#6fc7a6')),
        [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#fff4d2')),
        [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#e9bd6d'))
    )
    $ink = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#174c4c'), 11)
    try {
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.ScaleTransform([single]($iconSize / 512), [single]($iconSize / 512))
        $graphics.FillRectangle($brushes[0], 0, 0, 512, 512)
        $graphics.FillEllipse($brushes[1], 64, 64, 384, 384)
        $graphics.FillEllipse($brushes[2], 98, 76, 316, 366)
        $graphics.DrawEllipse($ink, 98, 76, 316, 366)
        $graphics.FillEllipse($brushes[1], 169, 158, 56, 75)
        $graphics.FillEllipse($brushes[1], 269, 125, 72, 51)
        $graphics.FillEllipse($brushes[1], 302, 229, 56, 72)
        $graphics.FillEllipse($brushes[3], 157, 333, 45, 28)
        $graphics.FillEllipse($brushes[3], 286, 342, 48, 28)
        $graphics.FillEllipse($brushes[0], 219, 259, 20, 20)
        $graphics.FillEllipse($brushes[0], 275, 259, 20, 20)
        $graphics.DrawArc($ink, 236, 279, 44, 32, 10, 160)
        $outputPath = Join-Path $iconFolder "icon-$iconSize.png"
        $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        Write-Output $outputPath
    }
    finally {
        $ink.Dispose()
        foreach ($brush in $brushes) { $brush.Dispose() }
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}
