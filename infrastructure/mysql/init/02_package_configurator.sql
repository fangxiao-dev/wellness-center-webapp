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
  price_delta DECIMAL(10,2) NOT NULL DEFAULT 0.00
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE configurations (
  id INT PRIMARY KEY,
  package_id INT NOT NULL,
  duration_id INT NOT NULL,
  intensity_id INT NOT NULL,
  summary VARCHAR(500) NOT NULL,
  FOREIGN KEY (package_id) REFERENCES packages(id),
  FOREIGN KEY (duration_id) REFERENCES durations(id),
  FOREIGN KEY (intensity_id) REFERENCES intensities(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE configuration_addons (
  configuration_id INT NOT NULL,
  addon_id INT NOT NULL,
  PRIMARY KEY (configuration_id, addon_id),
  FOREIGN KEY (configuration_id) REFERENCES configurations(id),
  FOREIGN KEY (addon_id) REFERENCES add_ons(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE configuration_images (
  id INT PRIMARY KEY AUTO_INCREMENT,
  configuration_id INT NOT NULL,
  image_key VARCHAR(255) NOT NULL,
  alt_text VARCHAR(255) NOT NULL,
  FOREIGN KEY (configuration_id) REFERENCES configurations(id)
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
  (id, slug, name, description, price_delta)
VALUES
  (1, 'hot-stone', 'Hot Stone', 'Warm stones for deeper comfort and warmth.', 14.00),
  (2, 'aroma-oil', 'Aroma Oil', 'Calming aroma oil for a quiet relaxation session.', 9.00),
  (3, 'stretching', 'Gentle Stretching', 'Short guided stretching add-on after massage.', 11.00),
  (4, 'warm-towel', 'Warm Towel Finish', 'Warm towel finish for a calmer end to the session.', 6.00);

INSERT INTO configurations
  (id, package_id, duration_id, intensity_id, summary)
VALUES
  (1, 1, 1, 2, 'Focused upper-body relief for a short visit.'),
  (2, 1, 2, 2, 'Balanced neck and shoulder relief with enough time for focused work.'),
  (3, 1, 2, 3, 'Deeper neck and shoulder session for persistent tightness.'),
  (4, 2, 1, 1, 'Gentle stress reset for a compact after-work visit.'),
  (5, 2, 2, 1, 'Longer calming massage with relaxation-led pacing.'),
  (6, 2, 3, 2, 'Extended stress reset with balanced pressure.'),
  (7, 3, 1, 1, 'Warm recovery session for a simple comfort visit.'),
  (8, 3, 2, 2, 'Warm recovery with balanced pressure and deeper comfort.'),
  (9, 3, 3, 2, 'Extended warm recovery journey for slow full-body relief.');

INSERT INTO configuration_addons
  (configuration_id, addon_id)
VALUES
  (2, 2),
  (3, 1),
  (5, 2),
  (6, 2),
  (8, 1),
  (9, 1),
  (9, 3);

INSERT INTO configuration_images
  (configuration_id, image_key, alt_text)
VALUES
  (1, 'package-configurator/neck-shoulder-relief.svg', 'Neck and shoulder relief massage package'),
  (2, 'package-configurator/neck-shoulder-relief.svg', 'Neck and shoulder relief massage package'),
  (3, 'package-configurator/neck-shoulder-relief.svg', 'Neck and shoulder relief massage package'),
  (4, 'package-configurator/stress-reset-massage.svg', 'Stress reset massage package'),
  (5, 'package-configurator/stress-reset-massage.svg', 'Stress reset massage package'),
  (6, 'package-configurator/stress-reset-massage.svg', 'Stress reset massage package'),
  (7, 'package-configurator/warm-recovery-massage.svg', 'Warm recovery massage package'),
  (8, 'package-configurator/warm-recovery-massage.svg', 'Warm recovery massage package'),
  (9, 'package-configurator/warm-recovery-massage.svg', 'Warm recovery massage package');
