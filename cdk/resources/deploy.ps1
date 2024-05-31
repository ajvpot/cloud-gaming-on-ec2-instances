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

# Install GRID driver.
# Create a temporary directory and change to it
$tempDir = New-Item -ItemType Directory -Path ([System.IO.Path]::GetTempPath()) -Name "NvidiaDriverTemp"
Set-Location -Path $tempDir.FullName

# Define the AWS CLI path
$awsCliPath = "C:\Program Files\Amazon\AWSCLIV2\aws"

# Attempt to copy NVIDIA drivers from S3 bucket
try {
    & $awsCliPath s3 cp --recursive s3://ec2-windows-nvidia-drivers/latest/ .
} catch {
    try {
        & $awsCliPath s3 cp --recursive s3://ec2-windows-nvidia-drivers/latest/ . --region us-east-1
    } catch {
        & $awsCliPath s3 cp --recursive s3://ec2-windows-nvidia-drivers/latest/ . --no-sign-request
    }
}

# Add registry entry to disable NVIDIA license management page
reg add "HKLM\SOFTWARE\NVIDIA Corporation\Global\GridLicensing" /v NvCplDisableManageLicensePage /t REG_DWORD /d 1 /f

# Extract all .exe files using 7-Zip from the system path
Get-ChildItem -Filter *.exe | ForEach-Object {
    Start-Process -FilePath "7z" -ArgumentList "x", $_.FullName -Wait
}

# Run the setup.exe with silent mode
Start-Process -FilePath ".\setup.exe" -ArgumentList "-s" -Wait

# Disable ECC Checking and set clock speed
& "C:\Windows\System32\DriverStore\FileRepository\nvg*\nvidia-smi.exe" -e 0
# & "C:\Windows\System32\DriverStore\FileRepository\nvg*\nvidia-smi.exe" -ac 6250,1710

# Download and install user space applications
Invoke-WebRequest -Uri "https://github.com/ajvpot/Parsec-Cloud-Preparation-Tool/archive/master.zip" -OutFile "$InstallationFilesFolder\9_user\parsec.zip"
Expand-Archive "$InstallationFilesFolder\9_user\parsec.zip" -DestinationPath "$InstallationFilesFolder\9_user\parsec" -Force
cd "$InstallationFilesFolder\9_user\parsec\Parsec-Cloud-Preparation-Tool-master"
powershell.exe .\Loader.ps1 -DontPromptPasswordUpdateGPU

Invoke-WebRequest -Uri $cudaUrl -OutFile "$InstallationFilesFolder\9_user\cuda.exe"
Invoke-WebRequest -Uri $pythonUrl -OutFile "$InstallationFilesFolder\9_user\python.exe"
Invoke-WebRequest -Uri $tdUrl -OutFile "$InstallationFilesFolder\9_user\td.exe"
Invoke-WebRequest -Uri "https://downloads.ndi.tv/Tools/NDI%206%20Tools.exe" -OutFile "$InstallationFilesFolder\9_user\NDI 6 Tools.exe"

Start-Process -FilePath "$InstallationFilesFolder\9_user\cuda.exe" -ArgumentList "-s" -Wait -NoNewWindow
Start-Process -FilePath "$InstallationFilesFolder\9_user\python.exe" -ArgumentList "/quiet InstallAllUsers=1 PrependPath=1 Include_test=0" -Wait -NoNewWindow
Start-Process -FilePath "$InstallationFilesFolder\9_user\td.exe" -ArgumentList "/VERYSILENT /Codemeter" -Wait -NoNewWindow
Rename-Computer -NewName "CLOUD-TD"

# TODO
#   create shortcut for log tail, remove it when install is done
#   create shortcut for ndi bridge
