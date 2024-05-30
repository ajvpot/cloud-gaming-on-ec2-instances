# Define URLs
$sevenZipUrl = "YOUR_SEVEN_ZIP_URL"
$chromeUrl = "YOUR_CHROME_URL"
$niceDCVServerUrl = "YOUR_NICE_DCV_SERVER_URL"
$niceDCVDisplayDriverUrl = "YOUR_NICE_DCV_DISPLAY_DRIVER_URL"
$gridSwCertUrl = "YOUR_GRID_SW_CERT_URL"
$cudaUrl = "YOUR_CUDA_URL"
$pythonUrl = "YOUR_PYTHON_URL"
$tdUrl = "YOUR_TD_URL"

# Install 7zip and Chrome Enterprise
Start-Process -FilePath "msiexec.exe" -ArgumentList "/i $sevenZipUrl /quiet /norestart" -Wait
Start-Process -FilePath "msiexec.exe" -ArgumentList "/i $chromeUrl /quiet /norestart" -Wait

# Install NiceDCV
Start-Process -FilePath "msiexec.exe" -ArgumentList "/i $niceDCVServerUrl /quiet /norestart" -Wait
Start-Process -FilePath "msiexec.exe" -ArgumentList "/i $niceDCVDisplayDriverUrl /quiet /norestart" -Wait

# Add registry entries for NiceDCV
reg add "HKLM\SYSTEM\CurrentControlSet\Services\nvlddmkm\Global" /v vGamingMarketplace /t REG_DWORD /d 2 /f
reg add "HKEY_USERS\S-1-5-18\Software\GSettings\com\nicesoftware\dcv\log\level" /v log-level /t REG_SZ /d debug /f
reg add "HKEY_USERS\S-1-5-18\Software\GSettings\com\nicesoftware\dcv\display" /v target-fps /t REG_DWORD /d 0 /f
reg add "HKEY_USERS\S-1-5-18\Software\GSettings\com\nicesoftware\dcv\display" /v enable-qu /t REG_DWORD /d 0 /f
reg add "HKEY_USERS\S-1-5-18\Software\GSettings\com\nicesoftware\dcv\display" /v frame-queue-weights /t REG_DWORD /d 851 /f
reg add "HKEY_USERS\S-1-5-18\Software\GSettings\com\nicesoftware\dcv\session-management\automatic-console-session" /v owner /t REG_SZ /d Administrator /f
reg add "HKEY_USERS\S-1-5-18\Software\GSettings\com\nicesoftware\dcv\connectivity" /v enable-quic-frontend /t REG_DWORD /d 1 /f

# Download GRID Certificate
Invoke-WebRequest -Uri $gridSwCertUrl -OutFile "C:\Users\PUBLIC\Documents\GridSwCert.txt"

# Download and install NVIDIA drivers
$InstallationFilesFolder = "C:\Users\Administrator\Desktop\InstallationFiles"
$Bucket = "nvidia-gaming"
$KeyPrefix = "windows/latest"
$Objects = Get-S3Object -BucketName $Bucket -KeyPrefix $KeyPrefix -Region us-east-1

foreach ($Object in $Objects)
{
    $LocalFileName = $Object.Key
    if ($LocalFileName -ne '' -and $Object.Size -ne 0)
    {
        $LocalFilePath = Join-Path "$InstallationFilesFolder\1_NVIDIA_drivers" $LocalFileName
        Copy-S3Object -BucketName $Bucket -Key $Object.Key -LocalFile $LocalFilePath -Region us-east-1
    }
}

$extractFolder = "$InstallationFilesFolder\1_NVIDIA_drivers\windows\latest"
$filesToExtract = "Display.Driver HDAudio NVI2 PhysX EULA.txt ListDevices.txt setup.cfg setup.exe"
Start-Process -FilePath "C:\Program Files\7-Zip\7z.exe" -ArgumentList "x -bso0 -bsp1 -bse1 -aoa $LocalFilePath $filesToExtract -o$extractFolder" -Wait

(Get-Content "$extractFolder\setup.cfg") | Where-Object { $_ -notmatch 'name="${{(EulaHtmlFile|FunctionalConsentFile|PrivacyPolicyFile)}}' } | Set-Content "$extractFolder\setup.cfg" -Encoding UTF8 -Force

$install_args = '-passive -noreboot -noeula -nofinish -s'
Start-Process -FilePath "$extractFolder\setup.exe" -ArgumentList $install_args -Wait

# Disable ECC Checking and set clock speed
& "C:\Windows\System32\DriverStore\FileRepository\nvg*\nvidia-smi.exe" -e 0
& "C:\Windows\System32\DriverStore\FileRepository\nvg*\nvidia-smi.exe" -ac 6250,1710

# Download and install user space applications
Invoke-WebRequest -Uri "https://github.com/ajvpot/Parsec-Cloud-Preparation-Tool/archive/master.zip" -OutFile "$InstallationFilesFolder\9_user\parsec.zip"
Expand-Archive "$InstallationFilesFolder\9_user\parsec.zip" -DestinationPath "$InstallationFilesFolder\9_user\parsec" -Force
cd "$InstallationFilesFolder\9_user\parsec\Parsec-Cloud-Preparation-Tool-master"
powershell.exe .\Loader.ps1 -DontPromptPasswordUpdateGPU

Invoke-WebRequest -Uri $cudaUrl -OutFile "$InstallationFilesFolder\9_user\cuda.exe"
Invoke-WebRequest -Uri $pythonUrl -OutFile "$InstallationFilesFolder\9_user\python.exe"
Invoke-WebRequest -Uri $tdUrl -OutFile "$InstallationFilesFolder\9_user\td.exe"
Invoke-WebRequest -Uri "https://downloads.ndi.tv/Tools/NDI%206%20Tools.exe" -OutFile "$InstallationFilesFolder\9_user\ndi.exe"

Start-Process -FilePath "$InstallationFilesFolder\9_user\cuda.exe" -ArgumentList "-s" -Wait -NoNewWindow
Start-Process -FilePath "$InstallationFilesFolder\9_user\python.exe" -ArgumentList "/quiet InstallAllUsers=1 PrependPath=1 Include_test=0" -Wait -NoNewWindow
Start-Process -FilePath "$InstallationFilesFolder\9_user\td.exe" -ArgumentList "/VERYSILENT /Codemeter" -Wait -NoNewWindow
Rename-Computer -NewName "CLOUD-TD"

# Reboot the system
Restart-Computer -Force

# keep the configset that checks connections, signals, and restarts because it depends on the stack name.


# TODO
#   create shortcut for log tail, remove it when install is done
#   create shortcut for ndi bridge
