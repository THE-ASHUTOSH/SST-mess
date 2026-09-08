-- DATA migration (hand-written; drizzle-kit only diffs schema, so it cannot generate this).
-- 0012 created `menu_days`; this fills the first window so the new editor is not a blank slate and
-- the three live vendors' existing dish lists are carried over rather than discarded.
--
-- For every ACTIVE vendor that has a weekly menu, seed one row per day for the current window,
-- taking each day's dishes from the matching weekday of the old `menus` pattern.
--
-- Notes:
--  * The window is relative to the date this migration RUNS. That is intentional for a rolling
--    window — whoever applies it gets a full window from their own "today".
--  * `(now() AT TIME ZONE 'Asia/Kolkata')::date` uses Postgres' tz database rather than a hardcoded
--    +05:30, so it is correct regardless of the server's own timezone.
--  * ISODOW: 1 = Monday … 7 = Sunday.
--  * A missing weekday or missing meal key becomes '[]' rather than NULL, matching the NOT NULL
--    DEFAULT '[]' columns.
--  * ON CONFLICT DO NOTHING makes this safe to re-run and safe if an admin has already saved a day.

INSERT INTO "menu_days" ("vendor_id", "date", "breakfast", "lunch", "dinner")
SELECT
	v."id",
	d."day"::date,
	COALESCE(w."pattern" -> 'breakfast', '[]'::jsonb),
	COALESCE(w."pattern" -> 'lunch',     '[]'::jsonb),
	COALESCE(w."pattern" -> 'dinner',    '[]'::jsonb)
FROM "vendors" v
JOIN "menus" m ON m."id" = v."menu_id"
CROSS JOIN generate_series(
	(now() AT TIME ZONE 'Asia/Kolkata')::date,
	(now() AT TIME ZONE 'Asia/Kolkata')::date + INTERVAL '14 days',
	INTERVAL '1 day'
) AS d("day")
CROSS JOIN LATERAL (
	SELECT CASE EXTRACT(ISODOW FROM d."day")
		WHEN 1 THEN m."monday"
		WHEN 2 THEN m."tuesday"
		WHEN 3 THEN m."wednesday"
		WHEN 4 THEN m."thursday"
		WHEN 5 THEN m."friday"
		WHEN 6 THEN m."saturday"
		ELSE m."sunday"
	END AS "pattern"
) w
WHERE v."deleted_at" IS NULL
ON CONFLICT ("vendor_id", "date") DO NOTHING;
