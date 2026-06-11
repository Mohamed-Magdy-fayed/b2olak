import Anthropic from "@anthropic-ai/sdk";

/**
 * Item dedup judge — Claude Haiku classifies whether a customer-added item
 * matches an existing catalog item and supplies canonical bilingual names.
 * Called ONLY from Inngest jobs, never client-side (docs/05 stage 3).
 */

const MODEL = "claude-haiku-4-5-20251001";

export type ItemMatchCandidate = {
  id: string;
  nameEn: string | null;
  nameAr: string | null;
  aliases: string[];
  similarity: number;
};

export type ItemMatchVerdict = {
  verdict: "match" | "no_match" | "unsure";
  matchedItemId: string | null;
  canonicalNameEn: string;
  canonicalNameAr: string;
};

let _client: Anthropic | undefined;

function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set.");
    }
    _client = new Anthropic();
  }
  return _client;
}

export async function judgeItemMatch(input: {
  rawName: string;
  categoryNameEn: string;
  candidates: ItemMatchCandidate[];
}): Promise<ItemMatchVerdict> {
  const client = getClient();

  const prompt = `You deduplicate a bilingual (Arabic/English) Egyptian grocery catalog.

A customer typed a new item name. Decide if it is the SAME product as one of the existing candidates (same product = same thing a shopper would buy; different sizes/brands of the same staple count as the same catalog item).

New item (as typed): ${JSON.stringify(input.rawName)}
Category: ${input.categoryNameEn}

Candidates:
${
  input.candidates.length === 0
    ? "(none)"
    : input.candidates
        .map(
          (c) =>
            `- id=${c.id} en=${JSON.stringify(c.nameEn)} ar=${JSON.stringify(c.nameAr)} aliases=${JSON.stringify(c.aliases)} similarity=${c.similarity}`,
        )
        .join("\n")
}

Respond with ONLY a JSON object, no prose:
{"verdict":"match"|"no_match"|"unsure","matchedItemId":"<candidate id or null>","canonicalNameEn":"<clean English product name>","canonicalNameAr":"<clean Arabic product name>"}

Rules:
- "match" only if clearly the same product as a candidate.
- "no_match" if it is a real product not in the candidates; provide good canonical names in BOTH languages.
- "unsure" if ambiguous or the input is gibberish/not a product.`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content[0];
  const text = block?.type === "text" ? block.text : "";
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error(`Unparseable AI response: ${text.slice(0, 200)}`);
  }

  const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as Partial<
    Record<keyof ItemMatchVerdict, unknown>
  >;

  const verdict =
    parsed.verdict === "match" ||
    parsed.verdict === "no_match" ||
    parsed.verdict === "unsure"
      ? parsed.verdict
      : "unsure";

  const matchedItemId =
    typeof parsed.matchedItemId === "string" &&
    input.candidates.some((c) => c.id === parsed.matchedItemId)
      ? parsed.matchedItemId
      : null;

  return {
    verdict: verdict === "match" && !matchedItemId ? "unsure" : verdict,
    matchedItemId,
    canonicalNameEn:
      typeof parsed.canonicalNameEn === "string" ? parsed.canonicalNameEn : "",
    canonicalNameAr:
      typeof parsed.canonicalNameAr === "string" ? parsed.canonicalNameAr : "",
  };
}
