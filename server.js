const express = require('express');
const Database = require('better-sqlite3');
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

// Database setup
const db = new Database('sippsearcher.db');

// Initialize database tables
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

// Prepare statements for better performance
const getStoresStmt = db.prepare('SELECT * FROM stores ORDER BY name');
const getStoresNearStmt = db.prepare(`
  SELECT *, 
  (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude)))) AS distance
  FROM stores
  HAVING distance < ?
  ORDER BY distance
`);
const insertStoreStmt = db.prepare('INSERT INTO stores (name, address, latitude, longitude, phone) VALUES (?, ?, ?, ?, ?)');
const getInventoryStmt = db.prepare(`
  SELECT i.*, 
         (SELECT COUNT(*) FROM verifications WHERE inventory_id = i.id) as verification_count
  FROM inventory i 
  WHERE store_id = ? 
  ORDER BY last_updated DESC
`);
const insertInventoryStmt = db.prepare(`
  INSERT OR REPLACE INTO inventory 
  (store_id, drink_id, size, price, in_stock, last_updated, updated_by, photo_path) 
  VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
`);
const insertVerificationStmt = db.prepare('INSERT INTO verifications (inventory_id, user_ip) VALUES (?, ?)');

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get all stores
app.get('/api/stores', (req, res) => {
  try {
    const stores = getStoresStmt.all();
    res.json(stores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get stores near location
app.get('/api/stores/near/:lat/:lng/:radius', (req, res) => {
  const { lat, lng, radius } = req.params;
  
  try {
    const stores = getStoresNearStmt.all(lat, lng, lat, radius);
    res.json(stores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new store
app.post('/api/stores', (req, res) => {
  const { name, address, latitude, longitude, phone } = req.body;
  
  try {
    const result = insertStoreStmt.run(name, address, latitude, longitude, phone);
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get inventory for a store
app.get('/api/stores/:id/inventory', (req, res) => {
  const storeId = req.params.id;
  
  try {
    const inventory = getInventoryStmt.all(storeId);
    res.json(inventory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update inventory
app.post('/api/inventory', upload.single('photo'), (req, res) => {
  const { store_id, drink_id, size, price, in_stock, updated_by } = req.body;
  const photo_path = req.file ? `/uploads/${req.file.filename}` : null;
  
  try {
    const result = insertInventoryStmt.run(store_id, drink_id, size, price, in_stock, updated_by, photo_path);
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify inventory
app.post('/api/inventory/:id/verify', (req, res) => {
  const inventoryId = req.params.id;
  const userIp = req.ip;
  
  try {
    insertVerificationStmt.run(inventoryId, userIp);
    res.json({ success: true });
  } catch (err) {
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