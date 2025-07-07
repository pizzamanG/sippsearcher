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

// Database setup - use PostgreSQL on Railway, SQLite locally, or in-memory as fallback
let db;
let isPostgres = false;
let isInMemory = false;

// In-memory storage fallback
let memoryStorage = {
  stores: [],
  inventory: [],
  verifications: [],
  nextId: {
    stores: 1,
    inventory: 1,
    verifications: 1
  }
};

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
  // Local development - try SQLite, fallback to in-memory
  try {
    const Database = require('better-sqlite3');
    db = new Database('sippsearcher.db');
    isPostgres = false;
    isInMemory = false;
    console.log('🗄️  Using SQLite for local development');
  } catch (err) {
    console.log('⚠️  better-sqlite3 not available, using in-memory storage');
    console.log('💡 For persistent storage, install SQLite: npm run install:local');
    console.log('🐘 For Railway deployment, set DATABASE_URL environment variable');
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
  
  memoryStorage.nextId = { stores: 4, inventory: 5, verifications: 1 };
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
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    if (!isInMemory && !isPostgres && db) {
      db.close();
    } else if (isPostgres && db) {
      db.end();
    }
    process.exit(0);
  });
}); 