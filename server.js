const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Database setup - use PostgreSQL on Railway, SQLite locally
let db;
let isPostgres = false;

if (process.env.DATABASE_URL) {
  // Railway deployment - use PostgreSQL
  const { Pool } = require('pg');
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  isPostgres = true;
  console.log('🐘 Using PostgreSQL for Railway deployment');
} else {
  // Local development - use SQLite
  const Database = require('better-sqlite3');
  db = new Database('sippsearcher.db');
  isPostgres = false;
  console.log('🗄️  Using SQLite for local development');
}

// Initialize database tables
async function initializeDatabase() {
  if (isPostgres) {
    // PostgreSQL table creation
    await db.query(`
      CREATE TABLE IF NOT EXISTS stores (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        phone VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        store_id INTEGER NOT NULL,
        drink_id VARCHAR(100) NOT NULL,
        size VARCHAR(20) NOT NULL,
        price REAL,
        in_stock BOOLEAN DEFAULT TRUE,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(100),
        photo_path VARCHAR(255),
        UNIQUE(store_id, drink_id, size),
        FOREIGN KEY (store_id) REFERENCES stores (id)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS verifications (
        id SERIAL PRIMARY KEY,
        inventory_id INTEGER NOT NULL,
        user_ip VARCHAR(45),
        verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (inventory_id) REFERENCES inventory (id)
      )
    `);
  } else {
    // SQLite table creation
    db.exec(`
      CREATE TABLE IF NOT EXISTS stores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        store_id INTEGER NOT NULL,
        drink_id TEXT NOT NULL,
        size TEXT NOT NULL,
        price REAL,
        in_stock BOOLEAN DEFAULT 1,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT,
        photo_path TEXT,
        FOREIGN KEY (store_id) REFERENCES stores (id)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS verifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inventory_id INTEGER NOT NULL,
        user_ip TEXT,
        verified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (inventory_id) REFERENCES inventory (id)
      )
    `);
  }
}

// Call initialize function
initializeDatabase().catch(console.error);

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './public/uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Load Monster flavors
const monsterFlavors = JSON.parse(fs.readFileSync('./data/monster-flavors.json', 'utf8'));

// Database helper functions
async function getAllStores() {
  if (isPostgres) {
    const result = await db.query('SELECT * FROM stores ORDER BY name');
    return result.rows;
  } else {
    return db.prepare('SELECT * FROM stores ORDER BY name').all();
  }
}

async function getStoresNear(lat, lng, radius) {
  const query = `
    SELECT *, 
    (6371 * acos(cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2)) + sin(radians($3)) * sin(radians(latitude)))) AS distance
    FROM stores
    WHERE (6371 * acos(cos(radians($4)) * cos(radians(latitude)) * cos(radians(longitude) - radians($5)) + sin(radians($6)) * sin(radians(latitude)))) < $7
    ORDER BY distance
  `;
  
  if (isPostgres) {
    const result = await db.query(query, [lat, lng, lat, lat, lng, lat, radius]);
    return result.rows;
  } else {
    return db.prepare(`
      SELECT *, 
      (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude)))) AS distance
      FROM stores
      WHERE (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude)))) < ?
      ORDER BY distance
    `).all(lat, lng, lat, lat, lng, lat, radius);
  }
}

async function insertStore(name, address, latitude, longitude, phone) {
  if (isPostgres) {
    const result = await db.query(
      'INSERT INTO stores (name, address, latitude, longitude, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [name, address, latitude, longitude, phone]
    );
    return result.rows[0].id;
  } else {
    const result = db.prepare('INSERT INTO stores (name, address, latitude, longitude, phone) VALUES (?, ?, ?, ?, ?)').run(name, address, latitude, longitude, phone);
    return result.lastInsertRowid;
  }
}

async function getStoreInventory(storeId) {
  if (isPostgres) {
    const result = await db.query(`
      SELECT i.*, 
             (SELECT COUNT(*) FROM verifications WHERE inventory_id = i.id) as verification_count
      FROM inventory i 
      WHERE store_id = $1 
      ORDER BY last_updated DESC
    `, [storeId]);
    return result.rows;
  } else {
    return db.prepare(`
      SELECT i.*, 
             (SELECT COUNT(*) FROM verifications WHERE inventory_id = i.id) as verification_count
      FROM inventory i 
      WHERE store_id = ? 
      ORDER BY last_updated DESC
    `).all(storeId);
  }
}

async function insertInventory(store_id, drink_id, size, price, in_stock, updated_by, photo_path) {
  if (isPostgres) {
    const result = await db.query(`
      INSERT INTO inventory (store_id, drink_id, size, price, in_stock, updated_by, photo_path) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      ON CONFLICT (store_id, drink_id, size) 
      DO UPDATE SET price = $4, in_stock = $5, updated_by = $6, photo_path = $7, last_updated = CURRENT_TIMESTAMP
      RETURNING id
    `, [store_id, drink_id, size, price, in_stock, updated_by, photo_path]);
    return result.rows[0].id;
  } else {
    const result = db.prepare(`
      INSERT OR REPLACE INTO inventory 
      (store_id, drink_id, size, price, in_stock, last_updated, updated_by, photo_path) 
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
    `).run(store_id, drink_id, size, price, in_stock, updated_by, photo_path);
    return result.lastInsertRowid;
  }
}

async function insertVerification(inventory_id, user_ip) {
  if (isPostgres) {
    await db.query('INSERT INTO verifications (inventory_id, user_ip) VALUES ($1, $2)', [inventory_id, user_ip]);
  } else {
    db.prepare('INSERT INTO verifications (inventory_id, user_ip) VALUES (?, ?)').run(inventory_id, user_ip);
  }
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get all stores
app.get('/api/stores', async (req, res) => {
  try {
    const stores = await getAllStores();
    res.json(stores);
  } catch (err) {
    console.error('Error getting stores:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get stores near location
app.get('/api/stores/near/:lat/:lng/:radius', async (req, res) => {
  const { lat, lng, radius } = req.params;
  
  try {
    const stores = await getStoresNear(lat, lng, radius);
    res.json(stores);
  } catch (err) {
    console.error('Error getting nearby stores:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add a new store
app.post('/api/stores', async (req, res) => {
  const { name, address, latitude, longitude, phone } = req.body;
  
  try {
    const id = await insertStore(name, address, latitude, longitude, phone);
    res.json({ id });
  } catch (err) {
    console.error('Error adding store:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get inventory for a store
app.get('/api/stores/:id/inventory', async (req, res) => {
  const storeId = req.params.id;
  
  try {
    const inventory = await getStoreInventory(storeId);
    res.json(inventory);
  } catch (err) {
    console.error('Error getting inventory:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update inventory
app.post('/api/inventory', upload.single('photo'), async (req, res) => {
  const { store_id, drink_id, size, price, in_stock, updated_by } = req.body;
  const photo_path = req.file ? `/uploads/${req.file.filename}` : null;
  
  try {
    const id = await insertInventory(store_id, drink_id, size, price, in_stock, updated_by, photo_path);
    res.json({ id });
  } catch (err) {
    console.error('Error updating inventory:', err);
    res.status(500).json({ error: err.message });
  }
});

// Verify inventory
app.post('/api/inventory/:id/verify', async (req, res) => {
  const inventoryId = req.params.id;
  const userIp = req.ip;
  
  try {
    await insertVerification(inventoryId, userIp);
    res.json({ success: true });
  } catch (err) {
    console.error('Error verifying inventory:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get Monster flavors
app.get('/api/flavors', (req, res) => {
  res.json(monsterFlavors);
});

// Get configuration (for API keys, etc.)
app.get('/api/config', (req, res) => {
  res.json({
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || ''
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🥤 SippSearcher server running on port ${PORT}`);
  console.log(`🌐 Open http://localhost:${PORT} to start searching!`);
}); 