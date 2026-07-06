import "dotenv/config";
import bcrypt from "bcrypt";
import mysql from "mysql2/promise";

function envNumber(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function envFlag(value) {
  return ["1", "true", "yes", "required"].includes(String(value || "").toLowerCase());
}

function sslConfig() {
  if (!envFlag(process.env.DB_SSL)) {
    return undefined;
  }

  return {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false"
  };
}

function dbConfig(includeDatabase = true) {
  return {
    host: process.env.DB_HOST || "127.0.0.1",
    port: envNumber(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    ...(includeDatabase ? { database: process.env.DB_NAME } : {}),
    ...(sslConfig() ? { ssl: sslConfig() } : {})
  };
}

function schemaSql() {
  return [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(80) NOT NULL,
      last_name VARCHAR(80) NOT NULL,
      email VARCHAR(190) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(32) NOT NULL DEFAULT 'customer',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS addresses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      label VARCHAR(80) NOT NULL,
      recipient_name VARCHAR(160) NOT NULL,
      line1 VARCHAR(255) NOT NULL,
      line2 VARCHAR(255) NULL,
      city VARCHAR(120) NOT NULL,
      state VARCHAR(120) NOT NULL,
      postal_code VARCHAR(32) NOT NULL,
      country VARCHAR(120) NOT NULL,
      phone VARCHAR(32) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token_hash VARCHAR(255) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL UNIQUE,
      slug VARCHAR(120) NOT NULL UNIQUE
    )`,
    `CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      category_id INT NOT NULL,
      slug VARCHAR(160) NOT NULL UNIQUE,
      name VARCHAR(160) NOT NULL,
      description TEXT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      discount_price DECIMAL(10,2) NOT NULL DEFAULT 0,
      image TEXT NOT NULL,
      origin VARCHAR(120) NULL,
      cocoa_percentage INT NULL,
      weight_grams INT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id)
    )`,
    `CREATE TABLE IF NOT EXISTS product_images (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      url TEXT NOT NULL,
      alt_text VARCHAR(255) NULL,
      is_primary TINYINT(1) NOT NULL DEFAULT 0,
      CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS inventory (
      product_id INT PRIMARY KEY,
      quantity INT NOT NULL DEFAULT 0,
      CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS carts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL UNIQUE,
      session_id VARCHAR(255) NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_carts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS cart_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cart_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT NOT NULL,
      UNIQUE KEY uniq_cart_product (cart_id, product_id),
      CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
      CONSTRAINT fk_cart_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS shipping_methods (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      price DECIMAL(10,2) NOT NULL DEFAULT 0,
      estimated_days VARCHAR(50) NOT NULL DEFAULT '3-5 days',
      is_active TINYINT(1) NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      order_number VARCHAR(64) NOT NULL UNIQUE,
      status VARCHAR(32) NOT NULL,
      subtotal DECIMAL(10,2) NOT NULL,
      discount_total DECIMAL(10,2) NOT NULL DEFAULT 0,
      shipping_total DECIMAL(10,2) NOT NULL DEFAULT 0,
      total DECIMAL(10,2) NOT NULL,
      shipping_address JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      name VARCHAR(160) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      quantity INT NOT NULL,
      image TEXT NOT NULL,
      CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id)
    )`,
    `CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL UNIQUE,
      provider VARCHAR(32) NOT NULL,
      provider_payment_id VARCHAR(255) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      currency VARCHAR(8) NOT NULL DEFAULT 'USD',
      status VARCHAR(32) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    )`
  ];
}

async function ensureDatabase() {
  const bootstrap = await mysql.createConnection(dbConfig(false));
  await bootstrap.query(
    `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await bootstrap.end();
}

async function applySchema(connection) {
  for (const statement of schemaSql()) {
    await connection.query(statement);
  }
}

async function ensureShippingColumns(connection) {
  const [rows] = await connection.query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'shipping_methods' AND COLUMN_NAME = 'estimated_days'`,
    [process.env.DB_NAME]
  );

  if (!rows.length) {
    await connection.query(
      "ALTER TABLE shipping_methods ADD COLUMN estimated_days VARCHAR(50) NOT NULL DEFAULT '3-5 days' AFTER price"
    );
  }
}

async function upsertCategory(connection, category) {
  await connection.query(
    `INSERT INTO categories (name, slug)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), slug = VALUES(slug)`,
    [category.name, category.slug]
  );

  const [[row]] = await connection.query(
    "SELECT id FROM categories WHERE slug = ? LIMIT 1",
    [category.slug]
  );

  return row.id;
}

async function upsertUser(connection, user) {
  const passwordHash = await bcrypt.hash(user.password, 10);

  await connection.query(
    `INSERT INTO users (first_name, last_name, email, password_hash, role)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       first_name = VALUES(first_name),
       last_name = VALUES(last_name),
       password_hash = VALUES(password_hash),
       role = VALUES(role)`,
    [user.firstName, user.lastName, user.email, passwordHash, user.role]
  );

  const [[row]] = await connection.query(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [user.email]
  );

  await connection.query("DELETE FROM addresses WHERE user_id = ?", [row.id]);
  await connection.query(
    `INSERT INTO addresses (user_id, label, recipient_name, line1, line2, city, state, postal_code, country, phone)
     VALUES (?, 'Default', ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      `${user.firstName} ${user.lastName}`,
      user.address.line1,
      user.address.line2,
      user.address.city,
      user.address.state,
      user.address.postalCode,
      user.address.country,
      user.phone
    ]
  );

  return row.id;
}

async function upsertProduct(connection, product, categoryId) {
  await connection.query(
    `INSERT INTO products (
      category_id, slug, name, description, price, discount_price, image,
      origin, cocoa_percentage, weight_grams, is_active
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    ON DUPLICATE KEY UPDATE
      category_id = VALUES(category_id),
      name = VALUES(name),
      description = VALUES(description),
      price = VALUES(price),
      discount_price = VALUES(discount_price),
      image = VALUES(image),
      origin = VALUES(origin),
      cocoa_percentage = VALUES(cocoa_percentage),
      weight_grams = VALUES(weight_grams),
      is_active = VALUES(is_active)`,
    [
      categoryId,
      product.slug,
      product.name,
      product.description,
      product.price,
      product.discountPrice,
      product.image,
      product.origin,
      product.cocoa,
      product.weight
    ]
  );

  const [[row]] = await connection.query(
    "SELECT id FROM products WHERE slug = ? LIMIT 1",
    [product.slug]
  );

  await connection.query("DELETE FROM product_images WHERE product_id = ?", [row.id]);
  await connection.query(
    `INSERT INTO product_images (product_id, url, alt_text, is_primary)
     VALUES (?, ?, ?, 0), (?, ?, ?, 0)`,
    [
      row.id,
      product.gallery[0],
      `${product.name} detail`,
      row.id,
      product.gallery[1],
      `${product.name} close-up`
    ]
  );

  await connection.query(
    `INSERT INTO inventory (product_id, quantity)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)`,
    [row.id, product.stock]
  );

  return row.id;
}

async function upsertShipping(connection) {
  await connection.query(
    `INSERT INTO shipping_methods (id, name, price, estimated_days, is_active)
     VALUES (1, 'Demo standard', 6.50, '3-5 days', 1)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       price = VALUES(price),
       estimated_days = VALUES(estimated_days),
       is_active = VALUES(is_active)`
  );
}

async function upsertDemoOrder(connection, customerId, products) {
  const [[existing]] = await connection.query(
    "SELECT id FROM orders WHERE order_number = 'DEMO-1001' LIMIT 1"
  );

  const shippingAddress = JSON.stringify({
    line1: "12 Cocoa Lane",
    city: "Turin",
    country: "Italy"
  });

  let orderId = existing?.id || null;
  if (!orderId) {
    const [result] = await connection.query(
      `INSERT INTO orders (
        user_id, order_number, status, subtotal, discount_total, shipping_total, total, shipping_address
      )
      VALUES (?, 'DEMO-1001', 'paid', 30.50, 0.00, 6.50, 37.00, ?)`,
      [customerId, shippingAddress]
    );
    orderId = result.insertId;
  } else {
    await connection.query(
      `UPDATE orders
       SET user_id = ?, status = 'paid', subtotal = 30.50, discount_total = 0.00,
           shipping_total = 6.50, total = 37.00, shipping_address = ?
       WHERE id = ?`,
      [customerId, shippingAddress, orderId]
    );
  }

  await connection.query("DELETE FROM order_items WHERE order_id = ?", [orderId]);
  await connection.query(
    `INSERT INTO order_items (order_id, product_id, name, price, quantity, image)
     VALUES (?, ?, ?, 12.50, 1, ?), (?, ?, ?, 18.00, 1, ?)`,
    [
      orderId,
      products["midnight-velvet"],
      "Midnight Velvet",
      productCatalog["midnight-velvet"].image,
      orderId,
      products["hazelnut-praline-cloud"],
      "Hazelnut Praline Cloud",
      productCatalog["hazelnut-praline-cloud"].image
    ]
  );

  await connection.query(
    `INSERT INTO payments (order_id, provider, provider_payment_id, amount, currency, status)
     VALUES (?, 'stripe', 'pi_demo_1001', 37.00, 'USD', 'succeeded')
     ON DUPLICATE KEY UPDATE
       provider = VALUES(provider),
       provider_payment_id = VALUES(provider_payment_id),
       amount = VALUES(amount),
       currency = VALUES(currency),
       status = VALUES(status)`,
    [orderId]
  );
}

const categoryCatalog = [
  { name: "Dark Collection", slug: "dark" },
  { name: "Milk Collection", slug: "milk" },
  { name: "Pralines", slug: "pralines" },
  { name: "Gift Sets", slug: "gift-sets" }
];

const productCatalog = {
  "midnight-velvet": {
    category: "dark",
    slug: "midnight-velvet",
    name: "Midnight Velvet",
    description: "72% dark chocolate bar with cherry notes and a satin finish.",
    price: "12.50",
    discountPrice: "10.50",
    image: "/product-images/velvety-dark-chocolate-main.png",
    gallery: [
      "/product-images/velvety-dark-chocolate-detail.png",
      "/product-images/midnight-sugar-free-main.png"
    ],
    origin: "Ecuador",
    cocoa: 72,
    weight: 95,
    stock: 18
  },
  "atlas-cocoa-journey": {
    category: "dark",
    slug: "atlas-cocoa-journey",
    name: "Atlas Cocoa Journey",
    description: "Single-origin tasting squares layered with citrus, walnut, and roasted cacao.",
    price: "16.00",
    discountPrice: "0.00",
    image: "/product-images/amber-single-origin-main.png",
    gallery: [
      "/product-images/amber-single-origin-detail.png",
      "/product-images/artisan-chocolate-bars-main.png"
    ],
    origin: "Peru",
    cocoa: 78,
    weight: 120,
    stock: 12
  },
  "amber-silk": {
    category: "milk",
    slug: "amber-silk",
    name: "Amber Silk",
    description: "Caramel-toned milk chocolate with malted cream and brown-butter depth.",
    price: "11.00",
    discountPrice: "9.00",
    image: "/product-images/roasted-milk-chocolate-main-v2.png",
    gallery: [
      "/product-images/roasted-milk-chocolate-detail-v2.png",
      "/product-images/silk-smooth-drinking-chocolate-main.png"
    ],
    origin: "Ghana",
    cocoa: 48,
    weight: 110,
    stock: 24
  },
  "toasted-vanilla-milk": {
    category: "milk",
    slug: "toasted-vanilla-milk",
    name: "Toasted Vanilla Milk",
    description: "Madagascar vanilla folded through creamy couverture with biscuit warmth.",
    price: "13.50",
    discountPrice: "0.00",
    image: "/product-images/roasted-milk-chocolate-main.png",
    gallery: [
      "/product-images/roasted-milk-chocolate-detail.png",
      "/product-images/hand-tempered-white-chocolate-main.png"
    ],
    origin: "Dominican Republic",
    cocoa: 42,
    weight: 105,
    stock: 15
  },
  "hazelnut-praline-cloud": {
    category: "pralines",
    slug: "hazelnut-praline-cloud",
    name: "Hazelnut Praline Cloud",
    description: "Silky gianduja pralines with Piedmont hazelnuts and feather-light crunch.",
    price: "18.00",
    discountPrice: "16.00",
    image: "/product-images/stone-ground-filled-and-pralines-main.png",
    gallery: [
      "/product-images/stone-ground-filled-and-pralines-detail.png",
      "/product-images/estate-spreads-and-creams-main.png"
    ],
    origin: "Italy",
    cocoa: 56,
    weight: 140,
    stock: 20
  },
  "pistachio-atelier-box": {
    category: "pralines",
    slug: "pistachio-atelier-box",
    name: "Pistachio Atelier Box",
    description: "Hand-finished pistachio pralines with sea salt, white chocolate, and crisp shells.",
    price: "21.00",
    discountPrice: "0.00",
    image: "/product-images/estate-spreads-and-creams-detail.png",
    gallery: [
      "/product-images/estate-spreads-and-creams-main.png",
      "/product-images/stone-ground-filled-and-pralines-main.png"
    ],
    origin: "Sicily",
    cocoa: 38,
    weight: 160,
    stock: 14
  },
  "atelier-gift-cabinet": {
    category: "gift-sets",
    slug: "atelier-gift-cabinet",
    name: "Atelier Gift Cabinet",
    description: "Signature drawer box with bars, pralines, and tasting cards for premium gifting.",
    price: "34.00",
    discountPrice: "29.00",
    image: "/product-images/golden-gift-boxes-main.png",
    gallery: [
      "/product-images/golden-gift-boxes-detail.png",
      "/product-images/luxe-seasonal-and-limited-edition-main.png"
    ],
    origin: "House Blend",
    cocoa: 64,
    weight: 320,
    stock: 9
  },
  "seasonal-tasting-ribbon": {
    category: "gift-sets",
    slug: "seasonal-tasting-ribbon",
    name: "Seasonal Tasting Ribbon",
    description: "Meeting-ready showcase box curated to present four seasonal flavors in sequence.",
    price: "28.00",
    discountPrice: "24.00",
    image: "/product-images/luxe-seasonal-and-limited-edition-detail.png",
    gallery: [
      "/product-images/luxe-seasonal-and-limited-edition-main.png",
      "/product-images/golden-gift-boxes-main.png"
    ],
    origin: "House Blend",
    cocoa: 58,
    weight: 250,
    stock: 11
  }
};

const userCatalog = [
  {
    firstName: "Admin",
    lastName: "Atelier",
    email: "admin@chocolate.local",
    password: "Admin1234",
    role: "admin",
    phone: "+39 011 555 0001",
    address: {
      line1: "1 Atelier Square",
      line2: null,
      city: "Turin",
      state: "Piedmont",
      postalCode: "10121",
      country: "Italy"
    }
  },
  {
    firstName: "Customer",
    lastName: "Showcase",
    email: "customer@chocolate.local",
    password: "Customer1234",
    role: "customer",
    phone: "+39 011 555 0002",
    address: {
      line1: "12 Cocoa Lane",
      line2: "Unit 4",
      city: "Turin",
      state: "Piedmont",
      postalCode: "10122",
      country: "Italy"
    }
  }
];

async function seed() {
  if (!process.env.DB_NAME) {
    throw new Error("DB_NAME missing from .env");
  }

  await ensureDatabase();
  const connection = await mysql.createConnection(dbConfig());

  try {
    await applySchema(connection);
    await ensureShippingColumns(connection);
    await upsertShipping(connection);

    const categories = {};
    for (const category of categoryCatalog) {
      categories[category.slug] = await upsertCategory(connection, category);
    }

    const users = {};
    for (const user of userCatalog) {
      users[user.role] = await upsertUser(connection, user);
    }

    const products = {};
    for (const product of Object.values(productCatalog)) {
      products[product.slug] = await upsertProduct(
        connection,
        product,
        categories[product.category]
      );
    }

    await upsertDemoOrder(connection, users.customer, products);

    console.log(`Chocolate demo data ready in ${process.env.DB_NAME}`);
    console.log("admin@chocolate.local / Admin1234");
    console.log("customer@chocolate.local / Customer1234");
  } finally {
    await connection.end();
  }
}

await seed();
