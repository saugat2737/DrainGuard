import { z } from "zod";
import { BlockageType, ReportSeverity } from "./types";

export interface VisionAnalysisResult {
  blockage_type: BlockageType;
  severity: ReportSeverity;
  summary: string;
  fallback: boolean;
}

const analysisResponseSchema = z.object({
  blockage_type: z.enum([
    "plastic",
    "silt",
    "debris",
    "construction",
    "none",
    "unknown",
  ]),
  severity: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  summary: z.string().min(1).max(250),
});

export const FALLBACK_VISION_RESULT: VisionAnalysisResult = {
  blockage_type: "unknown",
  severity: 2,
  summary: "Automatic analysis unavailable; flagged for manual review.",
  fallback: true,
};

/**
 * Pure helper to call Gemini Vision REST API via native fetch with 8s timeout.
 * Reverts deterministically to FALLBACK_VISION_RESULT on any failure or invalid data.
 */
export async function analyzeDrainImage(
  imageBuffer: Buffer,
  mimeType: string,
  fetchFn: typeof fetch = fetch
): Promise<VisionAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  if (!apiKey || apiKey.trim() === "") {
    return FALLBACK_VISION_RESULT;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const promptText = `
You are a municipal drainage inspector AI for Tumakuru Smart City.
Analyze the provided photograph of a street storm drain or culvert.
Classify the blockage type and severity.
Allowed blockage_type values: "plastic", "silt", "debris", "construction", "none", "unknown".
Severity: 1 (minor/superficial), 2 (moderate/partial blockage), 3 (severe/completely choked).
Provide a one-line factual summary under 150 characters.

Respond ONLY with valid JSON in this exact structure without markdown backticks:
{"blockage_type": "plastic", "severity": 2, "summary": "Single line factual description."}
`;

  try {
    const base64Data = imageBuffer.toString("base64");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const payload = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        response_mime_type: "application/json",
      },
    };

    const response = await fetchFn(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return FALLBACK_VISION_RESULT;
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return FALLBACK_VISION_RESULT;
    }

    // Strip any unexpected markdown formatting
    const cleanedText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsedJson = JSON.parse(cleanedText);
    const validated = analysisResponseSchema.safeParse(parsedJson);

    if (!validated.success) {
      return FALLBACK_VISION_RESULT;
    }

    return {
      blockage_type: validated.data.blockage_type,
      severity: validated.data.severity,
      summary: validated.data.summary,
      fallback: false,
    };
  } catch {
    return FALLBACK_VISION_RESULT;
  }
}
