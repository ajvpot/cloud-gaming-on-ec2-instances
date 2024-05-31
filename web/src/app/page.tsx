"use client";

import { Button } from "@nextui-org/react";
import { useState, useEffect } from "react";
import { getPassword, startEC2Instances, stopEC2Instances } from "./actions";
import { useRouter } from "next/navigation";

interface InstanceStatus {
  instanceId: string;
  state: string;
  type: string;
  name: string;
  publicIp?: string;
  password?: string;
}

function encodeToUrlParams(record: Record<string, any>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value)) {
      value.forEach((val) => params.append(key, val.toString()));
    } else {
      params.append(key, value.toString());
    }
  }

  return params.toString();
}

const gpuTypes: { [key: string]: string } = {
  g5: "NVIDIA A10G",
  g6: "NVIDIA L4",
};

function displayInstanceType(instanceType: string): string {
  const [type, subtype] = instanceType.split(".");
  return `${gpuTypes[type] || ""} ${subtype || ""}`;
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [statuses, setStatuses] = useState<InstanceStatus[]>([]);

  const router = useRouter();

  const fetchStatuses = async () => {
    try {
      const response = await fetch("/api/instance-status");
      const data = await response.json();
      setStatuses(data);
    } catch (error) {
      console.error("Failed to fetch instance statuses", error);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  // TODO MAKE THESE WORK ON SPECIFIC INSTANCES
  const handleAction = async (action: "start" | "stop") => {
    setLoading(true);
    setMessage("");

    try {
      let response;
      if (action === "start") {
        response = await startEC2Instances();
      } else {
        response = await stopEC2Instances();
      }

      setMessage(response.message);
      fetchStatuses(); // Refresh statuses after action
    } catch (error) {
      setMessage("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (instanceId: string) => {
    const status = statuses.find((status) => status.instanceId === instanceId);
    const password = await handleGetPassword(instanceId);
    if (status && password) {
      router.push(
        `/connect#${encodeToUrlParams({
          username: "Administrator",
          server: `https://${status.publicIp}:8443`,
          password: password,
        })}`,
      );
    }
  };

  const handleGetPassword = async (instanceId: string) => {
    const res = await getPassword(instanceId);

    if (res) {
      if (res.message) setMessage(res.message);
      setStatuses((prevStatuses) =>
        prevStatuses.map((status) =>
          status.instanceId === instanceId
            ? { ...status, password: res.password }
            : status,
        ),
      );
      return res.password;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-950 text-white">
      <div className="bg-gray-900 p-8 rounded-lg shadow-md max-w-4xl w-full">
        <div className="text-center space-y-4 mb-8">
          <h2 className="text-2xl font-bold">Virtual Workstation Management</h2>
          <p className="text-gray-400">
            Start, stop, and connect to your virtual workstations.
          </p>
          {message && <p className={"text-gray-400"}>{message}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-6">
          {statuses.map((status) => (
            <div key={status.instanceId} className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium">{status.name}</h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${status.state === "running" ? "bg-green-500" : status.state === "stopped" ? "bg-red-500" : "bg-yellow-500"} text-white`}
                >
                  {status.state.charAt(0).toUpperCase() + status.state.slice(1)}
                </span>
              </div>
              <p className="text-gray-400 mb-2">
                {displayInstanceType(status.type)}
                <br />
                IP Address:{" "}
                <a href={`https://${status.publicIp}:8443`}>
                  {status.publicIp}
                </a>
              </p>
              <p className="text-gray-400 mb-4">
                {status.state === "running"
                  ? "This virtual workstation is currently running and available for use."
                  : status.state === "stopped"
                    ? "This virtual workstation is currently offline."
                    : "This virtual workstation is currently in a pending state and may not be available for use."}
              </p>
              <div className="flex justify-end space-x-2">
                {(status.state === "running" || status.state === "pending") && (
                  <>
                    {status.password ? (
                      <>Loading...</>
                    ) : (
                      <Button
                        color="primary"
                        onClick={() => handleConnect(status.instanceId)}
                      >
                        Connect
                      </Button>
                    )}
                  </>
                )}
                {status.state === "running" && (
                  <Button
                    color="danger"
                    onClick={() => handleAction("stop")}
                    disabled={loading}
                  >
                    Stop
                  </Button>
                )}
                {status.state === "stopped" && (
                  <Button
                    color="success"
                    onClick={() => handleAction("start")}
                    disabled={loading}
                  >
                    Start
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const runtime = "edge";
