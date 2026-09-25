import { APICallError, generateText } from "ai";
import type { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import type { ModelEntry } from "./modelRegistry";
import { cloudflareCredentials, languageModel } from "./modelProviders";

// Image generation behind one interface, for the photos step: the Gemini API
// through the AI SDK, or Cloudflare Workers AI through its REST API (Workers
// AI docs, REST API: POST /accounts/{id}/ai/run/{model}), which the SDK does
// not cover. Server and scripts only: reads credentials at call time.

export const IMAGE_MEDIA_TYPE = "image/jpeg";

export interface ImageRequest {
  prompt: string;
  width: number;
  height: number;
  /** Reproducibility, where the model supports it; Gemini ignores it. */
  seed: number;
  /** Diffusion steps, where the model supports them; Gemini ignores them. */
  steps: number;
}

export interface ImageGenerator {
  /** The image bytes, a JPEG. */
  generate(request: ImageRequest, signal?: AbortSignal): Promise<Uint8Array>;
}

/** The generator for a registry entry with the `image` capability. */
export function imageGenerator(entry: ModelEntry): ImageGenerator {
  if (!entry.capabilities.image) throw new Error(`Registry entry "${entry.id}" is not an image model`);
  switch (entry.provider) {
    case "cloudflare":
      return cloudflareImages(entry);
    case "google":
      return googleImages(entry);
    case "openrouter":
      throw new Error(`No image models on provider "${entry.provider}"`);
  }
}

/** Gemini image output (Gemini API, image generation): a square of the requested size, as JPEG. */
function googleImages(entry: ModelEntry): ImageGenerator {
  return {
    async generate({ prompt, width }, signal) {
      const options: { google: GoogleGenerativeAIProviderOptions } = {
        google: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: { aspectRatio: "1:1", imageSize: geminiSize(width), imageOutputOptions: { mimeType: IMAGE_MEDIA_TYPE, compressionQuality: 85 } },
        },
      };
      const result = await generateText({ model: languageModel(entry), prompt, providerOptions: options, maxRetries: 0, abortSignal: signal });
      const image = result.files.find((file) => file.mediaType === IMAGE_MEDIA_TYPE);
      if (!image) {
        const types = result.files.map((f) => f.mediaType).join(", ") || "none";
        throw new Error(`no ${IMAGE_MEDIA_TYPE} returned (files: ${types}; finishReason: ${result.finishReason})`);
      }
      return image.uint8Array;
    },
  };
}

/** The Gemini size name that covers the requested pixels (Gemini API, image generation: 512, 1K, 2K, 4K). */
function geminiSize(pixels: number): "512" | "1K" | "2K" | "4K" {
  return pixels <= 512 ? "512" : pixels <= 1024 ? "1K" : pixels <= 2048 ? "2K" : "4K";
}

const CLOUDFLARE_API = "https://api.cloudflare.com/client/v4";

/** Workers AI: a JSON request, and either raw image bytes or JSON with the image in base64, by model. */
function cloudflareImages(entry: ModelEntry): ImageGenerator {
  return {
    async generate({ prompt, width, height, seed, steps }, signal) {
      const { accountId, token } = cloudflareCredentials();
      const url = `${CLOUDFLARE_API}/accounts/${accountId}/ai/run/${entry.model}`;
      const body = { prompt, width, height, seed, num_steps: steps };
      const response = await fetch(url, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
      const bytes = new Uint8Array(await response.arrayBuffer());
      const headers = Object.fromEntries(response.headers.entries());
      if (!response.ok) {
        const text = new TextDecoder().decode(bytes);
        throw new APICallError({
          message: `Workers AI ${response.status}: ${errorMessage(text)}`,
          url,
          requestBodyValues: body,
          statusCode: response.status,
          responseHeaders: headers,
          responseBody: text,
          // The daily allowance and rate limits answer 429; 5xx is the service.
          isRetryable: response.status === 429 || response.status >= 500,
        });
      }
      return decodeImageResponse(headers["content-type"] ?? "", bytes);
    },
  };
}

/** The image bytes of a Workers AI response: as sent when the body is an image, else the `result.image` base64 of its JSON. */
export function decodeImageResponse(contentType: string, body: Uint8Array): Uint8Array {
  if (contentType.startsWith("image/")) return body;
  let parsed: { result?: { image?: unknown } };
  try {
    parsed = JSON.parse(new TextDecoder().decode(body)) as { result?: { image?: unknown } };
  } catch {
    throw new Error(`unreadable response (content-type ${contentType || "unknown"})`);
  }
  const image = parsed.result?.image;
  if (typeof image !== "string" || image.length === 0) throw new Error(`no image in the response (content-type ${contentType || "unknown"})`);
  return new Uint8Array(Buffer.from(image, "base64"));
}

/** The first error message of a Workers AI error body, or the body's start. */
function errorMessage(text: string): string {
  try {
    const parsed = JSON.parse(text) as { errors?: { message?: string }[] };
    const message = parsed.errors?.[0]?.message;
    if (message) return message;
  } catch {
    // Not JSON: the text itself says what happened.
  }
  return text.slice(0, 200);
}
