# Connect API — Ground Transport Reference

> Source: https://docs.tripbuilder.app/Mo9reezaehiengah/connectapi-groundTransports.html
> Version: 1.6 (2026-02-06)
> Base URL: https://connectapi.stg.nezasa.com/v1

## Authentication

- Header: `Contract-Id` (required, string)
- Header: `traceparent` (optional, W3C Trace Context)

## Endpoints

### GET /v1/heartbeat
Health check. Returns `{ code, message, details }`.

### POST /v1/groundTransports — Search
Find available ground transport offers.

**Request key fields:**
- `currency` (ISO 4217)
- `lang` (ISO 639-1, default "de")
- `connections[]`: each with `connectionId`, `departureLocation`, `arrivalLocation`, datetime ranges
- `paxes[]`: passenger details (title, name, birthDate, age, nationality, address, contact, nezasaRefId)
- `transportTypes[]`: filter — Bus, Shuttle, Taxi, Minibus, Rail, Ferry, Boat, Walk
- `paging`: resultsFrom, pageSize, total

**Location object:** locode, iataCode, coordinate {lat,lng}, areaCoordinate, areaRadiusInKm, stationCode, cityCode, cityName, countryCode

**Response key fields:**
- `offers[]`: reference, includedAmenities, serviceCategories[], connections[]
- `serviceCategories[]`: reference, name, description, departureTime, onRequest, salesPrice {currency, value}, cancellationPolicy, segments[]
- `connections[].segments[]`: departureDatetime, arrivalDatetime, durationInMinutes, distanceInKm, transportType, vehicle {passengers, suitcases, pictures[]}

### POST /v1/groundTransports/{offerId}/details — Offer Details
Extended information for a specific offer.

### POST /v1/groundTransports/{serviceId}/availability — Availability Check
Verify current availability. Returns `quoteId` for booking.

### POST /v1/groundTransports/{quoteId}/booking — Book
Confirm booking with passenger details.

**Response:** bookingId, bookingReference, status (Confirmed/Pending), voucherUrls[], totalPrice

### DELETE /v1/groundTransports/bookings/{bookingId} — Cancel
Cancel a booking. Returns bookingId, cancellationStatus, refundAmount.

## Key Enums

- Transport types: Shuttle, Taxi, Bus, Minibus, Rail, Ferry, Boat, Walk
- Pax titles: MR, MRS, ...
- Languages: de, en, fr, it, nl, es, fi, pt, sv, no, da, pl

## Cancellation Policy
```json
{
  "cancellationType": "Unknown",
  "rules": [{ "startDatetime", "endDatetime", "percentage", "amount": { "currency", "value" } }]
}
```
