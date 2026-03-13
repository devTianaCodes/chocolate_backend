-- Admin user seed
-- Password: admin123
-- Bcrypt hash generated for development use only
INSERT INTO users (id, email, password_hash, role) VALUES
  (1, 'admin@chocolatecrafthouse.com', '$2b$10$Jr8R2Yb2m7Fq7w6V7jCeeOq7R5b4y2tFQ3mYxV0mQ3Qx1s2m4GxZK', 'admin');
