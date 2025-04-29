// websocket-server/src/search.ts
/**
 * Call Bing Web Search (Grounding with Bing Search) and return the
 * top `k` results as a JSON string that GPT can read aloud.
 */
export async function bingSearch(query: string, k = 3): Promise<string> {
  const endpoint =
    process.env.BING_ENDPOINT || "https://api.bing.microsoft.com/v7.0/search";

  const url =
    `${endpoint}?q=${encodeURIComponent(query)}` +
    `&count=${k}&mkt=en-GB&safeSearch=Moderate`;

  const response = await fetch(url, {
    headers: {
      "Ocp-Apim-Subscription-Key": process.env.BING_KEY!,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Bing search failed (${response.status} ${response.statusText})`
    );
  }

  const data: any = await response.json();

  // Shape the output so GPT can read it comfortably
  const results = (data.webPages?.value ?? []).slice(0, k).map((p: any) => ({
    title: p.name,
    url: p.url,
    snippet: p.snippet,
  }));

  return JSON.stringify(results);
}
