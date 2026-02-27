const VALID_CONTRACT_IDS = new Set([
  'mtours-contract-001',
]);

export function validateAuth(req: Request): { valid: boolean; contractId: string | null; error?: string } {
  const contractId = req.headers.get('Contract-Id') || req.headers.get('contract-id');
  if (!contractId) {
    return { valid: false, contractId: null, error: 'Missing Contract-Id header' };
  }
  if (!VALID_CONTRACT_IDS.has(contractId)) {
    return { valid: false, contractId, error: 'Invalid Contract-Id' };
  }
  return { valid: true, contractId };
}

export function unauthorizedResponse(error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
