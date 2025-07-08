const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Debug logging for Railway
console.log('🚀 Starting SippSearcher...');
console.log(`📍 PORT: ${PORT}`);
console.log(`🔑 DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
console.log(`🗺️  GOOGLE_MAPS_API_KEY: ${process.env.GOOGLE_MAPS_API_KEY ? 'SET' : 'NOT SET'}`);
console.log(`📂 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const isProduction = process.env.NODE_ENV === 'production';
const hasDatabaseUrl = !!process.env.DATABASE_URL;

let db, isPostgres = false, isInMemory = false;

// Memory storage for in-memory mode
const memoryStorage = {
  stores: [],
  inventory: [],
  verifications: [],
  guestbook: [],
  visitors: { count: 1337 },
  nextId: { stores: 1, inventory: 1, verifications: 1, guestbook: 1 }
};

if (isProduction) {
  if (!hasDatabaseUrl) {
    console.error('❌ FATAL: DATABASE_URL is required in production! Set up a PostgreSQL database and reference its DATABASE_URL in your Railway service.');
    process.exit(1);
  }
  // Production: use PostgreSQL only
  const { Pool } = require('pg');
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  isPostgres = true;
  console.log('🐘 Using PostgreSQL for Railway deployment');
} else {
  // Local: try SQLite, fallback to in-memory
  try {
    const Database = require('better-sqlite3');
    db = new Database('sippsearcher.db');
    isPostgres = false;
    isInMemory = false;
    console.log('🗄️  Using SQLite for local development');
  } catch (err) {
    console.log('⚠️  better-sqlite3 not available, using in-memory storage');
    isPostgres = false;
    isInMemory = true;
    db = null;
  }
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

    // Add visitor counter table
    await db.query(`
      CREATE TABLE IF NOT EXISTS visitors (
        id SERIAL PRIMARY KEY,
        count INTEGER DEFAULT 1337
      )
    `);

    // Add guestbook table
    await db.query(`
      CREATE TABLE IF NOT EXISTS guestbook (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Initialize visitor count if not exists
    await db.query(`INSERT INTO visitors (count) SELECT 1337 WHERE NOT EXISTS (SELECT 1 FROM visitors)`);

  } else if (!isInMemory) {
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

    // Add visitor counter table
    db.exec(`
      CREATE TABLE IF NOT EXISTS visitors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        count INTEGER DEFAULT 1337
      )
    `);

    // Add guestbook table
    db.exec(`
      CREATE TABLE IF NOT EXISTS guestbook (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Initialize visitor count if not exists
    db.exec(`INSERT OR IGNORE INTO visitors (id, count) VALUES (1, 1337)`);
  }
  // In-memory storage doesn't need table creation
}

// Initialize database if not using in-memory storage
if (!isInMemory) {
  initializeDatabase().catch(console.error);
} else {
  // Add sample data to in-memory storage
  memoryStorage.stores = [
    { id: 1, name: "7-Eleven", address: "123 Main St, Anytown, USA", latitude: 40.7128, longitude: -74.0060, phone: "(555) 123-4567", created_at: new Date().toISOString() },
    { id: 2, name: "Circle K", address: "456 Oak Ave, Somewhere, USA", latitude: 40.7580, longitude: -73.9855, phone: "(555) 987-6543", created_at: new Date().toISOString() },
    { id: 3, name: "Wawa", address: "789 Pine Rd, Elsewhere, USA", latitude: 40.7282, longitude: -74.0776, phone: "(555) 456-7890", created_at: new Date().toISOString() }
  ];
  
  memoryStorage.inventory = [
    { id: 1, store_id: 1, drink_id: "monster-original", size: "16oz", price: 2.99, in_stock: true, updated_by: "Store Manager", photo_path: null, last_updated: new Date().toISOString() },
    { id: 2, store_id: 1, drink_id: "monster-ultra-zero", size: "16oz", price: 2.99, in_stock: true, updated_by: "Store Manager", photo_path: null, last_updated: new Date().toISOString() },
    { id: 3, store_id: 2, drink_id: "monster-original", size: "16oz", price: 2.89, in_stock: true, updated_by: "Assistant Manager", photo_path: null, last_updated: new Date().toISOString() },
    { id: 4, store_id: 3, drink_id: "monster-ultra-red", size: "16oz", price: 3.09, in_stock: false, updated_by: "Energy Enthusiast", photo_path: null, last_updated: new Date().toISOString() }
  ];
  
  memoryStorage.nextId = { stores: 4, inventory: 5, verifications: 1, guestbook: 1 };
}

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
  if (isInMemory) {
    return [...memoryStorage.stores];
  } else if (isPostgres) {
    const result = await db.query('SELECT * FROM stores ORDER BY name');
    return result.rows;
  } else {
    return db.prepare('SELECT * FROM stores ORDER BY name').all();
  }
}

async function getStoresNear(lat, lng, radius) {
  if (isInMemory) {
    return memoryStorage.stores.filter(store => {
      const distance = calculateDistance(lat, lng, store.latitude, store.longitude);
      return distance < radius;
    }).map(store => ({
      ...store,
      distance: calculateDistance(lat, lng, store.latitude, store.longitude)
    })).sort((a, b) => a.distance - b.distance);
  }
  
  if (isPostgres) {
    // Fixed PostgreSQL query with proper parameter handling
    const result = await db.query(`
      SELECT *, 
      (6371 * acos(cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2)) + sin(radians($1)) * sin(radians(latitude)))) AS distance
      FROM stores
      WHERE (6371 * acos(cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2)) + sin(radians($1)) * sin(radians(latitude)))) < $3
      ORDER BY distance
    `, [lat, lng, radius]);
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
  if (isInMemory) {
    const store = {
      id: memoryStorage.nextId.stores++,
      name,
      address,
      latitude,
      longitude,
      phone,
      created_at: new Date().toISOString()
    };
    memoryStorage.stores.push(store);
    return store.id;
  } else if (isPostgres) {
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
  if (isInMemory) {
    return memoryStorage.inventory
      .filter(item => item.store_id == storeId)
      .map(item => ({
        ...item,
        verification_count: memoryStorage.verifications.filter(v => v.inventory_id === item.id).length
      }));
  } else if (isPostgres) {
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
  if (isInMemory) {
    // Remove existing entry for same store/drink/size
    memoryStorage.inventory = memoryStorage.inventory.filter(item => 
      !(item.store_id == store_id && item.drink_id === drink_id && item.size === size)
    );
    
    const inventory = {
      id: memoryStorage.nextId.inventory++,
      store_id,
      drink_id,
      size,
      price,
      in_stock,
      updated_by,
      photo_path,
      last_updated: new Date().toISOString()
    };
    memoryStorage.inventory.push(inventory);
    return inventory.id;
  } else if (isPostgres) {
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
  if (isInMemory) {
    const verification = {
      id: memoryStorage.nextId.verifications++,
      inventory_id,
      user_ip,
      verified_at: new Date().toISOString()
    };
    memoryStorage.verifications.push(verification);
  } else if (isPostgres) {
    await db.query('INSERT INTO verifications (inventory_id, user_ip) VALUES ($1, $2)', [inventory_id, user_ip]);
  } else {
    db.prepare('INSERT INTO verifications (inventory_id, user_ip) VALUES (?, ?)').run(inventory_id, user_ip);
  }
}

// Visitor counter functions
async function incrementVisitorCount() {
  if (isInMemory) {
    memoryStorage.visitors.count++;
    return memoryStorage.visitors.count;
  } else if (isPostgres) {
    const result = await db.query('UPDATE visitors SET count = count + 1 WHERE id = 1 RETURNING count');
    return result.rows[0]?.count || 1337;
  } else {
    const result = db.prepare('UPDATE visitors SET count = count + 1 WHERE id = 1').run();
    const count = db.prepare('SELECT count FROM visitors WHERE id = 1').get();
    return count?.count || 1337;
  }
}

async function getVisitorCount() {
  if (isInMemory) {
    return memoryStorage.visitors.count;
  } else if (isPostgres) {
    const result = await db.query('SELECT count FROM visitors WHERE id = 1');
    return result.rows[0]?.count || 1337;
  } else {
    const result = db.prepare('SELECT count FROM visitors WHERE id = 1').get();
    return result?.count || 1337;
  }
}

// Guestbook functions
async function getGuestbookEntries() {
  if (isInMemory) {
    return [...memoryStorage.guestbook].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } else if (isPostgres) {
    const result = await db.query('SELECT * FROM guestbook ORDER BY created_at DESC');
    return result.rows;
  } else {
    return db.prepare('SELECT * FROM guestbook ORDER BY created_at DESC').all();
  }
}

async function addGuestbookEntry(name, message) {
  if (isInMemory) {
    const entry = {
      id: memoryStorage.nextId.guestbook++,
      name,
      message,
      created_at: new Date().toISOString()
    };
    memoryStorage.guestbook.push(entry);
    return entry.id;
  } else if (isPostgres) {
    const result = await db.query(
      'INSERT INTO guestbook (name, message) VALUES ($1, $2) RETURNING id',
      [name, message]
    );
    return result.rows[0].id;
  } else {
    const result = db.prepare('INSERT INTO guestbook (name, message) VALUES (?, ?)').run(name, message);
    return result.lastInsertRowid;
  }
}

// Helper function for distance calculation (in-memory storage)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Routes
app.get('/', async (req, res) => {
  // Increment visitor count on page load
  await incrementVisitorCount();
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
    const stores = await getStoresNear(parseFloat(lat), parseFloat(lng), parseFloat(radius));
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

// Visitor counter endpoints
app.get('/api/visitors', async (req, res) => {
  try {
    const count = await getVisitorCount();
    res.json({ count });
  } catch (err) {
    console.error('Error getting visitor count:', err);
    res.status(500).json({ error: err.message });
  }
});

// Guestbook endpoints
app.get('/api/guestbook', async (req, res) => {
  try {
    const entries = await getGuestbookEntries();
    res.json(entries);
  } catch (err) {
    console.error('Error getting guestbook entries:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/guestbook', async (req, res) => {
  const { name, message } = req.body;
  
  if (!name || !message) {
    return res.status(400).json({ error: 'Name and message are required' });
  }
  
  try {
    const id = await addGuestbookEntry(name, message);
    res.json({ id });
  } catch (err) {
    console.error('Error adding guestbook entry:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get configuration (for API keys, etc.)
app.get('/api/config', (req, res) => {
  res.json({
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || ''
  });
});

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: isPostgres ? 'PostgreSQL' : (isInMemory ? 'In-Memory' : 'SQLite'),
    stores: isInMemory ? memoryStorage.stores.length : 'N/A'
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🥤 SippSearcher server running on port ${PORT}`);
  console.log(`🌐 Server accessible at http://0.0.0.0:${PORT}`);
  
  if (isPostgres) {
    console.log('🐘 Connected to PostgreSQL database');
  } else if (isInMemory) {
    console.log('⚠️  Using in-memory storage - data will be lost on restart');
    console.log('💡 For Railway: Add PostgreSQL database in dashboard');
  } else {
    console.log('🗄️  Using SQLite database');
  }
});

// Handle server errors
server.on('error', (err) => {
  console.error('❌ Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  server.close(() => {
    console.log('Process terminated');
  });
}); 