import { NextResponse } from "next/server";
import { getInstanceStatuses } from "@/lib/ec2Actions";

export async function GET() {
  try {
    const stackName = process.env.AWS_STACK_NAME;
    if (!stackName) {
      return NextResponse.json(
        { error: "AWS_STACK_NAME is not set" },
        { status: 400 },
      );
    }

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
