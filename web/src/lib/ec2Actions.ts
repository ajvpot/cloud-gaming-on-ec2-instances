import forge from "node-forge";
import {
  EC2Client,
  GetPasswordDataCommand,
  StartInstancesCommand,
  StopInstancesCommand,
  DescribeInstanceStatusCommand,
} from "@aws-sdk/client-ec2";
import {
  CloudFormationClient,
  DescribeStackResourcesCommand,
} from "@aws-sdk/client-cloudformation";

const ec2Client = new EC2Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});
const cloudFormationClient = new CloudFormationClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

async function getInstanceIdsFromStack(stackName: string): Promise<string[]> {
  const params = {
    StackName: stackName,
  };

  const command = new DescribeStackResourcesCommand(params);
  const stackResources = await cloudFormationClient.send(command);
  if (!stackResources.StackResources) {
    return [];
  }

  const instanceIds = stackResources.StackResources.filter(
    (resource) => resource.ResourceType === "AWS::EC2::Instance",
  )
    .map((resource) => resource.PhysicalResourceId)
    .filter((id): id is string => id !== undefined); // Filter out undefined values

  return instanceIds;
}

export async function startInstances(stackName: string): Promise<void> {
  const instanceIds = await getInstanceIdsFromStack(stackName);
  if (instanceIds.length === 0) return;

  const params = {
    InstanceIds: instanceIds,
  };

  const command = new StartInstancesCommand(params);
  await ec2Client.send(command);
}

export async function stopInstances(stackName: string): Promise<void> {
  const instanceIds = await getInstanceIdsFromStack(stackName);
  if (instanceIds.length === 0) return;

  const params = {
    InstanceIds: instanceIds,
  };

  const command = new StopInstancesCommand(params);
  await ec2Client.send(command);
}

export async function getInstanceStatuses(
  stackName: string,
): Promise<{ instanceId: string; state: string }[]> {
  const instanceIds = await getInstanceIdsFromStack(stackName);
  if (instanceIds.length === 0) return [];

  const params = {
    InstanceIds: instanceIds,
    IncludeAllInstances: true,
  };

  const command = new DescribeInstanceStatusCommand(params);
  const statuses = await ec2Client.send(command);
  if (!statuses.InstanceStatuses) {
    return [];
  }

  return statuses.InstanceStatuses.map((status) => ({
    instanceId: status.InstanceId!,
    state: status.InstanceState?.Name || "unknown",
  })).filter(
    (status) => status.instanceId !== undefined && status.state !== undefined,
  );
}

// Function to get the encrypted password data
export async function getDecryptedPassword(
  instanceId: string,
): Promise<string | undefined> {
  const command = new GetPasswordDataCommand({ InstanceId: instanceId });
  const response = await ec2Client.send(command);
  if (!response.PasswordData) return;
  return decryptPassword(response.PasswordData);
}

// Function to decrypt the password
export function decryptPassword(encryptedPassword: string): string {
  if (!process.env.AWS_EC2_KEY) {
    throw new Error("AWS_EC2_KEY is not set");
  }
  const privateKeyPem = process.env.AWS_EC2_KEY;
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const buffer = Buffer.from(encryptedPassword, "base64");
  const decrypted = privateKey.decrypt(
    buffer.toString("binary"),
    "RSAES-PKCS1-V1_5",
  );
  return decrypted;
}
