-- tp_0012 — deleting a game must take its feed event with it.
--
-- Bug (feedback 2026-09-02, "The delete game button doesn't do anything"):
-- feed_events.game_id was created with the default NO ACTION referential
-- action, so `delete from games` raised 23503 for every game that had ever
-- reached the feed — which is every normally-entered game. game_players
-- (and frames beneath it) already cascaded; only the feed event blocked.
--
-- Cascading here is right rather than nulling the column: a feed event with
-- no game is not a post anyone can open, and comments/reactions/notifications
-- already cascade from feed_events, so the whole conversation goes with the
-- game it was about. Referential actions run as the table owner, so this
-- works under RLS without a delete policy on feed_events (the client still
-- cannot delete someone else's feed event directly).

alter table tenpins.feed_events
  drop constraint feed_events_game_id_fkey;

alter table tenpins.feed_events
  add constraint feed_events_game_id_fkey
  foreign key (game_id) references tenpins.games(id) on delete cascade;
