"use server";

import {
  getDecryptedPassword,
  startInstances,
  stopInstances,
} from "../lib/ec2Actions";
import { getStackNameForUser } from "@/lib/kv";

export async function startEC2Instances(): Promise<{ message: string }> {
  try {
    const stackName = await getStackNameForUser();

    await startInstances(stackName);
    return { message: "Instances started successfully" };
  } catch (error: any) {
    return { message: error.message };
  }
}

export async function stopEC2Instances(): Promise<{ message: string }> {
  try {
    const stackName = await getStackNameForUser();

    await stopInstances(stackName);
    return { message: "Instances stopped successfully" };
  } catch (error: any) {
    return { message: error.message };
  }
}

export async function getPassword(
  instanceId: string,
): Promise<{ message: string; password?: string }> {
  try {
    const stackName = await getStackNameForUser();

    return {
      message: "Password decrypted successfully",
      password: await getDecryptedPassword(instanceId),
    };
  } catch (error: any) {
    return { message: error.message };
  }
}
