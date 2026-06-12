CREATE DATABASE IF NOT EXISTS wellness_package_configurator CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE wellness_package_configurator;

SET NAMES utf8mb4;

DROP TABLE IF EXISTS configuration_addons;
DROP TABLE IF EXISTS configuration_images;
DROP TABLE IF EXISTS configurations;
DROP TABLE IF EXISTS add_ons;
DROP TABLE IF EXISTS intensities;
DROP TABLE IF EXISTS durations;
DROP TABLE IF EXISTS packages;

CREATE TABLE packages (
  id INT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  goal VARCHAR(255) NOT NULL,
  description VARCHAR(500) NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  base_minutes INT NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE durations (
  id INT PRIMARY KEY,
  minutes INT NOT NULL UNIQUE,
  label VARCHAR(50) NOT NULL,
  price_delta DECIMAL(10,2) NOT NULL DEFAULT 0.00
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE intensities (
  id INT PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  label VARCHAR(80) NOT NULL,
  description VARCHAR(255) NOT NULL,
  price_delta DECIMAL(10,2) NOT NULL DEFAULT 0.00
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE add_ons (
  id INT PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(255) NOT NULL,
  price_delta DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  minio_object VARCHAR(255) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE configurations (
  id INT PRIMARY KEY,
  package_id INT NOT NULL,
  duration_id INT NOT NULL,
  intensity_id INT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uq_configuration_combination (package_id, duration_id, intensity_id),
  CONSTRAINT fk_configurations_package
    FOREIGN KEY (package_id) REFERENCES packages(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_configurations_duration
    FOREIGN KEY (duration_id) REFERENCES durations(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_configurations_intensity
    FOREIGN KEY (intensity_id) REFERENCES intensities(id)
    ON DELETE RESTRICT
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE configuration_addons (
  configuration_id INT NOT NULL,
  add_on_id INT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (configuration_id, add_on_id),
  CONSTRAINT fk_configuration_addons_configuration
    FOREIGN KEY (configuration_id) REFERENCES configurations(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_configuration_addons_add_on
    FOREIGN KEY (add_on_id) REFERENCES add_ons(id)
    ON DELETE RESTRICT
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO packages
  (id, slug, name, goal, description, base_price, base_minutes)
VALUES
  (1, 'neck-shoulder-relief', 'Neck & Shoulder Relief', 'release neck and shoulder tension', 'Focused massage package for desk fatigue, shoulder tightness, and upper back relief.', 59.00, 45),
  (2, 'stress-reset-massage', 'Stress Reset Massage', 'calm down and reset after stress', 'Relaxation-led massage package with slower rhythm and calming add-ons.', 64.00, 45),
  (3, 'warm-recovery-massage', 'Warm Recovery Massage', 'restore warmth and gentle mobility', 'Warmth-focused massage package for cold days and general body recovery.', 69.00, 45);

INSERT INTO durations
  (id, minutes, label, price_delta)
VALUES
  (1, 45, '45 min', 0.00),
  (2, 60, '60 min', 18.00),
  (3, 90, '90 min', 45.00);

INSERT INTO intensities
  (id, slug, label, description, price_delta)
VALUES
  (1, 'gentle', 'Gentle', 'Soft pressure for relaxation and comfort.', 0.00),
  (2, 'medium', 'Medium', 'Balanced pressure for common tension relief.', 6.00),
  (3, 'deep', 'Deep', 'More focused pressure for persistent muscle tightness.', 12.00);

INSERT INTO add_ons
  (id, slug, name, description, price_delta, minio_object)
VALUES
  (1, 'hot-stone', 'Hot Stone', 'Warm stones for deeper comfort and warmth.', 14.00, 'package-configurator/addons/hot-stone.png'),
  (2, 'aroma-oil', 'Aroma Oil', 'Calming aroma oil for a quiet relaxation session.', 9.00, 'package-configurator/addons/aroma-oil.png'),
  (3, 'stretching', 'Gentle Stretching', 'Short guided stretching add-on after massage.', 11.00, 'package-configurator/addons/stretching.png'),
  (4, 'warm-towel', 'Warm Towel Finish', 'Warm towel finish for a calmer end to the session.', 6.00, 'package-configurator/addons/warm-towel.png');

INSERT INTO configurations
  (id, package_id, duration_id, intensity_id, enabled)
VALUES
  (1, 1, 1, 1, TRUE),
  (2, 1, 2, 2, TRUE),
  (3, 1, 2, 3, TRUE),
  (4, 2, 1, 1, TRUE),
  (5, 2, 2, 2, TRUE),
  (6, 3, 1, 1, TRUE),
  (7, 3, 2, 2, TRUE),
  (8, 3, 3, 3, TRUE),
  (9, 2, 3, 3, FALSE);

INSERT INTO configuration_addons
  (configuration_id, add_on_id, enabled)
VALUES
  (1, 2, TRUE),
  (1, 4, TRUE),
  (2, 2, TRUE),
  (2, 3, TRUE),
  (2, 4, TRUE),
  (3, 3, TRUE),
  (3, 4, TRUE),
  (4, 2, TRUE),
  (4, 4, TRUE),
  (5, 1, TRUE),
  (5, 2, TRUE),
  (5, 4, TRUE),
  (6, 1, TRUE),
  (6, 4, TRUE),
  (7, 1, TRUE),
  (7, 3, TRUE),
  (7, 4, TRUE),
  (8, 1, TRUE),
  (8, 3, TRUE),
  (8, 4, TRUE),
  (9, 1, FALSE),
  (9, 2, FALSE);
