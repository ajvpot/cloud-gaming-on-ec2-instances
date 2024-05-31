# Define URLs
$sevenZipUrl = "https://www.7-zip.org/a/7z2201-x64.msi"
$chromeUrl = "https://dl.google.com/tag/s/appname=Google%20Chrome&needsadmin=true&ap=x64-stable-statsdef_0&brand=GCEA/dl/chrome/install/googlechromestandaloneenterprise64.msi"
$niceDCVServerUrl = "https://d1uj6qtbmh3dt5.cloudfront.net/2023.0/Servers/nice-dcv-server-x64-Release-2023.0-15487.msi"
$niceDCVDisplayDriverUrl = "https://d1uj6qtbmh3dt5.cloudfront.net/nice-dcv-virtual-display-x64-Release.msi"
$gridSwCertUrl = "https://nvidia-gaming.s3.amazonaws.com/GridSwCert-Archive/GridSwCertWindows_2021_10_2.cert"
$cudaUrl = "https://developer.download.nvidia.com/compute/cuda/12.1.0/local_installers/cuda_12.1.0_531.14_windows.exe"
$pythonUrl = "https://www.python.org/ftp/python/3.10.0/python-3.10.0-amd64.exe"
$tdUrl = "https://download.derivative.ca/TouchDesigner.2023.11760.exe"

$InstallationFilesFolder = "C:\Users\Administrator\Desktop\InstallationFiles"

$graphics = {
    param ($InstallationFilesFolder, $sevenZipUrl, $niceDCVServerUrl, $niceDCVDisplayDriverUrl, $gridSwCertUrl)
    # Install 7z to extract drivers
    Start-Process -FilePath "msiexec.exe" -ArgumentList "/i $sevenZipUrl /quiet /norestart" -Wait

    # Download and install NVIDIA drivers
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

    # Download GRID Certificate
    Invoke-WebRequest -Uri $gridSwCertUrl -OutFile "C:\Users\PUBLIC\Documents\GridSwCert.txt"

    "Graphics completed"
}

$parsec = {
    param ($InstallationFilesFolder)
    # Download and install user space applications
    Invoke-WebRequest -Uri "https://github.com/ajvpot/Parsec-Cloud-Preparation-Tool/archive/master.zip" -OutFile "$InstallationFilesFolder\9_user\parsec.zip"
    Expand-Archive "$InstallationFilesFolder\9_user\parsec.zip" -DestinationPath "$InstallationFilesFolder\9_user\parsec" -Force
    cd "$InstallationFilesFolder\9_user\parsec\Parsec-Cloud-Preparation-Tool-master"
    powershell.exe -Command "& { .\Loader.ps1 -DontPromptPasswordUpdateGPU }" -ErrorAction SilentlyContinue
}

$cuda = {
    param ($InstallationFilesFolder, $cudaUrl, $pythonUrl)
    Invoke-WebRequest -Uri $cudaUrl -OutFile "$InstallationFilesFolder\9_user\cuda.exe"
    Start-Process -FilePath "$InstallationFilesFolder\9_user\cuda.exe" -ArgumentList "-s" -Wait -NoNewWindow

    Invoke-WebRequest -Uri $pythonUrl -OutFile "$InstallationFilesFolder\9_user\python.exe"
    Start-Process -FilePath "$InstallationFilesFolder\9_user\python.exe" -ArgumentList "/quiet InstallAllUsers=1 PrependPath=1 Include_test=0" -Wait -NoNewWindow
}

$ndi = {
    param ($InstallationFilesFolder)
    Invoke-WebRequest -Uri "https://downloads.ndi.tv/Tools/NDI%206%20Tools.exe" -OutFile "$InstallationFilesFolder\9_user\NDI Tools 6.exe"
    Start-Process -FilePath "C:\Users\Administrator\Desktop\InstallationFiles\9_user\NDI Tools 6.exe" -ArgumentList "/VERYSILENT", "/LOADINF=ndiconfig" -Wait -NoNewWindow
}

$misc = {
    param ($InstallationFilesFolder, $chromeUrl)
    Start-Process -FilePath "msiexec.exe" -ArgumentList "/i $chromeUrl /quiet /norestart" -Wait
}

$touchdesigner = {
    param ($InstallationFilesFolder, $tdUrl)
    Invoke-WebRequest -Uri $tdUrl -OutFile "$InstallationFilesFolder\9_user\td.exe"
    Start-Process -FilePath "$InstallationFilesFolder\9_user\td.exe" -ArgumentList "/VERYSILENT /Codemeter" -Wait -NoNewWindow
}

# Setup logtail shortcut
$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut("$env:USERPROFILE\Desktop\TailCloudFormationInitLog.lnk")
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-NoExit -Command Get-Content C:\cfn\log\cfn-init.log -Wait"
$Shortcut.WorkingDirectory = "$env:USERPROFILE\Desktop"
$Shortcut.WindowStyle = 1
$Shortcut.IconLocation = "powershell.exe,0"
$Shortcut.Save()

# Start the jobs
$jobs = @()
$jobs += [PSCustomObject]@{ Job = Start-Job -ScriptBlock $graphics -ArgumentList $InstallationFilesFolder, $sevenZipUrl, $niceDCVServerUrl, $niceDCVDisplayDriverUrl, $gridSwCertUrl; FileName = "graphics.log" }
$jobs += [PSCustomObject]@{ Job = Start-Job -ScriptBlock $ndi -ArgumentList $InstallationFilesFolder; FileName = "ndi.log" }
$jobs += [PSCustomObject]@{ Job = Start-Job -ScriptBlock $misc -ArgumentList $InstallationFilesFolder, $chromeUrl; FileName = "misc.log" }
$jobs += [PSCustomObject]@{ Job = Start-Job -ScriptBlock $parsec -ArgumentList $InstallationFilesFolder; FileName = "parsec.log" }
$jobs += [PSCustomObject]@{ Job = Start-Job -ScriptBlock $cuda -ArgumentList $InstallationFilesFolder, $cudaUrl, $pythonUrl; FileName = "cuda.log" }
$jobs += [PSCustomObject]@{ Job = Start-Job -ScriptBlock $touchdesigner -ArgumentList $InstallationFilesFolder, $tdUrl; FileName = "touchdesigner.log" }

# Wait for all jobs to complete
$jobs | ForEach-Object { $_.Job | Wait-Job }

# Retrieve job results and write to separate files
$jobs | ForEach-Object {
    $result = Receive-Job -Job $_.Job
    $filePath = Join-Path -Path $InstallationFilesFolder -ChildPath $_.FileName
    $result | Tee-Object -FilePath $filePath
}

# Clean up jobs
$jobs | ForEach-Object { Remove-Job -Job $_.Job }

# Clean up jobs
$jobs | ForEach-Object { Remove-Job -Job $_.Job }

# Final steps
Remove-Item "$env:USERPROFILE\Desktop\TailCloudFormationInitLog.lnk"
Rename-Computer -NewName "CLOUD-TD"

# TODO
#   create shortcut for ndi bridge
