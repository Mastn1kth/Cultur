# Compatibility Algorithm

The backend computes `compatibility_score` from 0 to 100 and stores expensive results in `compatibility_cache`.

Weights:

- Shared language: 25 points if at least one language overlaps.
- Shared interests: 2 points per overlap, maximum 20.
- Same goal: 15 points.
- Distance: 15 at 0 km, 10 up to 50 km, 5 up to 100 km, 0 at 200+ km.
- Shared culture/background: 15 points if at least one overlaps.
- Religion or values: 10 points only when both users provided a matching value.
- Same university: 5 point bonus.
- Same city: 5 point bonus.

The score is capped at 100. The response includes human-readable reasons such as "You both speak Russian" and "Both looking for friends".

Cold-start users are ranked primarily by city and distance until profile data exists.
