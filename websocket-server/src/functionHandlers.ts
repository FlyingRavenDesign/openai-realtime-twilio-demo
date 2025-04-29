import { FunctionHandler } from "./types";
import { bingSearch } from "./search";

const functions: FunctionHandler[] = [];

functions.push({
  schema: {
    name: "get_weather_from_coords",
    type: "function",
    description: "Get the current weather",
    parameters: {
      type: "object",
      properties: {
        latitude: {
          type: "number",
        },
        longitude: {
          type: "number",
        },
      },
      required: ["latitude", "longitude"],
    },
  },
  handler: async (args: { latitude: number; longitude: number }) => {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${args.latitude}&longitude=${args.longitude}&current=temperature_2m,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m`
    );
    const data = await response.json();
    const currentTemp = data.current?.temperature_2m;
    return JSON.stringify({ temp: currentTemp });
  },
});

functions.push({
  schema: {
    name: "live_search",
    description: "Search the public web and return up-to-date results",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to search for" }
      },
      required: ["query"]
    }
  },
  handler: async ({ query }: { query: string }) => {
    return await bingSearch(query, 3);       // returns JSON string
  }
});
               

export default functions;
