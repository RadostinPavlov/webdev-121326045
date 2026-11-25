ALTER TABLE events
    ADD COLUMN organizer_id INTEGER REFERENCES users(id);

UPDATE events
SET organizer_id = organizers.id
FROM users AS organizers
WHERE organizers.email = 'organizer@example.com';

ALTER TABLE events
    ALTER COLUMN organizer_id SET NOT NULL;
