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