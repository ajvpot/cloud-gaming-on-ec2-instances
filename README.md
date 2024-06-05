# RenderLab

Welcome to the RenderLab! This project provides cloud-based virtual workstations with GPU accelerators for AI generative graphics workloads. The application leverages Next.js for the web interface and AWS CDK for deploying the infrastructure to AWS.

## Directory Structure

- `web`: Contains the Next.js application code.
- `cdk`: Contains AWS CDK code for deploying the infrastructure.

## Getting Started

### Prerequisites

1. [Node.js](https://nodejs.org/en/) (version 16 or above)
2. [AWS CLI](https://aws.amazon.com/cli/)
3. [AWS CDK](https://aws.amazon.com/cdk/)
4. AWS EC2 Key Pair (.pem)

### Setting Up the Web Application

1. **Navigate to the `web` directory:**
   ```bash
   cd web
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

   Your application will start at [http://localhost:3000](http://localhost:3000).

### Deploying the Infrastructure with AWS CDK

This repository contains the necessary CDK code for deploying graphics-optimized cloud workstations on AWS.

#### Solution Overview
<p align="center">
  <img src="img/GraphicsOnG_architecture.png" />
</p>

#### 1. Navigate to the `cdk` directory:
```bash
cd cdk
```

#### 2. Install dependencies:
```bash
npm install
```

#### 3. Review Configuration:
Edit `cdk/bin/renderlab.ts` to configure the parameters:
- `ACCOUNT` and `REGION`: Your AWS account ID and region.
- `NICE_DCV_DISPLAY_DRIVER_URL`, `NICE_DCV_SERVER_URL`: Download URLs for NICE DCV components.
- `InstanceSize`: E.g., `g5.xlarge`, `g4dn.xlarge`.
- `associateElasticIp`, `EC2_KEYPAIR_NAME`, `VOLUME_SIZE_GIB`, `OPEN_PORTS`, `ALLOW_INBOUND_CIDR`, `GRID_SW_CERT_URL`, `tags`, `SEVEN_ZIP_URL`, `CHROME_URL`: Various configurations related to the EC2 instance.

4. **Bootstrap your environment: (Only required once per account/region)**
```bash
cdk bootstrap
```

5. **Deploy the stack:**
```bash
cdk deploy <StackName>
```
Replace `<StackName>` with your desired stack name.

## Useful CLI Commands

List EC2 key pairs
```bash
aws ec2 describe-key-pairs --query 'KeyPairs[*].KeyName' --output table
```

Create a new key pair and save the PEM file
```bash
KEY_NAME=GamingOnEc2
aws ec2 create-key-pair --key-name $KEY_NAME --query 'KeyMaterial' --output text > $KEY_NAME.pem
```

Start/Stop an EC2 instance
```bash
aws ec2 start-instances --instance-ids INSTANCE_ID
aws ec2 stop-instances --instance-ids INSTANCE_ID
```

Create an AMI
```bash
aws ec2 create-image --instance-id <YOUR_INSTANCE_ID> --name <AMI_NAME>
```

Start an instance from a launch template
```bash
aws ec2 run-instances --image-id <YOUR_AMI_ID> --launch-template LaunchTemplateName=<TEMPLATE_NAME> --query "Instances[*].[InstanceId, PublicIpAddress]" --output table
```

List instances
```bash
aws ec2 describe-instances --query "Reservations[*].Instances[*].[ImageId, InstanceType, VpcId, State.Name, PublicIpAddress, LaunchTime]" --output table
```

Deploy all stacks without rollback and approval for IAM resources
```bash
cdk deploy --all --no-rollback --concurrency=3 --require-approval=never
```

List all stacks
```bash
cdk list
```

Tail CloudFormation logs
```powershell
Get-Content -Path C:\cfn\log\cfn-init.log -Wait
```
