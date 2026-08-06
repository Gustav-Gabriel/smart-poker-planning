import { NextResponse } from "next/server";
import { searchTenor } from "@/lib/tenor/client";

export async function GET(request: Request) {
  const apiKey = process.env.TENOR_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Serviço de GIFs indisponível: chave Tenor não configurada." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q) {
    return NextResponse.json({ error: "Parâmetro q é obrigatório" }, { status: 400 });
  }

  try {
    const results = await searchTenor(q, apiKey);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Falha ao buscar GIFs no Tenor" },
      { status: 502 },
    );
  }
}
