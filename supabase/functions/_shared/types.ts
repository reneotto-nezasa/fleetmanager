export interface ConnectSearchRequest {
  connections: Array<{
    departureLocation: {
      cityName?: string;
      coordinate?: { latitude: number; longitude: number };
    };
    arrivalLocation: {
      cityName?: string;
    };
    departureMinDatetime: string;
    departureMaxDatetime: string;
  }>;
  paxes: Array<{ nezasaRefId: string; title?: string; firstName?: string; lastName?: string }>;
  transportTypes?: string[];
}

export interface ConnectOffer {
  reference: string;
  connections: Array<{
    segments: Array<{
      transportType: string;
      vehicle: { passengers: number };
    }>;
    departureName: string;
    arrivalName: string;
  }>;
  serviceCategories: Array<{
    name: string;
    salesPrice: { currency: string; value: string };
    onRequest: boolean;
  }>;
}

export interface ConnectBookingRequest {
  paxes: Array<{
    nezasaRefId: string;
    title?: string;
    firstName?: string;
    lastName?: string;
  }>;
  externalBookingReference?: string;
}

export interface ConnectSeatSelectionRequest {
  departureDate: string;
  boardingPointCode: string;
  selectedSeats: string[];
  paxes: Array<{
    nezasaRefId: string;
    seatLabel: string;
  }>;
}

export interface ConnectAvailabilityRequest {
  departureDate: string;
  boardingPointCode?: string;
  paxCount: number;
}

/**
 * Extract a resource ID from the URL path.
 * Works with both production proxy paths (/v1/groundTransports/{id}/action)
 * and Supabase local dev paths (/functions/v1/function-name/{id}).
 */
export function extractPathId(url: string): string | null {
  const path = new URL(url).pathname;
  const parts = path.split('/').filter(Boolean);

  // Production proxy: /v1/groundTransports/{id}/...
  const gtIdx = parts.indexOf('groundTransports');
  if (gtIdx >= 0 && parts[gtIdx + 1]) {
    return parts[gtIdx + 1];
  }

  // Supabase local via Kong proxy: /functions/v1/{function-name}/{id}
  const fnIdx = parts.indexOf('v1');
  if (fnIdx >= 0 && parts.length > fnIdx + 2) {
    return parts[parts.length - 1];
  }

  // Edge Runtime internal: /{function-name}/{id} (no /functions/v1/ prefix)
  if (parts.length >= 2) {
    return parts[parts.length - 1];
  }

  return null;
}

export function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, contract-id',
    'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
  };
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}
