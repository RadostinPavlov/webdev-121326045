ALTER TABLE events
    ADD CONSTRAINT events_capacity_positive CHECK (capacity > 0);

ALTER TABLE registrations
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX registrations_event_id_idx ON registrations (event_id);
