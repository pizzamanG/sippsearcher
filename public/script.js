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
    animateVisitorCounter();
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
function initMap() {
    // Default location (center of US)
    const defaultLocation = { lat: 39.8283, lng: -98.5795 };
    
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 4,
        center: defaultLocation,
        styles: [
            {
                "elementType": "geometry",
                "stylers": [{"color": "#1d2c4d"}]
            },
            {
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#8ec3b9"}]
            },
            {
                "elementType": "labels.text.stroke",
                "stylers": [{"color": "#1a3646"}]
            },
            {
                "featureType": "administrative.country",
                "elementType": "geometry.stroke",
                "stylers": [{"color": "#4b6878"}]
            },
            {
                "featureType": "administrative.land_parcel",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#64779e"}]
            },
            {
                "featureType": "administrative.province",
                "elementType": "geometry.stroke",
                "stylers": [{"color": "#4b6878"}]
            },
            {
                "featureType": "landscape.man_made",
                "elementType": "geometry.stroke",
                "stylers": [{"color": "#334e87"}]
            },
            {
                "featureType": "landscape.natural",
                "elementType": "geometry",
                "stylers": [{"color": "#023e58"}]
            },
            {
                "featureType": "poi",
                "elementType": "geometry",
                "stylers": [{"color": "#283d6a"}]
            },
            {
                "featureType": "poi",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#6f9ba5"}]
            },
            {
                "featureType": "poi",
                "elementType": "labels.text.stroke",
                "stylers": [{"color": "#1d2c4d"}]
            },
            {
                "featureType": "poi.park",
                "elementType": "geometry.fill",
                "stylers": [{"color": "#023e58"}]
            },
            {
                "featureType": "poi.park",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#3C7680"}]
            },
            {
                "featureType": "road",
                "elementType": "geometry",
                "stylers": [{"color": "#304a7d"}]
            },
            {
                "featureType": "road",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#98a5be"}]
            },
            {
                "featureType": "road",
                "elementType": "labels.text.stroke",
                "stylers": [{"color": "#1d2c4d"}]
            },
            {
                "featureType": "road.highway",
                "elementType": "geometry",
                "stylers": [{"color": "#2c6675"}]
            },
            {
                "featureType": "road.highway",
                "elementType": "geometry.stroke",
                "stylers": [{"color": "#255763"}]
            },
            {
                "featureType": "road.highway",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#b0d5ce"}]
            },
            {
                "featureType": "road.highway",
                "elementType": "labels.text.stroke",
                "stylers": [{"color": "#023e58"}]
            },
            {
                "featureType": "transit",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#98a5be"}]
            },
            {
                "featureType": "transit",
                "elementType": "labels.text.stroke",
                "stylers": [{"color": "#1d2c4d"}]
            },
            {
                "featureType": "transit.line",
                "elementType": "geometry.fill",
                "stylers": [{"color": "#283d6a"}]
            },
            {
                "featureType": "transit.station",
                "elementType": "geometry",
                "stylers": [{"color": "#3a4762"}]
            },
            {
                "featureType": "water",
                "elementType": "geometry",
                "stylers": [{"color": "#0e1626"}]
            },
            {
                "featureType": "water",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#4e6d70"}]
            }
        ]
    });
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

// Load Monster flavors
async function loadFlavors() {
    try {
        const response = await fetch('/api/flavors');
        const data = await response.json();
        flavors = data.flavors;
        
        // Populate flavor dropdown
        const flavorSelect = document.getElementById('drink-select');
        flavorSelect.innerHTML = '<option value="">Choose a flavor...</option>';
        
        flavors.forEach(flavor => {
            const option = document.createElement('option');
            option.value = flavor.id;
            option.textContent = flavor.name;
            option.setAttribute('data-color', flavor.color);
            flavorSelect.appendChild(option);
        });
        
        console.log('🥤 Loaded', flavors.length, 'Monster flavors!');
    } catch (error) {
        console.error('Error loading flavors:', error);
        showToast('Failed to load Monster flavors! 😱', 'error');
    }
}

// Load stores
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
            option.textContent = `${store.name} - ${store.address}`;
            storeSelect.appendChild(option);
        });
        
        console.log('🏪 Loaded', stores.length, 'stores!');
    } catch (error) {
        console.error('Error loading stores:', error);
        showToast('Failed to load stores! 😱', 'error');
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

// Load store inventory
async function loadStoreInventory(storeId) {
    try {
        const response = await fetch(`/api/stores/${storeId}/inventory`);
        return await response.json();
    } catch (error) {
        console.error('Error loading inventory:', error);
        return [];
    }
}

// Create inventory item HTML
function createInventoryItem(item) {
    const flavor = flavors.find(f => f.id === item.drink_id);
    const flavorName = flavor ? flavor.name : item.drink_id;
    const statusClass = item.in_stock ? 'in-stock' : 'out-of-stock';
    const statusText = item.in_stock ? '✅ In Stock' : '❌ Out of Stock';
    const lastUpdated = new Date(item.last_updated).toLocaleDateString();
    
    return `
        <div class="inventory-item">
            <div class="item-details">
                <div class="drink-name">${flavorName}</div>
                <div class="drink-size">${item.size}</div>
                <div class="drink-price">${item.price ? '$' + item.price.toFixed(2) : 'Price unknown'}</div>
                <div class="last-updated">Last updated: ${lastUpdated}</div>
            </div>
            <div class="item-status">
                <div class="drink-status ${statusClass}">${statusText}</div>
                <div class="verification-count">✓ ${item.verification_count || 0} verifications</div>
                <button class="verify-button" onclick="verifyInventory(${item.id})">👍 VERIFY</button>
            </div>
        </div>
    `;
}

// Add store markers to map
function addStoreMarkersToMap(stores) {
    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    markers = [];
    
    stores.forEach(store => {
        const marker = new google.maps.Marker({
            position: { lat: store.latitude, lng: store.longitude },
            map: map,
            title: store.name,
            icon: {
                url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDOC4xMyAyIDUgNS4xMyA1IDlDNSAxNC4yNSAxMiAyMiAxMiAyMkMxMiAyMiAxOSAxNC4yNSAxOSA5QzE5IDUuMTMgMTUuODcgMiAxMiAyWk0xMiAxMS41QzEwLjYyIDExLjUgOS41IDEwLjM4IDkuNSA5QzkuNSA3LjYyIDEwLjYyIDYuNSAxMiA2LjVDMTMuMzggNi41IDE0LjUgNy42MiAxNC41IDlDMTQuNSAxMC4zOCAxMy4zOCAxMS41IDEyIDExLjVaIiBmaWxsPSIjMDBGRjAwIiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS13aWR0aD0iMSIvPgo8L3N2Zz4K',
                scaledSize: new google.maps.Size(32, 32)
            }
        });
        
        // Add click event to show store info
        marker.addListener('click', function() {
            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div style="color: black; font-family: Arial, sans-serif;">
                        <h3>${store.name}</h3>
                        <p>${store.address}</p>
                        <p>Distance: ${store.distance ? store.distance.toFixed(1) + ' miles' : 'Unknown'}</p>
                    </div>
                `
            });
            infoWindow.open(map, marker);
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
            // Refresh the search results
            searchStores();
        } else {
            showToast('Verification failed! 😞', 'error');
        }
    } catch (error) {
        console.error('Error verifying inventory:', error);
        showToast('Verification failed! 😞', 'error');
    }
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

// Animate visitor counter
function animateVisitorCounter() {
    const counter = document.getElementById('visitor-count');
    let currentCount = parseInt(counter.textContent);
    
    setInterval(() => {
        currentCount += Math.floor(Math.random() * 3) + 1;
        counter.textContent = currentCount;
    }, 5000);
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

// Matrix effect for background (optional)
function createMatrixEffect() {
    const canvas = document.createElement('canvas');
    canvas.className = 'matrix-bg';
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const matrix = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789@#$%^&*()*&^%+-/~{[|`]}";
    const matrixArray = matrix.split("");
    
    const fontSize = 10;
    const columns = canvas.width / fontSize;
    const drops = [];
    
    for (let x = 0; x < columns; x++) {
        drops[x] = 1;
    }
    
    function draw() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#0F0';
        ctx.font = fontSize + 'px arial';
        
        for (let i = 0; i < drops.length; i++) {
            const text = matrixArray[Math.floor(Math.random() * matrixArray.length)];
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);
            
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    }
    
    setInterval(draw, 35);
    document.body.appendChild(canvas);
}

// Uncomment to enable matrix effect
// createMatrixEffect(); 