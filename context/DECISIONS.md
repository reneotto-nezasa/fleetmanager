# Key Decisions — Feb 11, 2026 Review Call

> Participants: René Otto (Nezasa CPO), Ronja Bücker (mTours PM), Staffan Scherz (Nezasa)
> Source: Sync Mtours Bus Seat Plan transcript

## 1. Scope Reduction

The original FleetManager prototype replicated too much of Trip Builder. The new Bus Fleet Manager keeps ONLY:
- Buses (vehicle definitions + codes)
- Seat maps (templates + per-departure instances)
- Boarding points (pickup locations + add-on prices)
- Bookings (seat assignments from Trip Builder via Connect API)

Everything else — trips, pricing, accommodations, extras, tour guide details, scheduling — stays in Trip Builder.

## 2. Bus-Centric Model (not Trip-Centric)

Old model: Trip → Departure → Transport → Seat Map
New model: Bus → Seat Map → Instances per departure date

"Du legst eigentlich Busse an. Der Bus hat ein Sitzplan und dann hast du die Zustiegspunkte." — René

## 3. Same Seat Plan for Outbound & Return

mTours uses the same bus for both directions. One seat map instance per bus per departure covers both legs. No separate return seat assignment.

"Wenn es für Nezasa okay wäre, dass ich z.B. einen Bus anlege und den nur in die Hinfahrt reinziehe... ich brauche kein Sitzplan für die Rückfahrt, weil es ist der gleiche." — Ronja

## 4. Boarding Points = Pickup Only

Boarding points are NOT route stops with activities or overnight stays. They are pure bus stops for getting on.

"Das sind nur Zustiegspunkte. Da stoppen wir nicht zwangsläufig. Wir halten kurz an, lassen die Leute einsteigen, aber dann geht's weiter." — Ronja

Boarding points for outbound = drop-off points for return. Only managed once.

## 5. Add-on Price per Boarding Point

Not a mandatory field. Operator can optionally set a surcharge per boarding point per bus (e.g., "Bremen costs €50 more"). Delivered to Trip Builder via the API.

## 6. No Ship/Ferry Support

Ships go to Cruise Compass. Remove all SCHIFF/ship types from Bus Fleet Manager.

## 7. Tour Guide: Seat Blocking Only

The tour guide's identity (name, phone, etc.) is specified in Trip Builder via the Tour Leader function. Bus Fleet Manager only blocks the seat and labels it.

## 8. Integration via Connect API

Trip Builder sends Book/Cancel commands via the Ground Transport Connect API. Bus Fleet Manager responds with availability and confirms bookings. This mirrors how live flight bookings work.

## 9. Seat Selection in Planner

The customer picks seats in the Trip Builder planner UI. The seat map data comes from Bus Fleet Manager via the API. Seats are held temporarily (configurable timeout, ~10 min) until checkout completes.

## 10. Bus Configuration in Trip Builder Template

The operator enters a bus code in the Trip Builder template to link it. "Jeder Bus kriegt ein Kürzel, dann tragen wir das ein und dann ist das verknüpft." — René
