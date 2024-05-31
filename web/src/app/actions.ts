"use server";

import {
  getDecryptedPassword,
  startInstances,
  stopInstances,
} from "../lib/ec2Actions";
import { KVNamespace } from "@cloudflare/workers-types";
import { headers } from "next/headers";

// Assuming you have a KV namespace binding named `CLOUDTD_USER_STACK_MAP`
const CLOUDTD_USER_STACK_MAP: KVNamespace = process.env.CLOUDTD_USER_STACK_MAP;

async function getStackNameFromKV(email: string): Promise<string | null> {
  return await CLOUDTD_USER_STACK_MAP.get(email);
}

function getEmail() {
  if (process.env.NODE_ENV == "development") {
    return "alex@vanderpot.com";
  }
  const email = headers().get("Cf-Access-Authenticated-User-Email");
  if (!email) {
    throw new Error("User email not found in headers");
  }
  return email;
}

export async function startEC2Instances(): Promise<{ message: string }> {
  try {
    const stackName = await getStackNameFromKV(getEmail());
    if (!stackName) {
      throw new Error("Stack name not found in KV store");
    }

    await startInstances(stackName);
    return { message: "Instances started successfully" };
  } catch (error: any) {
    return { message: error.message };
  }
}

export async function stopEC2Instances(): Promise<{ message: string }> {
  try {
    const stackName = await getStackNameFromKV(getEmail());
    if (!stackName) {
      throw new Error("Stack name not found in KV store");
    }

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
    const stackName = await getStackNameFromKV(getEmail());
    if (!stackName) {
      throw new Error("Stack name not found in KV store");
    }

    return {
      message: "Password decrypted successfully",
      password: await getDecryptedPassword(instanceId),
    };
  } catch (error: any) {
    return { message: error.message };
  }
}
