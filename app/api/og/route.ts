import { NextResponse } from "next/server";

export function GET() {
  return new NextResponse("QUANTA OG placeholder", { status: 200 });
}
