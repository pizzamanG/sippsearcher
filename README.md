# 🥤 SippSearcher - The Ultimate Energy Drink Finder

Welcome to SippSearcher! This rad web app helps you find Monster Energy drinks at convenience stores near you, with that sweet early internet aesthetic that'll make you nostalgic for the days of dial-up and Netscape Navigator.

## Features

- 🔍 **Location-based search** - Find stores near you using Google Maps
- 🥤 **Monster Energy inventory tracking** - See what flavors are available
- 📸 **Photo verification** - Upload photos to verify inventory
- 👍 **Community verification** - Users can verify if information is accurate
- 💰 **Price tracking** - See current prices at different stores
- ⏰ **Last updated timestamps** - Know how fresh the information is
- 🗺️ **Interactive map** - Visual representation of store locations
- 🎨 **Retro 90s aesthetic** - Because the early internet was awesome

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Google Maps API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd sippsearcher
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **For local development only - Install SQLite**
   ```bash
   npm install better-sqlite3
   ```
   > Note: This step is optional for Railway deployment as it uses PostgreSQL

4. **Set up Google Maps API**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Maps JavaScript API and Places API
   - Create an API key
   - Copy `env.template` to `.env` and add your API key

5. **Seed the database (local development only)**
   ```bash
   npm run seed
   ```

6. **Run the application**
   ```bash
   # Development mode (with nodemon)
   npm run dev
   
   # Production mode
   npm start
   ```

7. **Open your browser**
   - Navigate to `http://localhost:3000`
   - Experience the 90s nostalgia!

## Usage

### Adding Stores
1. Click on "🏪 ADD STORE" in the navigation
2. Fill in the store details (name, address, phone)
3. The app will automatically geocode the address
4. Click "➕ ADD STORE" to save

### Updating Inventory
1. Click on "📦 UPDATE INVENTORY" in the navigation
2. Select a store from the dropdown
3. Choose a Monster flavor and size
4. Enter the price and stock status
5. Optionally upload a photo for verification
6. Click "📸 UPDATE INVENTORY" to save

### Searching for Stores
1. Click on "🔍 SEARCH" in the navigation
2. Enter your location or use "📍 USE MY LOCATION"
3. Select your search radius
4. Click "🚀 SEARCH NOW!" to find nearby stores

### Verifying Information
- When viewing search results, click the "👍 VERIFY" button to confirm inventory accuracy
- This helps keep the community data reliable

## Database Schema

The app uses SQLite with the following tables:

### `stores`
- id (INTEGER PRIMARY KEY)
- name (TEXT)
- address (TEXT)
- latitude (REAL)
- longitude (REAL)
- phone (TEXT)
- created_at (DATETIME)

### `inventory`
- id (INTEGER PRIMARY KEY)
- store_id (INTEGER, FK to stores)
- drink_id (TEXT, references Monster flavor ID)
- size (TEXT)
- price (REAL)
- in_stock (BOOLEAN)
- last_updated (DATETIME)
- updated_by (TEXT)
- photo_path (TEXT)

### `verifications`
- id (INTEGER PRIMARY KEY)
- inventory_id (INTEGER, FK to inventory)
- user_ip (TEXT)
- verified_at (DATETIME)

## API Endpoints

### Stores
- `GET /api/stores` - Get all stores
- `GET /api/stores/near/:lat/:lng/:radius` - Get stores within radius
- `POST /api/stores` - Add a new store

### Inventory
- `GET /api/stores/:id/inventory` - Get inventory for a store
- `POST /api/inventory` - Update inventory (with photo upload)
- `POST /api/inventory/:id/verify` - Verify inventory item

### Flavors
- `GET /api/flavors` - Get all Monster flavors

## Monster Flavors

The app includes data for these Monster Energy flavors:
- Monster Original
- Monster Ultra (Zero, Red, Blue, Sunrise, Paradise, Black)
- Monster Assault
- Monster Rehab Tea + Lemonade
- Monster Juice (Mango Loco, Pipeline Punch, Pacific Punch)

## Deployment

### Railway (Recommended)

SippSearcher is configured to work seamlessly with Railway using PostgreSQL. Here's how to deploy:

1. **Create a Railway Account**
   - Go to [Railway.app](https://railway.app/)
   - Sign up with GitHub

2. **Deploy from GitHub**
   - Click "Deploy from GitHub repo"
   - Select your SippSearcher repository
   - Click "Deploy Now"

3. **Add PostgreSQL Database**
   - In your Railway dashboard, click "New" → "Database" → "PostgreSQL"
   - Railway will automatically provide the `DATABASE_URL` environment variable

4. **Configure Environment Variables**
   - Add your `GOOGLE_MAPS_API_KEY` in the Variables section
   - The `DATABASE_URL` is automatically configured by Railway

5. **Initial Database Setup**
   - After deployment, run the seed script to populate your database:
   ```bash
   # In Railway's console or using Railway CLI
   npm run seed:railway
   ```

6. **Access Your App**
   - Railway will provide a public URL (e.g., `https://your-app.railway.app`)
   - Your app is now live with PostgreSQL!

### Database Architecture
- **Local Development**: Uses SQLite (no setup required)
- **Railway Deployment**: Automatically switches to PostgreSQL when `DATABASE_URL` is detected
- **Dual Database Support**: Same codebase works for both environments

### Other Platforms
The app is a standard Node.js application and can be deployed on:
- Heroku (with PostgreSQL addon)
- Vercel (with external database)
- Netlify (functions + external database)
- DigitalOcean App Platform
- AWS Elastic Beanstalk

## Easter Eggs

- Try the Konami Code: ↑↑↓↓←→←→BA
- Check the browser console for ASCII art
- The visitor counter actually increments!

## Future Enhancements

- 📱 Android app (React Native)
- 🍎 iOS app (React Native)
- 🔔 Push notifications for new inventory
- 🏆 User reputation system
- 📊 Analytics dashboard
- 🎯 More energy drink brands
- 🔄 Real-time inventory updates

## Contributing

Feel free to contribute to this project! Whether it's adding new features, fixing bugs, or improving the retro aesthetic, all contributions are welcome.

## License

MIT License - See LICENSE file for details

## Acknowledgments

- Thanks to the early internet pioneers who made the web fun
- Shoutout to all the energy drink enthusiasts
- Built with love and caffeine ☕

---

**Remember**: This site is best viewed in Netscape Navigator 4.0 or higher! 😉

*SippSearcher - Finding your energy since 2024* 