CREATE DATABASE IF NOT EXISTS wellness_visit_context CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE wellness_visit_context;

SET NAMES utf8mb4;

DROP TABLE IF EXISTS weather_context;
DROP TABLE IF EXISTS locations;

CREATE TABLE locations (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(255) NOT NULL,
  destination VARCHAR(512) NOT NULL,
  label VARCHAR(255) NOT NULL,
  value VARCHAR(512) NOT NULL,
  latitude DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(9,6) NOT NULL,
  opening_note VARCHAR(255) NOT NULL,
  arrival_tip VARCHAR(500) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE weather_context (
  location_id VARCHAR(64) PRIMARY KEY,
  fallback_condition VARCHAR(120) NOT NULL,
  fallback_temperature_c DECIMAL(4,1) NOT NULL,
  fallback_summary VARCHAR(500) NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO locations
  (id, name, address, destination, label, value, latitude, longitude, opening_note, arrival_tip, sort_order, active)
VALUES
  ('wellness-center-main', 'Serenity Wellness Center', 'Konrad-Zuse-Strasse 5, 71034 Boeblingen, Germany', 'Konrad-Zuse-Strasse 5, 71034 Boeblingen, Germany', 'Serenity Wellness Center', 'Konrad-Zuse-Strasse 5, 71034 Boeblingen, Germany', 48.684700, 9.008600, 'Open today for massage appointments from 09:00 to 20:00.', 'Arrive 10 minutes early and bring comfortable clothing for after your session.', 10, TRUE);

INSERT INTO weather_context
  (location_id, fallback_condition, fallback_temperature_c, fallback_summary)
VALUES
  ('wellness-center-main', 'mild', 19.0, 'Mild weather is suitable for a calm visit. Bring a light layer after warmth-focused treatments.');
