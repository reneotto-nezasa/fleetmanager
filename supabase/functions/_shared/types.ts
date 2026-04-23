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
