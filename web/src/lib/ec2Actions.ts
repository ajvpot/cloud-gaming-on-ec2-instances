import AWS from "aws-sdk";

const ec2 = new AWS.EC2({ region: process.env.AWS_REGION });
const cloudformation = new AWS.CloudFormation({
  region: process.env.AWS_REGION,
});

async function getInstanceIdsFromStack(stackName: string): Promise<string[]> {
  const params = {
    StackName: stackName,
  };

  const stackResources = await cloudformation
    .describeStackResources(params)
    .promise();
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

  await ec2.startInstances(params).promise();
}

export async function stopInstances(stackName: string): Promise<void> {
  const instanceIds = await getInstanceIdsFromStack(stackName);
  if (instanceIds.length === 0) return;

  const params = {
    InstanceIds: instanceIds,
  };

  await ec2.stopInstances(params).promise();
}

export async function getInstanceStatuses(
  stackName: string,
): Promise<{ instanceId: string; state: string }[]> {
  const instanceIds = await getInstanceIdsFromStack(stackName);
  if (instanceIds.length === 0) return [];

  const params = {
    InstanceIds: instanceIds,
  };

  const statuses = await ec2.describeInstanceStatus(params).promise();
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
