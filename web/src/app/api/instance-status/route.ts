import { NextResponse } from "next/server";
import { getInstanceStatuses } from "@/lib/ec2Actions";
import { getStackNameForUser } from "@/lib/kv";

export async function GET() {
  try {
    const stackName = await getStackNameForUser();

    const statuses = await getInstanceStatuses(stackName);
    return NextResponse.json(statuses, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch instance statuses" },
      { status: 500 },
    );
  }
}

export const runtime = "edge";
