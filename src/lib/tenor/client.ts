const REQUEST_TIMEOUT_MS = 20_000;

export type TenorGif = {
  id: string;
  url: string;
  preview: string;
};

type TenorMediaFormat = {
  url: string;
};

type TenorSearchResponse = {
  results: Array<{
    id: string;
    media_formats: {
      gif?: TenorMediaFormat;
      tinygif?: TenorMediaFormat;
      nanogif?: TenorMediaFormat;
    };
  }>;
};

export async function searchTenor(q: string): Promise<TenorGif[]> {
  const apiKey = process.env.TENOR_API_KEY;
  if (!apiKey) {
    throw new Error("TENOR_API_KEY is not configured");
  }

  const params = new URLSearchParams({
    q,
    key: apiKey,
    limit: "16",
    media_filter: "gif",
  });

  let response: Response;
  try {
    response = await fetch(
      `https://tenor.googleapis.com/v2/search?${params.toString()}`,
      { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("Tenor request timed out");
    }
    throw error;
  }

  if (!response.ok) {
    throw new Error(`Tenor request failed with status ${response.status}`);
  }

  const data = (await response.json()) as TenorSearchResponse;

  return data.results
    .map((result) => {
      const gif = result.media_formats.gif?.url;
      if (!gif) return null;

      const preview =
        result.media_formats.tinygif?.url ??
        result.media_formats.nanogif?.url ??
        gif;

      return {
        id: result.id,
        url: gif,
        preview,
      };
    })
    .filter((item): item is TenorGif => item !== null);
}
