// Exemplo de integração Tuya + Next.js
// Arquivo: app/api/tuya/status/route.ts

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const TUYA_ACCESS_ID = process.env.TUYA_ACCESS_ID!;
const TUYA_ACCESS_SECRET = process.env.TUYA_ACCESS_SECRET!;
const TUYA_BASE_URL = "https://openapi.tuyaus.com"; // ajuste se necessário
const DEVICE_ID = process.env.DEVICE_ID!;

function generateSign(
  method: string,
  path: string,
  accessToken: string,
  timestamp: string,
  body = ""
) {
  const bodyHash = crypto
    .createHash("sha256")
    .update(body)
    .digest("hex");

  const stringToSign = [method, bodyHash, "", path].join("\n");

  const signStr = TUYA_ACCESS_ID + accessToken + timestamp + stringToSign;

  return crypto
    .createHmac("sha256", TUYA_ACCESS_SECRET)
    .update(signStr)
    .digest("hex")
    .toUpperCase();
}

async function getAccessToken() {
  const path = "/v1.0/token?grant_type=1";
  const timestamp = Date.now().toString();

  const stringToSign = ["GET", crypto.createHash("sha256").update("").digest("hex"), "", path].join("\n");

  const sign = crypto
    .createHmac("sha256", TUYA_ACCESS_SECRET)
    .update(TUYA_ACCESS_ID + timestamp + stringToSign)
    .digest("hex")
    .toUpperCase();

  const response = await fetch(`${TUYA_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      client_id: TUYA_ACCESS_ID,
      sign,
      t: timestamp,
      sign_method: "HMAC-SHA256",
    },
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(JSON.stringify(data));
  }

  return data.result.access_token;
}

async function getDeviceStatus() {
  const accessToken = await getAccessToken();

  const path = `/v1.0/iot-03/devices/${DEVICE_ID}/status`;
  const timestamp = Date.now().toString();

  const sign = generateSign(
    "GET",
    path,
    accessToken,
    timestamp
  );

  const response = await fetch(`${TUYA_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      client_id: TUYA_ACCESS_ID,
      access_token: accessToken,
      sign,
      t: timestamp,
      sign_method: "HMAC-SHA256",
    },
  });

  const data = await response.json();
  return data;
}

export async function GET(req: NextRequest) {
  try {
    const status = await getDeviceStatus();

    return NextResponse.json({
      success: true,
      deviceStatus: status,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { value } = await req.json();

    const accessToken = await getAccessToken();
    const path = `/v1.0/iot-03/devices/${DEVICE_ID}/commands`;
    const timestamp = Date.now().toString();

    const body = JSON.stringify({
      commands: [
        {
          code: "switch_1",
          value,
        },
      ],
    });

    const sign = generateSign(
      "POST",
      path,
      accessToken,
      timestamp,
      body
    );

    const response = await fetch(`${TUYA_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        client_id: TUYA_ACCESS_ID,
        access_token: accessToken,
        sign,
        t: timestamp,
        sign_method: "HMAC-SHA256",
        "Content-Type": "application/json",
      },
      body,
    });

    const data = await response.json();

    return NextResponse.json({
      success: true,
      result: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// ---------------------------------------------
// Webhook para atualização automática em tempo real
// Arquivo: app/api/tuya/webhook/route.ts
// ---------------------------------------------

/*
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("Evento recebido da Tuya:", body);

    // Exemplo de payload:
    // {
    //   devId: "bfxxxxxxxxxxxx",
    //   status: [
    //     {
    //       code: "switch_1",
    //       value: true
    //     }
    //   ]
    // }

    // Aqui você pode:
    // - salvar no banco
    // - atualizar dashboard
    // - disparar automações
    // - enviar notificações

    return NextResponse.json({
      success: true,
      message: "Webhook recebido com sucesso"
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
*/

/*
IMPORTANTE:

Para atualização automática sem polling:

1. No portal Tuya Developer:
Cloud
→ Project
→ Message Service
→ Subscribe
→ Device Status Notification

2. Configure a URL pública:
https://seudominio.com/api/tuya/webhook

( localhost não funciona )

3. Para testes locais use ngrok:
ngrok http 3000

4. A Tuya enviará POST automaticamente quando o dispositivo mudar de estado.
*/

/*
Crie também o arquivo .env.local

TUYA_ACCESS_ID=seu_access_id
TUYA_ACCESS_SECRET=seu_access_secret
TUYA_DEVICE_ID=seu_device_id

Depois acesse:
http://localhost:3000/api/tuya/status

Isso retorna o status ON/OFF do interruptor.
*/

// ---------------------------------------------
// Página visual para consumir a API
// Arquivo: app/TesteTuya/page.tsx
// ---------------------------------------------

/*
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

  useEffect(() => {
    loadStatus();
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
        <button
          onClick={loadStatus}
          style={{
            padding: "10px 16px",
            cursor: "pointer",
          }}
        >
          Atualizar Status
        </button>

        <button
          onClick={async () => {
            await fetch("/api/tuya/status", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ value: true }),
            });

            loadStatus();
          }}
          style={{
            padding: "10px 16px",
            cursor: "pointer",
          }}
        >
          Ligar
        </button>

        <button
          onClick={async () => {
            await fetch("/api/tuya/status", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ value: false }),
            });

            loadStatus();
          }}
          style={{
            padding: "10px 16px",
            cursor: "pointer",
          }}
        >
          Desligar
        </button>
      </div>
    </main>
  );
}
*/
