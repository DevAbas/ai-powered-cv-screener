import type { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";

// How a candidate photo is asked for. The `image` probe in check-models sends
// the same options, so a passing probe means the photo step works.

export const PHOTO_STYLE_SUFFIX =
  "Neutral studio headshot, plain light grey background, soft even lighting, business casual, looking at the camera, no text, no logos, no watermark, photorealistic.";

export const PHOTO_MEDIA_TYPE = "image/jpeg";

export function photoPrompt(description: string): string {
  return `${description.trim().replace(/\.?$/, ".")} ${PHOTO_STYLE_SUFFIX}`;
}

export function photoProviderOptions(): { google: GoogleGenerativeAIProviderOptions } {
  return {
    google: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "512",
        imageOutputOptions: { mimeType: PHOTO_MEDIA_TYPE, compressionQuality: 85 },
      },
    },
  };
}

/** Price per 512px image, for the estimate printed before the paid step runs. */
export const PHOTO_COST_USD = 0.034;
