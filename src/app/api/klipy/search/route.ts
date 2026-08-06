import { NextResponse } from "next/server";
import { searchKlipy } from "@/lib/klipy/client";

export async function GET(request: Request) {
  const apiKey = process.env.KLIPY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Serviço de GIFs indisponível: chave KLIPY não configurada." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q) {
    return NextResponse.json({ error: "Parâmetro q é obrigatório" }, { status: 400 });
  }

  try {
    const results = await searchKlipy(q);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Falha ao buscar GIFs no KLIPY" },
      { status: 502 },
    );
  }
}
