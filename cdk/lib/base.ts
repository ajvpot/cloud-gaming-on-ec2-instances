/* tslint:disable:no-submodule-imports quotemark no-unused-expression */
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { InstanceSize } from "aws-cdk-lib/aws-ec2/lib/instance-types";

export interface BaseConfig extends cdk.StackProps {
  instanceSize: InstanceSize;
  ec2KeyName: string;
  volumeSizeGiB: number;
  niceDCVDisplayDriverUrl: string;
  niceDCVServerUrl: string;
  sevenZipUrl: string;
  chromeUrl: string;
  gridSwCertUrl: string;
  openPorts: number[];
  allowInboundCidr: string;
  associateElasticIp: boolean;

  tdUrl: string;
  pythonUrl: string;
  cudaUrl: string;

  availabilityZone: string;
}

export abstract class BaseEc2Stack extends cdk.Stack {
  protected props: BaseConfig;

  constructor(scope: Construct, id: string, props: BaseConfig) {
    super(scope, id, props);
    this.props = props;

    const vpc = new ec2.Vpc(this, `${id}VPC`, {
      ipAddresses: ec2.IpAddresses.cidr("10.0.0.0/16"),
      availabilityZones: [`${this.region}${this.props.availabilityZone}`],
      subnetConfiguration: [
        {
          cidrMask: 28,
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    const securityGroup = new ec2.SecurityGroup(this, `${id}SecurityGroup`, {
      vpc,
      description: "NICE DCV access",
      securityGroupName: "InboundAccessFromDcv",
    });

    // eslint-disable-next-line no-restricted-syntax
    for (const port of this.props.openPorts) {
      securityGroup.connections.allowFrom(
        ec2.Peer.ipv4(this.props.allowInboundCidr),
        ec2.Port.tcp(port),
      );
      securityGroup.connections.allowFrom(
        ec2.Peer.ipv4(this.props.allowInboundCidr),
        ec2.Port.udp(port),
      );
    }

    const s3Read = new Role(this, `${id}S3Read`, {
      roleName: `${id}.GamingDriverS3Access`,
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    s3Read.addToPolicy(
      new iam.PolicyStatement({
        resources: [
          `arn:aws:s3:::dcv-license.${this.region}/*`,
          "arn:aws:s3:::nvidia-gaming/*",
          `arn:aws:s3:::dcv-license.${this.region}`,
          "arn:aws:s3:::nvidia-gaming",
          "arn:aws:s3:::ec2-amd-windows-drivers",
          "arn:aws:s3:::ec2-amd-windows-drivers/*",
        ],
        actions: ["s3:GetObject", "s3:ListBucket"],
      }),
    );

    const launchTemplate = new ec2.CfnLaunchTemplate(
      this,
      `${id}LaunchTemplate`,
      {
        launchTemplateData: {
          keyName: props.ec2KeyName,
          instanceType: this.getInstanceType().toString(),
          networkInterfaces: [
            {
              subnetId: vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC })
                .subnetIds[0],
              deviceIndex: 0,
              description: "ENI",
              groups: [securityGroup.securityGroupId],
            },
          ],
        },
        launchTemplateName: `${id}InstanceLaunchTemplate/${this.getInstanceType().toString()}`,
      },
    );

    const ec2Instance = new ec2.Instance(this, `${id}InstanceMain`, {
      instanceType: this.getInstanceType(),
      availabilityZone: `${this.region}${this.props.availabilityZone}`,
      vpc,
      securityGroup,
      vpcSubnets: vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC }),
      keyName: props.ec2KeyName,
      machineImage: this.getMachineImage(),
      blockDevices: [
        {
          deviceName: "/dev/sda1",
          volume: ec2.BlockDeviceVolume.ebs(props.volumeSizeGiB, {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
            iops: 16000,
            //@ts-ignore lol it really works
            throughput: 300,
          }),
        },
        {
          deviceName: "xvdb",
          volume: ec2.BlockDeviceVolume.ephemeral(0), // Ephemeral volume index 0
        },
      ],
      role: s3Read,
      init: ec2.CloudFormationInit.fromConfigSets({
        configSets: {
          // Seperate configSets and specific order depending on EC2 Instance Type
          NVIDIA: ["helpersPreinstall", "script", "clean", "reboot"],
        },
        configs: {
          helpersPreinstall: new ec2.InitConfig([
            ec2.InitFile.fromFileInline(
              "C:\\Users\\Administrator\\Desktop\\InstallationFiles\\deploy.ps1",
              "resources/deploy.ps1",
            ),
          ]),
          script: new ec2.InitConfig([
            ec2.InitCommand.shellCommand(
              `powershell.exe -Command "C:\\Users\\Administrator\\Desktop\\InstallationFiles\\deploy.ps1"`,
            ),
          ]),
          reboot: new ec2.InitConfig([
            // Command to reboot instance and apply registry changes.
            ec2.InitCommand.shellCommand(
              "powershell.exe -Command Restart-Computer -force",
              {
                key: "99-restart",
                waitAfterCompletion: ec2.InitCommandWaitDuration.forever(),
              },
            ),
            ec2.InitCommand.shellCommand(
              '"C:\\Program Files\\NICE\\DCV\\Server\\bin\\dcv.exe" list-sessions"',
              {
                key: "991-check",
                waitAfterCompletion: ec2.InitCommandWaitDuration.of(
                  cdk.Duration.seconds(5),
                ),
              },
            ),
            ec2.InitCommand.shellCommand(
              `cfn-signal.exe -e %ERRORLEVEL% --resource EC2Instance --stack ${this.stackId} --region ${this.region}`,
              {
                key: "992-Signal",
                waitAfterCompletion: ec2.InitCommandWaitDuration.of(
                  cdk.Duration.seconds(5),
                ),
              },
            ),
          ]),
        },
      }),
      initOptions: {
        // Optional, which configsets to activate (['default'] by default)
        configSets: [this.getGpuType()],

        // Optional, how long the installation is expected to take (5 minutes by default)
        timeout: cdk.Duration.minutes(30),

        // Optional, whether to include the --url argument when running cfn-init and cfn-signal commands (false by default)
        includeUrl: true,

        // Optional, whether to include the --role argument when running cfn-init and cfn-signal commands (false by default)
        // includeRole: true,
      },
      instanceName: `${id}/${this.getInstanceType().toString()}`,
    });
    // Needed as cdk created hashed LogicalID and CFN signal does not work after reboot, so we have to hardcode the Logical Name in the signal (line #136)
    ec2Instance.instance.overrideLogicalId("EC2Instance");

    if (this.props.associateElasticIp) {
      const elasticIp = new ec2.CfnEIP(this, `${id}IP`, {
        instanceId: ec2Instance.instanceId,
      });

      new cdk.CfnOutput(this, "Public IP", { value: elasticIp.ref });
    } else {
      new cdk.CfnOutput(this, "Public IP", {
        value: ec2Instance.instancePublicIp,
      });
    }

    new cdk.CfnOutput(this, "Credentials", {
      value: `https://${this.region}.console.aws.amazon.com/ec2/v2/home?region=${this.region}#GetWindowsPassword:instanceId=${ec2Instance.instanceId};previousPlace=ConnectToInstance`,
    });
    new cdk.CfnOutput(this, "InstanceId", { value: ec2Instance.instanceId });
    new cdk.CfnOutput(this, "KeyName", { value: props.ec2KeyName });
    new cdk.CfnOutput(this, "LaunchTemplateId", {
      value: launchTemplate.launchTemplateName!,
    });
  }

  protected abstract getInstanceType(): ec2.InstanceType;

  protected abstract getMachineImage(): ec2.IMachineImage;

  protected abstract getGpuType(): string;
}
