$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$artDir = "C:\Users\khiem.nguyen\.gemini\antigravity-ide\brain\1b95cbd8-01a7-4e54-92ab-3eac9239dab1"

$tasks = @(
    @{ url = "file:///c:/Users/khiem.nguyen/Documents/GitHub/K-EDU/index.html?qa=doc_bank"; file = "$artDir/screen_doc_bank_stats.png" },
    @{ url = "file:///c:/Users/khiem.nguyen/Documents/GitHub/K-EDU/index.html?qa=doc_shortage"; file = "$artDir/screen_doc_bank_shortage_alert.png" },
    @{ url = "file:///c:/Users/khiem.nguyen/Documents/GitHub/K-EDU/index.html?qa=doc_gen"; file = "$artDir/screen_doc_bank_exam_generated.png" }
)

foreach ($t in $tasks) {
    Write-Host "Capturing $($t.file)..."
    if (Test-Path $t.file) { Remove-Item $t.file -Force }
    Start-Process -FilePath $chromePath -ArgumentList @(
        "--headless=new",
        "--disable-gpu",
        "--window-size=1280,950",
        "--virtual-time-budget=4000",
        "--screenshot=$($t.file)",
        $t.url
    ) -Wait
    if (Test-Path $t.file) {
        $len = (Get-Item $t.file).Length
        Write-Host "-> Captured size: $len bytes"
    } else {
        Write-Host "-> File not created!"
    }
}
