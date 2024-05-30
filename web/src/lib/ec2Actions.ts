import {
  EC2Client,
  StartInstancesCommand,
  StopInstancesCommand,
  DescribeInstanceStatusCommand,
} from "@aws-sdk/client-ec2";
import {
  CloudFormationClient,
  DescribeStackResourcesCommand,
} from "@aws-sdk/client-cloudformation";

const ec2Client = new EC2Client({ region: process.env.AWS_REGION });
const cloudFormationClient = new CloudFormationClient({
  region: process.env.AWS_REGION,
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
