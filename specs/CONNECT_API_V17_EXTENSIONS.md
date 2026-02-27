# Connect API v1.7 — Extension Briefing: Vehicle & Stop Targeting

> **Author:** Rene Otto, CPO
> **Date:** 2026-02-26
> **Audience:** Supply Team PM
> **Status:** Proposal

---

## Why

Trip Builder needs to target **specific vehicles and boarding points** when searching for ground transport — not just "any bus from city A to city B." This matters because:

- Tour operators configure templates with a specific bus (e.g., Hummel 28+1) and specific pickup points (e.g., Osnabrück ZOB, Bremen Hbf)
- Seat selection requires knowing which exact vehicle is assigned
- We're adding Distribusion alongside BFM as a ground transport supplier — the extensions must work for both

The Connect API is our universal protocol. Each supplier has its own middleware that translates Connect API ↔ native API. These extensions keep that architecture intact — Trip Builder doesn't change how it integrates, it just gets new optional fields.

---

## Architecture Recap

```
Trip Builder
    │
    │  Connect API v1.7
    │
    ├──→ BFM Middleware ──→ Supabase (self-operated buses)
    ├──→ Distribusion Middleware ──→ Distribusion DT API (external carriers)
    └──→ Future Middleware ──→ ...
```

Trip Builder speaks **only** Connect API. Each middleware handles the translation to whatever the supplier's native API looks like. The extensions below are additions to the Connect API contract that all middlewares implement.

---

## Extension 1: `vehicleCode` in Search Request

**Field:** `vehicleCode` (string, optional)
**Where:** Top-level in `POST /v1/groundTransports` request body

```jsonc
{
  "connections": [{ /* unchanged */ }],
  "paxes": [{ /* unchanged */ }],
  "transportTypes": ["Bus"],
  "currency": "EUR",

  "vehicleCode": "HUM-01"          // NEW — optional
}
```

**Behavior:**
- If set: middleware returns only offers matching this vehicle/carrier
- If omitted: existing behavior (all matching vehicles)

**Per middleware:**
| Middleware | Translation |
|-----------|-------------|
| BFM | `WHERE buses.code = 'HUM-01'` |
| Distribusion | Filter by `marketing_carrier_id` on `/connections/find` |

---

## Extension 2: `stationCodes` in Location Object

**Field:** `stationCodes` (string[], optional)
**Where:** Inside `departureLocation` and `arrivalLocation` objects

```jsonc
{
  "connections": [{
    "connectionId": "c1",
    "departureLocation": {
      "cityName": "Osnabrück",       // existing — fuzzy match
      "stationCodes": ["OS-ZOB"]     // NEW — exact match, takes precedence
    },
    "arrivalLocation": {
      "cityName": "Bremen",
      "stationCodes": ["HB-HBF"]
    },
    "departureMinDatetime": "2026-05-15T00:00:00Z",
    "departureMaxDatetime": "2026-05-15T23:59:59Z"
  }]
}
```

**Behavior:**
- If `stationCodes` is set: middleware matches by exact station/stop codes
- If only `cityName` is set: fuzzy match (existing behavior)
- Both can coexist — `stationCodes` takes precedence when present

**Per middleware:**
| Middleware | Translation |
|-----------|-------------|
| BFM | `WHERE boarding_points.code IN ('OS-ZOB')` |
| Distribusion | Map to 8-letter Distribusion station codes internally (e.g., `OS-ZOB` → `DEOSCZOB`), pass as `departure_stations[]` |

**Note:** Each middleware maintains its own station code mapping. The codes in `stationCodes` are the **Connect API codes** — the middleware translates to supplier-native codes internally. This mapping is an implementation concern of each middleware, not the Connect API spec.

---

## Extension 3: `seatMap` in Details Response

**Field:** `seatMap` (object, optional)
**Where:** Response body of `POST /v1/groundTransports/{offerId}/details`

```jsonc
{
  "bus": { "code": "HUM-01", "name": "Hummel 28+1" },

  "seatMap": {                                  // NEW — optional
    "rows": 10,
    "cols": 4,
    "seats": [
      {
        "row": 0,
        "col": 0,
        "label": "1A",
        "type": "seat",                         // seat | driver | wc | kitchen | entry | stairway | table | empty
        "status": "available",                  // available | booked | blocked | held
        "attributes": {
          "premium": false,
          "wheelchair": false,
          "extraLegroom": false
        }
      }
    ]
  },

  "boardingPoints": [                           // NEW — optional
    {
      "code": "OS-ZOB",
      "name": "Osnabrück, ZOB Bussteig 3",
      "addonPrice": { "currency": "EUR", "value": "0.00" }
    },
    {
      "code": "HB-HBF",
      "name": "Bremen, Hbf",
      "addonPrice": { "currency": "EUR", "value": "50.00" }
    }
  ]
}
```

**Behavior:**
- Middleware returns the seat map if the supplier supports seat selection
- `seatMap: null` if the supplier/vehicle doesn't support it
- Trip Builder renders the seat map and lets customers pick seats

**Per middleware:**
| Middleware | Translation |
|-----------|-------------|
| BFM | Already implemented — returns instance seats from Supabase |
| Distribusion | Translates `GET /connections/seats` (x,y,z coordinate system) into row/col grid format. Returns `null` if carrier doesn't support seats. |

---

## Extension 4: Seat Selection Endpoint (already exists)

**Endpoint:** `POST /v1/groundTransports/{offerId}/seatSelection`

This endpoint is already part of the BFM implementation. It needs to be **added to the Connect API spec** as an official optional endpoint.

```jsonc
// Request
{
  "departureDate": "2026-05-15",
  "boardingPointCode": "OS-ZOB",
  "selectedSeats": ["3A", "3B"],
  "paxes": [
    { "nezasaRefId": "pax-001", "seatLabel": "3A" },
    { "nezasaRefId": "pax-002", "seatLabel": "3B" }
  ]
}

// Response
{
  "quoteId": "uuid",
  "expiresAt": "2026-05-15T14:10:00Z",
  "selectedSeats": [
    { "label": "3A", "status": "held", "paxRef": "pax-001" },
    { "label": "3B", "status": "held", "paxRef": "pax-002" }
  ],
  "totalAddonPrice": { "currency": "EUR", "value": "0.00" }
}
```

**Per middleware:**
| Middleware | Translation |
|-----------|-------------|
| BFM | Already implemented — holds seats in Supabase, returns quoteId |
| Distribusion | Translates to `POST /reservations/create` with `seat_codes[]`, returns Distribusion `reservation_id` as `quoteId` |

---

## Summary of Changes

| # | What | Type | Breaking? |
|---|------|------|-----------|
| 1 | `vehicleCode` in search request | New optional field | No |
| 2 | `stationCodes[]` in location objects | New optional field | No |
| 3 | `seatMap` + `boardingPoints` in details response | New optional response fields | No |
| 4 | `/seatSelection` endpoint | New optional endpoint | No |

All extensions are **optional and backward-compatible**. Existing middlewares that don't support these fields simply ignore them.

---

## Impact Per Team

### Trip Builder
- Start passing `vehicleCode` and `stationCodes` from template config in search requests
- Render seat map from details response when `seatMap` is present
- Call `/seatSelection` before `/booking` when seats are selected
- No architectural changes — same Connect API integration

### BFM Middleware (mTours)
- Add `vehicleCode` filter to search endpoint (~5 lines)
- Add `stationCodes` matching to search endpoint (~10 lines)
- Details + seat selection + booking: already done

### Distribusion Middleware (new)
- Implement full Connect API interface
- Maintain internal station code mapping (Connect API codes ↔ Distribusion 8-letter codes)
- Translate `vehicleCode` → `marketing_carrier_id`
- Translate seat coordinates → Connect API grid format
- Translate reservation flow → Connect API hold/booking flow

### Future Middlewares
- Implement these fields as appropriate for their supplier API
- Return `seatMap: null` if supplier doesn't support seat selection

---

## Open Questions

1. **Station code registry** — Who owns the canonical list of Connect API station codes? Should there be a shared lookup endpoint, or does each middleware register its supported codes?
2. **Seat selection capability flag** — Should the search response include a `seatSelectionSupported: boolean` per offer so Trip Builder knows whether to show the seat picker?
3. **Boarding point add-on pricing** — For BFM this is configured per bus-boarding-point pair. For Distribusion this comes from fare class pricing. Do we need a unified add-on pricing model, or is `boardingPoints[].addonPrice` sufficient?
