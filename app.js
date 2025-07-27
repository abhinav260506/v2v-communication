let map;
let vehicleMarkers = {};
const markerColors = ['blue','red','green','yellow','orange','grey','black','violet'];
const communicationRange = 0.02; // Range for nearby vehicles
const accidentRange = 0.005; // Range for accident detection
let cityLat = 13.0827; // Default: Chennai latitude
let cityLon = 80.2707; // Default: Chennai longitude

let mockVehicles = [
    { id: 1, speed: 60, condition: 'Good', direction: 'North', lat: 13.0827, lon: 80.2707 },
    { id: 2, speed: 45, condition: 'Moderate', direction: 'East', lat: 13.0837, lon: 80.2717 },
    { id: 3, speed: 70, condition: 'Critical', direction: 'South', lat: 13.0817, lon: 80.2697 },
    { id: 4, speed: 50, condition: 'Good', direction: 'West', lat: 13.0807, lon: 80.2687 },
    { id: 5, speed: 40, condition: 'Moderate', direction: 'North-East', lat: 13.0847, lon: 80.2727 },
    { id: 6, speed: 80, condition: 'Good', direction: 'South-East', lat: 13.0857, lon: 80.2737 },
    { id: 7, speed: 55, condition: 'Critical', direction: 'West', lat: 13.0797, lon: 80.2677 },
    { id: 8, speed: 65, condition: 'Good', direction: 'North-West', lat: 13.0867, lon: 80.2747 },
    { id: 9, speed: 30, condition: 'Moderate', direction: 'South-West', lat: 13.0787, lon: 80.2667 },
    { id: 10, speed: 40, condition: 'Critical', direction: 'East', lat: 13.0877, lon: 80.2757 },
];

const directions = ['North', 'South', 'East', 'West', 'North-East', 'South-East', 'North-West', 'South-West'];
const conditions = ['Good', 'Moderate', 'Critical'];

// Function to create a custom marker icon
function createColoredMarker(color) {
    return L.icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
        shadowSize: [41, 41],
    });
}

// Initialize Leaflet Map
function initMap() {
    map = L.map('map').setView([cityLat, cityLon], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
    }).addTo(map);
    updateVehicleData();
    setInterval(updateVehiclePositions, 2000); // Update vehicle positions every 2 seconds
}

// Search for city location using OpenStreetMap's Nominatim API
async function searchLocation() {
    const searchInput = document.getElementById('searchInput').value;
    if (!searchInput.trim()) {
        alert('Please enter a city name!');
        return;
    }

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchInput)}&format=json&limit=1`
        );
        const results = await response.json();
        if (results.length > 0) {
            const { lat, lon, display_name } = results[0];
            cityLat = parseFloat(lat);
            cityLon = parseFloat(lon);
            map.setView([cityLat, cityLon], 12);
            L.marker([cityLat, cityLon]).addTo(map).bindPopup(display_name).openPopup();

            // Reposition vehicles around the new city location
            mockVehicles = mockVehicles.map(vehicle => ({
                ...vehicle,
                lat: cityLat + (Math.random() - 0.5) * 0.02,
                lon: cityLon + (Math.random() - 0.5) * 0.02,
            }));
            updateVehicleData(); // Update markers and table
        } else {
            alert('Location not found! Please try another city.');
        }
    } catch (error) {
        console.error('Error fetching location:', error);
        alert('An error occurred while searching for the location.');
    }
}

// Update vehicle markers and table
function updateVehicleData() {
    const tableBody = document.getElementById('vehicleTableBody');
    tableBody.innerHTML = ''; // Clear the table

    mockVehicles.forEach((vehicle, index) => {
        const color = markerColors[index % markerColors.length]; // Cycle through colors
        const position = [vehicle.lat, vehicle.lon];

        if (!vehicleMarkers[vehicle.id]) {
            // Create new marker for this vehicle
            vehicleMarkers[vehicle.id] = L.marker(position, {
                icon: createColoredMarker(color),
            }).addTo(map).bindPopup(`Vehicle ${vehicle.id}`);
        } else {
            // Update existing marker
            vehicleMarkers[vehicle.id].setLatLng(position);
        }

        const nearbyVehicles = findNearbyVehicles(vehicle);
        const nearbyIds = nearbyVehicles.map(v => v.id).join(', ');
        const trafficWarning = nearbyVehicles.length >= 5 ? 'Traffic detected! Take an alternate route.' : 'Route clear! Proceed with the journey.';
        const nearbyVehicleInfo = nearbyVehicles
            .map(v => `ID: ${v.id}, Speed: ${v.speed}, Direction: ${v.direction}, Condition: ${v.condition}`)
            .join('<br>') || 'None'; // Concatenate information of nearby vehicles

        const accidentWarning = checkAccidents(vehicle, nearbyVehicles);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${vehicle.id}</td>
            <td>${vehicle.speed}</td>
            <td>${vehicle.condition}</td>
            <td>${vehicle.direction}</td>
            <td>[${vehicle.lat.toFixed(4)}, ${vehicle.lon.toFixed(4)}]</td>
            <td>${nearbyIds || 'None'}</td>
            <td>${nearbyVehicleInfo}</td>
            <td>${trafficWarning}</td>
            <td>${accidentWarning}</td>
        `;

        // Add a click event listener to the row
        row.addEventListener('click', () => {
            highlightVehicle(vehicle.id);
        });

        tableBody.appendChild(row);
    });
}

// Function to highlight the selected vehicle on the map
// Function to highlight the selected vehicle on the map and display its information
function highlightVehicle(vehicleId) {
    // Reset all markers to the default color
    Object.keys(vehicleMarkers).forEach(id => {
        vehicleMarkers[id].setIcon(createColoredMarker(markerColors[id % markerColors.length]));
    });

    // Highlight the selected vehicle's marker
    const selectedVehicleMarker = vehicleMarkers[vehicleId];
    const selectedVehicle = mockVehicles.find(vehicle => vehicle.id === vehicleId);

    if (selectedVehicleMarker && selectedVehicle) {
        // Change marker to red to highlight
        selectedVehicleMarker.setIcon(createColoredMarker('red'));
        
        // Update and open popup with detailed vehicle information
        const popupContent = `
            <strong>Vehicle ${selectedVehicle.id}</strong><br>
            <b>Speed:</b> ${selectedVehicle.speed} km/h<br>
            <b>Condition:</b> ${selectedVehicle.condition}<br>
            <b>Direction:</b> ${selectedVehicle.direction}<br>
            <b>Location:</b> [${selectedVehicle.lat.toFixed(4)}, ${selectedVehicle.lon.toFixed(4)}]
        `;
        selectedVehicleMarker.bindPopup(popupContent).openPopup();

        // Pan the map to the selected vehicle's location
        map.panTo([selectedVehicle.lat, selectedVehicle.lon]);
    }
}

// Add click event listener to each row in the table
function updateVehicleData() {
    const tableBody = document.getElementById('vehicleTableBody');
    tableBody.innerHTML = ''; // Clear the table

    mockVehicles.forEach((vehicle, index) => {
        const color = markerColors[index % markerColors.length]; // Cycle through colors
        const position = [vehicle.lat, vehicle.lon];

        if (!vehicleMarkers[vehicle.id]) {
            // Create new marker for this vehicle
            vehicleMarkers[vehicle.id] = L.marker(position, {
                icon: createColoredMarker(color),
            }).addTo(map).bindPopup(`Vehicle ${vehicle.id}`);
        } else {
            // Update existing marker
            vehicleMarkers[vehicle.id].setLatLng(position);
        }

        const nearbyVehicles = findNearbyVehicles(vehicle);
        const nearbyIds = nearbyVehicles.map(v => v.id).join(', ');
        const trafficWarning = nearbyVehicles.length >= 5 ? 'Traffic detected! Take an alternate route.' : 'Route clear! Proceed with the journey.';
        const nearbyVehicleInfo = nearbyVehicles
            .map(v => `ID: ${v.id}, Speed: ${v.speed}, Direction: ${v.direction}, Condition: ${v.condition}`)
            .join('<br>') || 'None'; // Concatenate information of nearby vehicles

        const accidentWarning = checkAccidents(vehicle, nearbyVehicles);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${vehicle.id}</td>
            <td>${vehicle.speed}</td>
            <td>${vehicle.condition}</td>
            <td>${vehicle.direction}</td>
            <td>[${vehicle.lat.toFixed(4)}, ${vehicle.lon.toFixed(4)}]</td>
            <td>${nearbyIds || 'None'}</td>
            <td>${nearbyVehicleInfo}</td>
            <td>${trafficWarning}</td>
            <td>${accidentWarning}</td>
        `;

        // Add a click event listener to the row
        row.addEventListener('click', () => {
            highlightVehicle(vehicle.id); // Call highlightVehicle when a row is clicked
        });

        tableBody.appendChild(row);
    });
}

// Find nearby vehicles based on communication range
function findNearbyVehicles(vehicle) {
    return mockVehicles.filter(otherVehicle => {
        if (vehicle.id === otherVehicle.id) return false;
        const latDiff = Math.abs(vehicle.lat - otherVehicle.lat);
        const lonDiff = Math.abs(vehicle.lon - otherVehicle.lon);
        return latDiff <= communicationRange && lonDiff <= communicationRange;
    });
}

// Check for potential accidents
function checkAccidents(vehicle, nearbyVehicles) {
    const potentialAccidents = nearbyVehicles.filter(v =>
        Math.abs(vehicle.lat - v.lat) <= accidentRange &&
        Math.abs(vehicle.lon - v.lon) <= accidentRange &&
        vehicle.speed > 50 &&
        v.speed > 50
    );

    return potentialAccidents.length > 0
        ? `Accident risk with vehicle(s): ${potentialAccidents.map(v => v.id).join(', ')}`
        : 'No risk';
}

// Simulate vehicle movement and update properties
function updateVehiclePositions() {
    mockVehicles = mockVehicles.map(vehicle => {
        const latOffset = (Math.random() - 0.5) * 0.01;
        const lonOffset = (Math.random() - 0.5) * 0.01;

        return {
            ...vehicle,
            lat: vehicle.lat + latOffset,
            lon: vehicle.lon + lonOffset,
            speed: Math.max(20, vehicle.speed + (Math.random() - 0.5) * 10), // Random speed change
            direction: directions[Math.floor(Math.random() * directions.length)], // Random direction
            condition: conditions[Math.floor(Math.random() * conditions.length)], // Random condition
        };
    });
    updateVehicleData(); // Update markers and table
}

// Initialize the map with a default city (San Francisco)
initMap();

