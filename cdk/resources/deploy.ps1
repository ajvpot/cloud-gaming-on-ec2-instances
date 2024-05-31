# Define URLs
$sevenZipUrl = "https://www.7-zip.org/a/7z2201-x64.msi"
$chromeUrl = "https://dl.google.com/tag/s/appname=Google%20Chrome&needsadmin=true&ap=x64-stable-statsdef_0&brand=GCEA/dl/chrome/install/googlechromestandaloneenterprise64.msi"
$niceDCVServerUrl = "https://d1uj6qtbmh3dt5.cloudfront.net/2023.0/Servers/nice-dcv-server-x64-Release-2023.0-15487.msi"
$niceDCVDisplayDriverUrl = "https://d1uj6qtbmh3dt5.cloudfront.net/nice-dcv-virtual-display-x64-Release.msi"
$gridSwCertUrl = "https://nvidia-gaming.s3.amazonaws.com/GridSwCert-Archive/GridSwCertWindows_2021_10_2.cert"
$cudaUrl = "https://developer.download.nvidia.com/compute/cuda/12.1.0/local_installers/cuda_12.1.0_531.14_windows.exe"
$pythonUrl = "https://www.python.org/ftp/python/3.10.0/python-3.10.0-amd64.exe"
$tdUrl = "https://download.derivative.ca/TouchDesigner.2023.11760.exe"

# Setup logtail shortcut
$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut("$env:USERPROFILE\Desktop\TailCloudFormationInitLog.lnk")
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-NoExit -Command Get-Content C:\cfn\log\cfn-init.log -Wait"
$Shortcut.WorkingDirectory = "$env:USERPROFILE\Desktop"
$Shortcut.WindowStyle = 1
$Shortcut.IconLocation = "powershell.exe,0"
$Shortcut.Save()

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

# Set up shared storage
New-Item -Path "%home%\Desktop\Shared\" -ItemType Directory -Force
reg add "HKEY_USERS\S-1-5-18\Software\GSettings\com\nicesoftware\dcv\session-management\automatic-console-session" /v storage-root /t REG_SZ /d "%home%\Desktop\Shared\" /f

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
Start-Process -FilePath "$InstallationFilesFolder\9_user\NDI 6 Tools.exe" -ArgumentList "/VERYSILENT", "/LOADINF=ndiconfig" -Wait -NoNewWindow
Rename-Computer -NewName "CLOUD-TD"
Remove-Item "$env:USERPROFILE\Desktop\TailCloudFormationInitLog.lnk"

# TODO
#   create shortcut for log tail, remove it when install is done
#   create shortcut for ndi bridge
