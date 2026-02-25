import OpenAI from "openai";
import { NextResponse } from "next/server";
import { OrgProfile, ScoredGrant } from "@/types/grant";

const FALLBACK_BRIEF =
  "Here is a lightweight funder brief. Summarize your traction bullets, quantify the community touched this quarter, and highlight the de-risking milestone you'll cover with the grant ask.";

type BriefPayload = OrgProfile & { topGrant?: ScoredGrant };

function buildPrompt(body: BriefPayload) {
  const { orgName, mission, differentiator, topGrant } = body;
  return `You are a grant storyteller for grassroots innovators.
Craft a 110-word micro-brief that a program officer could scan.
Include: org purpose, why it is uniquely suited, proof of readiness, and the specific linkage to ${topGrant?.name}.
Keep the tone confident, outcomes-first, no fluff.

Org: ${orgName}
Mission: ${mission}
Edge: ${differentiator}
Target grant signals: ${topGrant?.signals?.join(", ")}`;
}

function pickModel(base: "openai" | "openrouter" | "anthropic") {
  if (base === "openrouter") return "openrouter/auto";
  if (base === "anthropic") return "claude-3-5-sonnet-latest";
  return "gpt-4.1-mini";
}

export async function POST(req: Request) {
  const body = await req.json();
  const apiKey =
    process.env.OPENAI_API_KEY ?? process.env.OPENROUTER_API_KEY ?? process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ brief: FALLBACK_BRIEF });
  }

  const provider = process.env.OPENAI_API_KEY
    ? "openai"
    : process.env.OPENROUTER_API_KEY
      ? "openrouter"
      : "anthropic";

  const client = new OpenAI({
    apiKey,
    baseURL: provider === "openrouter" ? "https://openrouter.ai/api/v1" : undefined,
    defaultHeaders:
      provider === "openrouter"
        ? {
            "HTTP-Referer": "https://treemux-kzukoxxepzvcjrumxnszn.vercel.app",
            "X-Title": "GrantPilot",
          }
        : undefined,
  });

  try {
    const response = await client.responses.create({
      model: pickModel(provider),
      input: buildPrompt(body),
      max_output_tokens: 250,
    });

    const brief = response.output_text ?? FALLBACK_BRIEF;
    return NextResponse.json({ brief });
  } catch (error) {
    console.error("Brief generation error", error);
    return NextResponse.json({ brief: FALLBACK_BRIEF });
  }
}
