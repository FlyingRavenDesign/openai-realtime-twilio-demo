export async function bingSearch(query: string, k = 3) {
  const url = `${process.env.BING_ENDPOINT}?q=${encodeURIComponent(query)}&mkt=en-GB&count=${k}`;
  const r = await fetch(url, {
    headers: { "Ocp-Apim-Subscription-Key": process.env.BING_KEY! }
  }).then(r => r.json());

  return JSON.stringify(
    r.webPages.value.map((p: any) => ({
      title: p.name,
      url: p.url,
      snippet: p.snippet
    }))
  );
}
