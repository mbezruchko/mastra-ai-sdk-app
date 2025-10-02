import { mastra } from "@/mastra";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  const agent = mastra.getAgent("weatherAgent");
  const stream = await agent.streamVNext(messages, { format: "aisdk" });
  return stream.toUIMessageStreamResponse();
}