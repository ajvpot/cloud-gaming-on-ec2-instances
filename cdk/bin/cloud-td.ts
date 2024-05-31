import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { G4DNStack } from "../lib/g4dn";
import { G4ADStack } from "../lib/g4ad";
import { G5Stack } from "../lib/g5";

const app = new cdk.App();

const EC2_KEYPAIR_NAME = "GamingOnEc2";
const VOLUME_SIZE_GIB = 200;
const OPEN_PORTS = [8443, 5990, 3389];
const ALLOW_INBOUND_CIDR = "0.0.0.0/0";
const ACCOUNT_ID = "471112955109";
const REGION = "us-west-2";

new G5Stack(app, "CloudTD", {
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
    project: "CloudTD",
  },
});
