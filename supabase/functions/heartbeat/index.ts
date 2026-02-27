import { corsHeaders, jsonResponse } from '../_shared/types.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  return jsonResponse({
    status: 'ok',
    service: 'bus-fleet-manager',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});
