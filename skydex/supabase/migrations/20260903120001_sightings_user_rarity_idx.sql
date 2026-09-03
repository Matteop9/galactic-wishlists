-- v1.0.7 celebration tiers: /api/sightings probes "has this user ever caught
-- something this rare or rarer?" before the insert (user_id + rarity IN (...)).
-- Cheap today, but give it its own index so it stays cheap for power users.
create index if not exists sightings_user_rarity_idx
  on public.sightings using btree (user_id, rarity);
