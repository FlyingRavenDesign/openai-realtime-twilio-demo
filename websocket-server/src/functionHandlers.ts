import { FunctionHandler } from "./types";
import { bingSearch } from "./search";

const functions: FunctionHandler[] = [];

/* ───── weather (existing) ───── */
functions.push({
  schema: {
    name: "get_weather_from_coords",
    type: "function",
    description: "Get the current weather",
    parameters: {
      type: "object",
      properties: {
        latitude: { type: "number" },
        longitude: { type: "number" }
      },
      required: ["latitude", "longitude"]
    }
  },
  handler: async ({ latitude, longitude }) => {
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m`
    );
    const data = await r.json();
    return JSON.stringify({ temp: data.current?.temperature_2m });
  }
});

/* ───── NEW: live_search ───── */
functions.push({
  schema: {
    name: "live_search",
    type: "function",                       // ← add this line
    description: "Search the public web and return up-to-date results",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "What to search for"
        }
      },
      required: ["query"]
    }
  },
  handler: async ({ query }: { query: string }) => {
    return await bingSearch(query, 3);      // bingSearch already returns a JSON string
  }
});

export default functions;
