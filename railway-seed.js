// Railway seed script for PostgreSQL database
const { Pool } = require('pg');
require('dotenv').config();

// Create database connection
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Sample store data
const sampleStores = [
    {
        name: "7-Eleven",
        address: "123 Main St, Anytown, USA",
        latitude: 40.7128,
        longitude: -74.0060,
        phone: "(555) 123-4567"
    },
    {
        name: "Circle K",
        address: "456 Oak Ave, Somewhere, USA",
        latitude: 40.7580,
        longitude: -73.9855,
        phone: "(555) 987-6543"
    },
    {
        name: "Wawa",
        address: "789 Pine Rd, Elsewhere, USA",
        latitude: 40.7282,
        longitude: -74.0776,
        phone: "(555) 456-7890"
    },
    {
        name: "QuikTrip",
        address: "321 Elm St, Anywhere, USA",
        latitude: 40.7505,
        longitude: -73.9934,
        phone: "(555) 234-5678"
    },
    {
        name: "Speedway",
        address: "654 Maple Dr, Nowhere, USA",
        latitude: 40.7614,
        longitude: -73.9776,
        phone: "(555) 345-6789"
    }
];

// Sample inventory data (references Monster flavor IDs from monster-flavors.json)
const sampleInventory = [
    // 7-Eleven inventory
    { store_id: 1, drink_id: "monster-original", size: "16oz", price: 2.99, in_stock: true, updated_by: "Store Manager" },
    { store_id: 1, drink_id: "monster-ultra-zero", size: "16oz", price: 2.99, in_stock: true, updated_by: "Store Manager" },
    { store_id: 1, drink_id: "monster-ultra-red", size: "16oz", price: 2.99, in_stock: false, updated_by: "Store Manager" },
    { store_id: 1, drink_id: "monster-pipeline-punch", size: "16oz", price: 3.29, in_stock: true, updated_by: "Store Manager" },
    
    // Circle K inventory
    { store_id: 2, drink_id: "monster-original", size: "16oz", price: 2.89, in_stock: true, updated_by: "Assistant Manager" },
    { store_id: 2, drink_id: "monster-ultra-blue", size: "16oz", price: 2.89, in_stock: true, updated_by: "Assistant Manager" },
    { store_id: 2, drink_id: "monster-assault", size: "16oz", price: 2.89, in_stock: true, updated_by: "Assistant Manager" },
    { store_id: 2, drink_id: "monster-mango-loco", size: "16oz", price: 3.19, in_stock: false, updated_by: "Assistant Manager" },
    
    // Wawa inventory
    { store_id: 3, drink_id: "monster-original", size: "16oz", price: 3.09, in_stock: true, updated_by: "Energy Enthusiast" },
    { store_id: 3, drink_id: "monster-ultra-sunrise", size: "16oz", price: 3.09, in_stock: true, updated_by: "Energy Enthusiast" },
    { store_id: 3, drink_id: "monster-ultra-paradise", size: "16oz", price: 3.09, in_stock: true, updated_by: "Energy Enthusiast" },
    { store_id: 3, drink_id: "monster-pacific-punch", size: "16oz", price: 3.39, in_stock: true, updated_by: "Energy Enthusiast" },
    
    // QuikTrip inventory
    { store_id: 4, drink_id: "monster-original", size: "24oz", price: 3.99, in_stock: true, updated_by: "QT Employee" },
    { store_id: 4, drink_id: "monster-ultra-zero", size: "24oz", price: 3.99, in_stock: true, updated_by: "QT Employee" },
    { store_id: 4, drink_id: "monster-ultra-black", size: "16oz", price: 2.99, in_stock: false, updated_by: "QT Employee" },
    { store_id: 4, drink_id: "monster-rehab-tea-lemonade", size: "16oz", price: 3.49, in_stock: true, updated_by: "QT Employee" },
    
    // Speedway inventory
    { store_id: 5, drink_id: "monster-original", size: "16oz", price: 2.95, in_stock: true, updated_by: "Night Shift" },
    { store_id: 5, drink_id: "monster-ultra-red", size: "16oz", price: 2.95, in_stock: true, updated_by: "Night Shift" },
    { store_id: 5, drink_id: "monster-ultra-blue", size: "16oz", price: 2.95, in_stock: true, updated_by: "Night Shift" },
    { store_id: 5, drink_id: "monster-pipeline-punch", size: "24oz", price: 3.79, in_stock: false, updated_by: "Night Shift" }
];

// Function to seed the database
async function seedDatabase() {
    console.log('🌱 Starting Railway PostgreSQL database seeding...');
    
    try {
        // Clear existing data
        await db.query('DELETE FROM verifications');
        await db.query('DELETE FROM inventory');
        await db.query('DELETE FROM stores');
        
        // Insert sample stores
        for (const store of sampleStores) {
            await db.query(
                'INSERT INTO stores (name, address, latitude, longitude, phone) VALUES ($1, $2, $3, $4, $5)',
                [store.name, store.address, store.latitude, store.longitude, store.phone]
            );
        }
        
        // Insert sample inventory
        for (const item of sampleInventory) {
            await db.query(
                'INSERT INTO inventory (store_id, drink_id, size, price, in_stock, updated_by) VALUES ($1, $2, $3, $4, $5, $6)',
                [item.store_id, item.drink_id, item.size, item.price, item.in_stock, item.updated_by]
            );
        }
        
        // Add some sample verifications
        for (let i = 1; i <= 10; i++) {
            const randomInventoryId = Math.floor(Math.random() * sampleInventory.length) + 1;
            const fakeIp = `192.168.1.${Math.floor(Math.random() * 255)}`;
            await db.query(
                'INSERT INTO verifications (inventory_id, user_ip) VALUES ($1, $2)',
                [randomInventoryId, fakeIp]
            );
        }
        
        console.log('🎉 Railway database seeding completed!');
        console.log(`✅ Added ${sampleStores.length} stores`);
        console.log(`✅ Added ${sampleInventory.length} inventory items`);
        console.log('✅ Added sample verifications');
        console.log('');
        console.log('🚀 Your Railway app is ready to go!');
        
    } catch (error) {
        console.error('Error seeding Railway database:', error.message);
        console.error(error.stack);
    } finally {
        // Close the database connection
        await db.end();
        console.log('Database connection closed.');
    }
}

// Run the seeding if DATABASE_URL is provided
if (process.env.DATABASE_URL) {
    seedDatabase();
} else {
    console.error('❌ DATABASE_URL not found. This script is for Railway deployment only.');
    console.log('For local development, use: npm run seed');
} 