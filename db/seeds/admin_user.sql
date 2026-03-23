-- Admin user seed
-- Password: admin123
-- Bcrypt hash generated for development use only
INSERT INTO users (id, first_name, last_name, email, password_hash, role) VALUES
  (1, 'Admin', 'User', 'admin@chocolatecrafthouse.com', '$2b$10$gBcyP7wRIebZPZI.Uy38k.ZgXMJs4/JyvlRwYIFFCVVLRmah6ZJJe', 'admin')
ON DUPLICATE KEY UPDATE
  first_name = VALUES(first_name),
  last_name = VALUES(last_name),
  email = VALUES(email),
  password_hash = VALUES(password_hash),
  role = VALUES(role);
