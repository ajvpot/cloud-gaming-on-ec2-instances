"use server";

import { startInstances, stopInstances } from "../lib/ec2Actions";

export async function startEC2Instances(): Promise<{ message: string }> {
  try {
    await startInstances(process.env.STACK_NAME!);
    return { message: "Instances started successfully" };
  } catch (error: any) {
    return { message: error.message };
  }
}

export async function stopEC2Instances(): Promise<{ message: string }> {
  try {
    await stopInstances(process.env.STACK_NAME!);
    return { message: "Instances stopped successfully" };
  } catch (error: any) {
    return { message: error.message };
  }
}
