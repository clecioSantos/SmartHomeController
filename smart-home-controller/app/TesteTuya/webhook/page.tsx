"use client";

import { useEffect, useState } from "react";

export default function Page() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function loadStatus() {
    try {
      const response = await fetch("/api/tuya/status");
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function updateDevice(value: boolean) {
    try {
      await fetch("/api/tuya/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          value,
        }),
      });

      await loadStatus();
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    loadStatus();

    const interval = setInterval(() => {
      loadStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div>Carregando status do dispositivo...</div>;
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Teste Integração Tuya</h1>

      <pre
        style={{
          background: "#f4f4f4",
          padding: 16,
          borderRadius: 8,
          overflow: "auto",
        }}
      >
        {JSON.stringify(status, null, 2)}
      </pre>

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button onClick={loadStatus}>
          Atualizar Status
        </button>

        <button onClick={() => updateDevice(true)}>
          Ligar
        </button>

        <button onClick={() => updateDevice(false)}>
          Desligar
        </button>
      </div>
    </main>
  );
}