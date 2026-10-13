import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const targetRpc = process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.mainnet.arc.io";

    const response = await fetch(targetRpc, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("RPC proxy error:", error);
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32603,
          message: error?.message || "Internal RPC proxy error",
        },
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    chain: "Arc Mainnet",
    chainId: 5042,
  });
}
