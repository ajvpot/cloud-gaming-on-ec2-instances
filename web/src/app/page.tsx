"use client";

import { useState, useEffect } from "react";
import { startEC2Instances, stopEC2Instances } from "./actions";

interface InstanceStatus {
  instanceId: string;
  state: string;
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [statuses, setStatuses] = useState<InstanceStatus[]>([]);

  const fetchStatuses = async () => {
    try {
      const response = await fetch("/api/instance-statuses");
      const data = await response.json();
      setStatuses(data);
    } catch (error) {
      console.error("Failed to fetch instance statuses", error);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

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

  return (
    <div>
      <h1>EC2 Control</h1>
      <button onClick={() => handleAction("start")} disabled={loading}>
        Start Instances
      </button>
      <button onClick={() => handleAction("stop")} disabled={loading}>
        Stop Instances
      </button>
      {message && <p>{message}</p>}
      <h2>Instance Statuses</h2>
      <ul>
        {statuses.map((status) => (
          <li key={status.instanceId}>
            {status.instanceId}: {status.state}
          </li>
        ))}
      </ul>
    </div>
  );
}
