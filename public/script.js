// SippSearcher Frontend JavaScript
// Early Internet vibes with modern functionality!

let map;
let markers = [];
let userLocation = null;
let stores = [];
let flavors = [];

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadFlavors();
    loadStores();
    setupEventListeners();
    loadVisitorCount();
    loadGuestbookEntries();
});

// Initialize the application
function initializeApp() {
    console.log('🥤 SippSearcher initialized! Welcome to the energy drink revolution!');
    
    // Initialize Google Maps
    initMap();
    
    // Show welcome message
    showToast('Welcome to SippSearcher! 🚀', 'success');
}

// Initialize Google Maps
async function initMap() {
    try {
        // Get Google Maps API key
        const response = await fetch('/api/config');
        const config = await response.json();
        
        if (!config.googleMapsApiKey) {
            console.error('Google Maps API key not configured');
            document.getElementById('map').innerHTML = '<div class="map-error">Map unavailable - API key not configured</div>';
            return;
        }
        
        // Load Google Maps script
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${config.googleMapsApiKey}&libraries=geometry&callback=initGoogleMap`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
    } catch (error) {
        console.error('Error loading Google Maps:', error);
        document.getElementById('map').innerHTML = '<div class="map-error">Map unavailable</div>';
    }
}

// Google Maps callback
function initGoogleMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 40.7128, lng: -74.0060 }, // Default to NYC
        zoom: 10,
        styles: [
            // Retro map styling
            {
                "featureType": "all",
                "elementType": "all",
                "stylers": [
                    { "saturation": -80 },
                    { "lightness": 60 }
                ]
            }
        ]
    });
    
    console.log('🗺️ Google Maps initialized');
}

// Load flavors from server
async function loadFlavors() {
    try {
        const response = await fetch('/api/flavors');
        flavors = await response.json();
        
        // Populate flavor dropdown
        const flavorSelect = document.getElementById('drink-select');
        flavorSelect.innerHTML = '<option value="">Choose a flavor...</option>';
        
        flavors.forEach(flavor => {
            const option = document.createElement('option');
            option.value = flavor.id;
            option.textContent = flavor.name;
            flavorSelect.appendChild(option);
        });
        
        console.log('🥤 Loaded flavors:', flavors.length);
    } catch (error) {
        console.error('Error loading flavors:', error);
        showToast('Failed to load flavors! 😞', 'error');
    }
}

// Load stores from server
async function loadStores() {
    try {
        const response = await fetch('/api/stores');
        stores = await response.json();
        
        // Populate store dropdown
        const storeSelect = document.getElementById('store-select');
        storeSelect.innerHTML = '<option value="">Choose a store...</option>';
        
        stores.forEach(store => {
            const option = document.createElement('option');
            option.value = store.id;
            option.textContent = store.name + ' - ' + store.address;
            storeSelect.appendChild(option);
        });
        
        console.log('🏪 Loaded stores:', stores.length);
    } catch (error) {
        console.error('Error loading stores:', error);
        showToast('Failed to load stores! 😞', 'error');
    }
}

// Get current location
function getCurrentLocation() {
    if (navigator.geolocation) {
        showToast('Getting your location... 📍', 'info');
        navigator.geolocation.getCurrentPosition(function(position) {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            
            // Update map center
            map.setCenter(userLocation);
            map.setZoom(12);
            
            // Add marker for user location
            new google.maps.Marker({
                position: userLocation,
                map: map,
                title: 'Your Location',
                icon: {
                    url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOCIgZmlsbD0iI0ZGRkYwMCIgc3Ryb2tlPSIjRkYwMDAwIiBzdHJva2Utd2lkdGg9IjMiLz4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMyIgZmlsbD0iI0ZGMDAwMCIvPgo8L3N2Zz4K',
                    scaledSize: new google.maps.Size(32, 32)
                }
            });
            
            // Reverse geocode to get address
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: userLocation }, function(results, status) {
                if (status === 'OK' && results[0]) {
                    document.getElementById('location-input').value = results[0].formatted_address;
                    showToast('Location found! 🎯', 'success');
                }
            });
        }, function() {
            showToast('Unable to get your location. Please enter manually. 😅', 'error');
        });
    } else {
        showToast('Geolocation is not supported by this browser. 🚫', 'error');
    }
}

// Search for stores
async function searchStores() {
    const locationInput = document.getElementById('location-input').value;
    const radius = document.getElementById('radius-select').value;
    
    if (!locationInput) {
        showToast('Please enter a location first! 📍', 'error');
        return;
    }
    
    showToast('Searching for stores... 🔍', 'info');
    
    try {
        // Geocode the location
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: locationInput }, async function(results, status) {
            if (status === 'OK') {
                const location = results[0].geometry.location;
                const lat = location.lat();
                const lng = location.lng();
                
                // Update map
                map.setCenter({ lat, lng });
                map.setZoom(12);
                
                // Search for nearby stores
                const response = await fetch(`/api/stores/near/${lat}/${lng}/${radius}`);
                const nearbyStores = await response.json();
                
                displaySearchResults(nearbyStores);
                addStoreMarkersToMap(nearbyStores);
                
                if (nearbyStores.length === 0) {
                    showToast('No stores found in this area. Try expanding your search radius! 🤷‍♂️', 'info');
                } else {
                    showToast(`Found ${nearbyStores.length} stores! 🎉`, 'success');
                }
            } else {
                showToast('Location not found. Please try a different address! 🗺️', 'error');
            }
        });
    } catch (error) {
        console.error('Error searching stores:', error);
        showToast('Search failed! Try again later. 💥', 'error');
    }
}

// Display search results
function displaySearchResults(stores) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '';
    
    if (stores.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">No stores found in your area. Be the first to add one! 🚀</div>';
        return;
    }
    
    stores.forEach(async store => {
        const storeElement = document.createElement('div');
        storeElement.className = 'store-result';
        
        // Load inventory for this store
        const inventory = await loadStoreInventory(store.id);
        
        storeElement.innerHTML = `
            <div class="store-name">${store.name}</div>
            <div class="store-address">${store.address}</div>
            <div class="store-distance">📍 ${store.distance ? store.distance.toFixed(1) + ' miles away' : 'Distance unknown'}</div>
            <div class="store-inventory">
                <h4>🥤 Available Monsters:</h4>
                <div class="inventory-list">
                    ${inventory.length > 0 ? inventory.map(item => createInventoryItem(item)).join('') : '<div class="no-inventory">No inventory data available. Help us by adding some!</div>'}
                </div>
            </div>
        `;
        
        resultsContainer.appendChild(storeElement);
    });
}

// Load inventory for a specific store
async function loadStoreInventory(storeId) {
    try {
        const response = await fetch(`/api/stores/${storeId}/inventory`);
        return await response.json();
    } catch (error) {
        console.error('Error loading store inventory:', error);
        return [];
    }
}

// Create inventory item HTML
function createInventoryItem(item) {
    const flavor = flavors.find(f => f.id === item.drink_id);
    const flavorName = flavor ? flavor.name : item.drink_id;
    const stockStatus = item.in_stock ? '✅ In Stock' : '❌ Out of Stock';
    const price = item.price ? `$${item.price}` : 'Price unknown';
    
    return `
        <div class="inventory-item ${item.in_stock ? 'in-stock' : 'out-of-stock'}">
            <div class="flavor-name">${flavorName} (${item.size})</div>
            <div class="price">${price}</div>
            <div class="stock-status">${stockStatus}</div>
            <div class="last-updated">Updated: ${new Date(item.last_updated).toLocaleDateString()}</div>
            ${item.verification_count > 0 ? `<div class="verifications">👍 ${item.verification_count} verifications</div>` : ''}
            <button onclick="verifyInventory(${item.id})" class="verify-btn">👍 Verify</button>
        </div>
    `;
}

// Add store markers to map with enhanced hover functionality
function addStoreMarkersToMap(stores) {
    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    markers = [];
    
    stores.forEach(async store => {
        const marker = new google.maps.Marker({
            position: { lat: store.latitude, lng: store.longitude },
            map: map,
            title: store.name,
            icon: {
                url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE2IDJDMTAuNDggMiA2IDYuNDggNiAxMkM2IDE4IDEwIDI2IDE2IDMwQzIyIDI2IDI2IDE4IDI2IDEyQzI2IDYuNDggMjEuNTIgMiAxNiAyWiIgZmlsbD0iIzAwRkYwMCIgc3Ryb2tlPSIjMDAwMDAwIiBzdHJva2Utd2lkdGg9IjIiLz4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxMiIgcj0iNCIgZmlsbD0iIzAwMDAwMCIvPgo8L3N2Zz4K',
                scaledSize: new google.maps.Size(32, 32)
            }
        });
        
        // Load inventory for hover info
        const inventory = await loadStoreInventory(store.id);
        
        // Create info window with inventory details
        const inventoryList = inventory.length > 0 
            ? inventory.map(item => {
                const flavor = flavors.find(f => f.id === item.drink_id);
                const flavorName = flavor ? flavor.name : item.drink_id;
                const stockIcon = item.in_stock ? '✅' : '❌';
                const price = item.price ? ` - $${item.price}` : '';
                return `${stockIcon} ${flavorName} (${item.size})${price}`;
            }).join('<br>')
            : 'No inventory data available';
        
        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div class="map-info-window">
                    <h3>${store.name}</h3>
                    <p>${store.address}</p>
                    <div class="inventory-preview">
                        <strong>🥤 Available Monsters:</strong><br>
                        ${inventoryList}
                    </div>
                </div>
            `
        });
        
        // Show info window on hover
        marker.addListener('mouseover', function() {
            infoWindow.open(map, marker);
        });
        
        // Hide info window when not hovering
        marker.addListener('mouseout', function() {
            infoWindow.close();
        });
        
        // Click to center map on store
        marker.addListener('click', function() {
            map.setCenter(marker.getPosition());
            map.setZoom(15);
        });
        
        markers.push(marker);
    });
}

// Verify inventory item
async function verifyInventory(inventoryId) {
    try {
        const response = await fetch(`/api/inventory/${inventoryId}/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showToast('Thanks for verifying! 👍', 'success');
        } else {
            showToast('Verification failed! 😞', 'error');
        }
    } catch (error) {
        console.error('Error verifying inventory:', error);
        showToast('Verification failed! 😞', 'error');
    }
}

// Load visitor count
async function loadVisitorCount() {
    try {
        const response = await fetch('/api/visitors');
        const data = await response.json();
        document.getElementById('visitor-count').textContent = data.count;
    } catch (error) {
        console.error('Error loading visitor count:', error);
    }
}

// Load guestbook entries
async function loadGuestbookEntries() {
    try {
        const response = await fetch('/api/guestbook');
        const entries = await response.json();
        
        const container = document.getElementById('guestbook-entries');
        
        if (entries.length === 0) {
            container.innerHTML = '<div class="no-entries">No guestbook entries yet. Be the first to sign! 📝</div>';
            return;
        }
        
        container.innerHTML = entries.map(entry => `
            <div class="guestbook-entry">
                <div class="entry-header">
                    <span class="entry-name">${escapeHtml(entry.name)}</span>
                    <span class="entry-date">${new Date(entry.created_at).toLocaleDateString()}</span>
                </div>
                <div class="entry-message">${escapeHtml(entry.message)}</div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading guestbook entries:', error);
        document.getElementById('guestbook-entries').innerHTML = '<div class="error">Failed to load guestbook entries</div>';
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Add store form
    document.getElementById('add-store-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('store-name').value,
            address: document.getElementById('store-address').value,
            phone: document.getElementById('store-phone').value
        };
        
        // Geocode the address
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: formData.address }, async function(results, status) {
            if (status === 'OK') {
                const location = results[0].geometry.location;
                formData.latitude = location.lat();
                formData.longitude = location.lng();
                
                try {
                    const response = await fetch('/api/stores', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(formData)
                    });
                    
                    if (response.ok) {
                        showToast('Store added successfully! 🎉', 'success');
                        document.getElementById('add-store-form').reset();
                        loadStores(); // Refresh store list
                    } else {
                        showToast('Failed to add store! 😞', 'error');
                    }
                } catch (error) {
                    console.error('Error adding store:', error);
                    showToast('Failed to add store! 😞', 'error');
                }
            } else {
                showToast('Unable to find location. Please check the address! 🗺️', 'error');
            }
        });
    });
    
    // Update inventory form
    document.getElementById('inventory-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('store_id', document.getElementById('store-select').value);
        formData.append('drink_id', document.getElementById('drink-select').value);
        formData.append('size', document.getElementById('size-select').value);
        formData.append('price', document.getElementById('price-input').value);
        formData.append('in_stock', document.getElementById('stock-status').value);
        formData.append('updated_by', document.getElementById('updated-by').value || 'Anonymous');
        
        const photoFile = document.getElementById('photo-upload').files[0];
        if (photoFile) {
            formData.append('photo', photoFile);
        }
        
        try {
            const response = await fetch('/api/inventory', {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                showToast('Inventory updated successfully! 📸', 'success');
                document.getElementById('inventory-form').reset();
                populateSizeOptions(); // Reset size options
            } else {
                showToast('Failed to update inventory! 😞', 'error');
            }
        } catch (error) {
            console.error('Error updating inventory:', error);
            showToast('Failed to update inventory! 😞', 'error');
        }
    });
    
    // Guestbook form
    document.getElementById('guestbook-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = document.getElementById('guest-name').value;
        const message = document.getElementById('guest-message').value;
        
        try {
            const response = await fetch('/api/guestbook', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, message })
            });
            
            if (response.ok) {
                showToast('Thanks for signing the guestbook! 📝', 'success');
                document.getElementById('guestbook-form').reset();
                loadGuestbookEntries(); // Refresh entries
            } else {
                showToast('Failed to add guestbook entry! 😞', 'error');
            }
        } catch (error) {
            console.error('Error adding guestbook entry:', error);
            showToast('Failed to add guestbook entry! 😞', 'error');
        }
    });
    
    // Flavor selection updates size options
    document.getElementById('drink-select').addEventListener('change', function() {
        populateSizeOptions();
    });
}

// Populate size options based on selected flavor
function populateSizeOptions() {
    const flavorSelect = document.getElementById('drink-select');
    const sizeSelect = document.getElementById('size-select');
    
    sizeSelect.innerHTML = '<option value="">Choose size...</option>';
    
    if (flavorSelect.value) {
        const selectedFlavor = flavors.find(f => f.id === flavorSelect.value);
        if (selectedFlavor && selectedFlavor.size_options) {
            selectedFlavor.size_options.forEach(size => {
                const option = document.createElement('option');
                option.value = size;
                option.textContent = size;
                sizeSelect.appendChild(option);
            });
        }
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Easter egg - Konami code
let konamiCode = [];
const konamiSequence = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65]; // Up, Up, Down, Down, Left, Right, Left, Right, B, A

document.addEventListener('keydown', function(e) {
    konamiCode.push(e.keyCode);
    if (konamiCode.length > konamiSequence.length) {
        konamiCode.shift();
    }
    
    if (konamiCode.join(',') === konamiSequence.join(',')) {
        showToast('🎮 KONAMI CODE ACTIVATED! You are a true 90s kid! 🎮', 'success');
        document.body.style.filter = 'hue-rotate(180deg)';
        setTimeout(() => {
            document.body.style.filter = 'none';
        }, 3000);
    }
});

// Console art for the retro feel
console.log(`
    ███████╗██╗██████╗ ██████╗ ███████╗███████╗ █████╗ ██████╗  ██████╗██╗  ██╗███████╗██████╗ 
    ██╔════╝██║██╔══██╗██╔══██╗██╔════╝██╔════╝██╔══██╗██╔══██╗██╔════╝██║  ██║██╔════╝██╔══██╗
    ███████╗██║██████╔╝██████╔╝███████╗█████╗  ███████║██████╔╝██║     ███████║█████╗  ██████╔╝
    ╚════██║██║██╔═══╝ ██╔═══╝ ╚════██║██╔══╝  ██╔══██║██╔══██╗██║     ██╔══██║██╔══╝  ██╔══██╗
    ███████║██║██║     ██║     ███████║███████╗██║  ██║██║  ██║╚██████╗██║  ██║███████╗██║  ██║
    ╚══════╝╚═╝╚═╝     ╚═╝     ╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
    
    🥤 Welcome to the energy drink revolution! 🥤
    Built with 90s nostalgia and modern web tech.
    
    Try the Konami Code: ↑↑↓↓←→←→BA
`); 