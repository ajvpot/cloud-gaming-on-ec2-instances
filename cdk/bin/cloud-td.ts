import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib';
import 'source-map-support/register';
import { G4DNStack } from '../lib/g4dn';
import { G4ADStack } from '../lib/g4ad';
import { G5Stack } from '../lib/g5';

const app = new cdk.App();

const NICE_DCV_DISPLAY_DRIVER_URL = 'https://d1uj6qtbmh3dt5.cloudfront.net/nice-dcv-virtual-display-x64-Release.msi';
//const NICE_DCV_SERVER_URL = 'https://d1uj6qtbmh3dt5.cloudfront.net/nice-dcv-server-x64-Release.msi'; need to dive deeper into why the latest version stops working.
const NICE_DCV_SERVER_URL = 'https://d1uj6qtbmh3dt5.cloudfront.net/2023.0/Servers/nice-dcv-server-x64-Release-2023.0-15487.msi';              
const GRID_SW_CERT_URL = 'https://nvidia-gaming.s3.amazonaws.com/GridSwCert-Archive/GridSwCertWindows_2021_10_2.cert';
const CHROME_URL = 'https://dl.google.com/tag/s/appname=Google%20Chrome&needsadmin=true&ap=x64-stable-statsdef_0&brand=GCEA/dl/chrome/install/googlechromestandaloneenterprise64.msi';
const SEVEN_ZIP_URL = 'https://www.7-zip.org/a/7z2201-x64.msi';

const CUDA_URL = 'https://developer.download.nvidia.com/compute/cuda/12.1.0/local_installers/cuda_12.1.0_531.14_windows.exe';
const PYTHON_URL = 'https://www.python.org/ftp/python/3.10.0/python-3.10.0-amd64.exe';
const TD_URL = 'https://download.derivative.ca/TouchDesigner.2023.11760.exe';

const EC2_KEYPAIR_NAME = 'GamingOnEc2';
const VOLUME_SIZE_GIB = 200;
const OPEN_PORTS = [8443, 5990, 3389];
const ALLOW_INBOUND_CIDR = '0.0.0.0/0';
const ACCOUNT_ID = '471112955109';
const REGION = 'us-west-2';

new G5Stack(app, 'CloudTD', {
  niceDCVDisplayDriverUrl: NICE_DCV_DISPLAY_DRIVER_URL,
  niceDCVServerUrl: NICE_DCV_SERVER_URL,
  sevenZipUrl: SEVEN_ZIP_URL,
  chromeUrl: CHROME_URL,
  gridSwCertUrl: GRID_SW_CERT_URL,
  instanceSize: ec2.InstanceSize.XLARGE2,
  ec2KeyName: EC2_KEYPAIR_NAME,
  volumeSizeGiB: VOLUME_SIZE_GIB,
  openPorts: OPEN_PORTS,
  associateElasticIp: true,
  allowInboundCidr: ALLOW_INBOUND_CIDR,
  env: {
    account: ACCOUNT_ID,
    region: REGION,
  },
  tags: {
    project: 'CloudTD',
  },
  tdUrl: TD_URL,
  cudaUrl: CUDA_URL,
  pythonUrl: PYTHON_URL
});