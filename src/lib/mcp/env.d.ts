// Ambient declaration so the MCP tool files typecheck in Vite/tsc.
// At runtime these files are bundled into a Deno edge function where `process.env`
// is provided by Deno's Node compatibility layer.
export {};

declare global {
  const process: { env: Record<string, string | undefined> };
}
