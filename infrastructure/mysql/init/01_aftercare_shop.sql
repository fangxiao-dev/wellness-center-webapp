CREATE DATABASE IF NOT EXISTS wellness_aftercare_shop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE wellness_aftercare_shop;

SET NAMES utf8mb4;

DROP TABLE IF EXISTS products;

CREATE TABLE products (
  id INT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(120) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description VARCHAR(500) NOT NULL,
  usage_note VARCHAR(255),
  minio_object VARCHAR(255) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO products
  (id, slug, name, category, price, description, usage_note, minio_object)
VALUES
  (1, 'heated-neck-wrap', 'Heated Neck Wrap', 'heat-care', 34.90, 'Reusable warm wrap for shoulder and neck relaxation after a massage session.', 'Use at home for short warmth intervals.', 'aftercare-shop/heated-neck-wrap.png'),
  (2, 'lavender-aroma-oil', 'Lavender Aroma Oil', 'aroma', 18.50, 'A light aroma oil for calming evening routines and relaxation rituals.', 'External use only.', 'aftercare-shop/lavender-aroma-oil.png'),
  (3, 'recovery-massage-ball', 'Recovery Massage Ball', 'mobility', 12.90, 'Compact massage ball for gentle self-massage of shoulders, feet, and back.', 'Avoid direct pressure on injured areas.', 'aftercare-shop/recovery-massage-ball.png'),
  (4, 'ergonomic-neck-pillow', 'Ergonomic Neck Pillow', 'comfort', 42.00, 'Supportive pillow for rest after neck and shoulder relief sessions.', 'Choose a comfortable sleeping position.', 'aftercare-shop/ergonomic-neck-pillow.png'),
  (5, 'herbal-warmth-pack', 'Herbal Warmth Pack', 'heat-care', 26.90, 'Herbal pack designed for cozy warmth and quiet recovery moments.', 'Warm according to product instructions.', 'aftercare-shop/herbal-warmth-pack.png'),
  (6, 'stretching-band', 'Gentle Stretching Band', 'mobility', 15.90, 'Soft resistance band for guided mobility exercises after a center visit.', 'Use only with comfortable movements.', 'aftercare-shop/stretching-band.png');
