// Assuming you have a KV namespace binding named `CLOUDTD_USER_STACK_MAP`
import { KVNamespace } from "@cloudflare/workers-types";
import { headers } from "next/headers";

const CLOUDTD_USER_STACK_MAP: KVNamespace = process.env.CLOUDTD_USER_STACK_MAP;

async function getStackNameFromKV(email: string): Promise<string> {
  const stackName = await CLOUDTD_USER_STACK_MAP.get(email);
  if (!stackName) throw new Error("Stack name not found in KV store");
  return stackName;
}

function getEmail() {
  if (process.env.NODE_ENV == "development") {
    return "developer";
  }
  const email = headers().get("Cf-Access-Authenticated-User-Email");
  if (!email) {
    throw new Error("User email not found in headers");
  }
  return email;
}

export async function getStackNameForUser(): Promise<string> {
  return getStackNameFromKV(getEmail());
}
