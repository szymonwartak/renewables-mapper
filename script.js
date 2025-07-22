// Global variables
let map;
let markers = [];
let energyData = [];
let geocodingCache = new Map(); // Cache for geocoding results

// Country name mapping for geocoding
const countryMapping = {
    "United States of America (the)": "United States",
    "United Kingdom of Great Britain and Northern Ireland (the)": "United Kingdom",
    "Russian Federation (the)": "Russia",
    "Democratic People's Republic of Korea (the)": "North Korea",
    "Democratic Republic of the Congo (the)": "Democratic Republic of the Congo",
    "Republic of Korea (the)": "South Korea",
    "Republic of Moldova (the)": "Moldova",
    "Bahamas (the)": "Bahamas",
    "Gambia (the)": "Gambia",
    "Comoros (the)": "Comoros",
    "Congo (the)": "Congo",
    "Cook Islands (the)": "Cook Islands",
    "Côte d'Ivoire": "Ivory Coast",
    "Curaçao": "Curacao",
    "Philippines (the)": "Philippines",
    "Sudan (the)": "Sudan",
    "Syrian Arab Republic (the)": "Syria",
    "United Republic of Tanzania (the)": "Tanzania",
    "Venezuela (Bolivarian Republic of)": "Venezuela",
    "Viet Nam": "Vietnam",
    "Lao People's Democratic Republic (the)": "Laos",
    "Marshall Islands (the)": "Marshall Islands",
    "Niger (the)": "Niger",
    "Netherlands (Kingdom of the)": "Netherlands",
    "State of Palestine (the)": "Palestine",
    "Saint Barthélemy": "Saint Barthelemy",
    "Réunion": "Reunion",
    "Sint Maarten (Dutch Part)": "Sint Maarten",
    "Türkiye": "Turkey",
    "Bolivia (Plurinational State of)": "Bolivia",
    "Iran (Islamic Republic of)": "Iran",
    "Brunei Darussalam": "Brunei",
    "Central African Republic (the)": "Central African Republic",
    "Falkland Islands (Malvinas)": "Falkland Islands",
    "South Georgia and the South Sandwich Islands": "South Georgia",
    "Saint Pierre and Miquelon": "Saint Pierre and Miquelon",
    "Saint Martin (French Part)": "Saint Martin",
    "China, Hong Kong Special Administrative Region": "Hong Kong",
    "Chinese Taipei": "Taiwan"
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    loadData();
    setupControls();
});

// Initialize the map
function initializeMap() {
    map = L.map('map').setView([20, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);
}

// Load and parse CSV data
async function loadData() {
    try {
        const response = await fetch('data.csv');
        const csvText = await response.text();
        const lines = csvText.split('\n');

        // Skip header lines
        const dataLines = lines.slice(2);

        energyData = dataLines
            .filter(line => line.trim())
            .map(line => {
                const columns = parseCSVLine(line);
                if (columns.length >= 6) {
                    const capacity = parseFloat(columns[5]);
                    if (!isNaN(capacity) && capacity > 0) {
                        return {
                            country: columns[0].replace(/"/g, ''),
                            technology: columns[1].replace(/"/g, ''),
                            dataType: columns[2].replace(/"/g, ''),
                            gridConnection: columns[3].replace(/"/g, ''),
                            year: columns[4].replace(/"/g, ''),
                            capacity: capacity
                        };
                    }
                }
                return null;
            })
            .filter(item => item !== null);

        createMarkers();
        updateStats();

    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading data. Please make sure data.csv is in the same directory.');
    }
}

// Parse CSV line handling quoted fields
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current);
    return result;
}

// Create markers for each country
async function createMarkers() {
    const minCapacity = parseFloat(document.getElementById('minCapacity').value);
    const maxCapacity = parseFloat(document.getElementById('maxCapacity').value);

    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    // Filter data based on capacity range
    const filteredData = energyData.filter(data =>
        data.capacity >= minCapacity && data.capacity <= maxCapacity
    );

    if (filteredData.length === 0) {
        updateStats();
        return;
    }

    // Show loading indicator
    const loadingElement = document.getElementById('loading');
    loadingElement.classList.remove('hidden');

    try {
        // Create geocoding promises for all countries in parallel
        const geocodingPromises = filteredData.map(async (data) => {
            const countryName = countryMapping[data.country] || data.country;
            try {
                const coordinates = await geocodeCountry(countryName);
                return coordinates ? { coordinates, data } : null;
            } catch (error) {
                console.warn(`Could not geocode ${countryName}:`, error);
                return null;
            }
        });

        // Wait for all geocoding to complete
        const results = await Promise.all(geocodingPromises);

        // Create markers for successful geocoding results
        results.forEach(result => {
            if (result) {
                const marker = createMarker(result.coordinates, result.data);
                markers.push(marker);
                marker.addTo(map);
            }
        });

        console.log(`Successfully loaded ${results.filter(r => r !== null).length} countries out of ${filteredData.length} total`);

    } catch (error) {
        console.error('Error creating markers:', error);
    } finally {
        // Hide loading indicator
        loadingElement.classList.add('hidden');
    }
}

// Geocode country name to coordinates
async function geocodeCountry(countryName) {
    // Check cache first
    if (geocodingCache.has(countryName)) {
        return geocodingCache.get(countryName);
    }

    // Check local coordinate database first
    if (countryCoordinates[countryName]) {
        const coordinates = countryCoordinates[countryName];
        geocodingCache.set(countryName, coordinates);
        return coordinates;
    }

    // If not in local database, try external geocoding service
    try {
        // Try multiple geocoding services as fallback
        const services = [
            `https://api.geocoding.com/v1/search?q=${encodeURIComponent(countryName)}&limit=1`,
            `https://geocode.xyz/${encodeURIComponent(countryName)}?json=1&limit=1`
        ];

        for (const serviceUrl of services) {
            try {
                const response = await fetch(serviceUrl, {
                    method: 'GET',
                    mode: 'cors',
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    let coordinates = null;

                    // Parse different response formats
                    if (data.features && data.features.length > 0) {
                        coordinates = data.features[0].geometry.coordinates.reverse();
                    } else if (data.latt && data.longt) {
                        coordinates = [parseFloat(data.latt), parseFloat(data.longt)];
                    }

                    if (coordinates && coordinates[0] !== 0 && coordinates[1] !== 0) {
                        geocodingCache.set(countryName, coordinates);
                        return coordinates;
                    }
                }
            } catch (serviceError) {
                console.warn(`Service failed for ${countryName}:`, serviceError);
                continue;
            }
        }

        // If all services fail, cache null result
        geocodingCache.set(countryName, null);
        return null;

    } catch (error) {
        console.warn(`All geocoding services failed for ${countryName}:`, error);
        geocodingCache.set(countryName, null);
        return null;
    }
}

// Create a marker with logarithmic scaling
function createMarker(coordinates, data) {
    // Logarithmic scaling for circle size
    const minRadius = 3;
    const maxRadius = 50;
    const logMin = Math.log(1);
    const logMax = Math.log(2000000);
    const logValue = Math.log(Math.max(1, data.capacity));

    const radius = minRadius + (maxRadius - minRadius) * (logValue - logMin) / (logMax - logMin);

    // Color based on capacity ranges
    let color;
    if (data.capacity < 1000) {
        color = 'rgba(255, 99, 132, 0.7)';
    } else if (data.capacity < 10000) {
        color = 'rgba(54, 162, 235, 0.7)';
    } else if (data.capacity < 100000) {
        color = 'rgba(255, 205, 86, 0.7)';
    } else {
        color = 'rgba(75, 192, 192, 0.7)';
    }

    const circle = L.circleMarker(coordinates, {
        radius: radius,
        fillColor: color,
        color: '#333',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    });

    // Create popup content
    const popupContent = `
        <div class="country-popup">
            <h3>${data.country}</h3>
            <p><strong>Technology:</strong> ${data.technology}</p>
            <p><strong>Data Type:</strong> ${data.dataType}</p>
            <p><strong>Year:</strong> ${data.year}</p>
            <p class="capacity"><strong>Capacity:</strong> ${formatNumber(data.capacity)} MW</p>
        </div>
    `;

    circle.bindPopup(popupContent);

    // Hover effects
    circle.on('mouseover', function() {
        this.setStyle({
            fillOpacity: 1,
            weight: 2
        });
    });

    circle.on('mouseout', function() {
        this.setStyle({
            fillOpacity: 0.8,
            weight: 1
        });
    });

    return circle;
}

// Format number with commas
function formatNumber(num) {
    return num.toLocaleString();
}

// Update statistics
function updateStats() {
    const minCapacity = parseFloat(document.getElementById('minCapacity').value);
    const maxCapacity = parseFloat(document.getElementById('maxCapacity').value);

    const filteredData = energyData.filter(data =>
        data.capacity >= minCapacity && data.capacity <= maxCapacity
    );

    const totalCountries = filteredData.length;
    const totalCapacity = filteredData.reduce((sum, data) => sum + data.capacity, 0);
    const avgCapacity = totalCountries > 0 ? totalCapacity / totalCountries : 0;

    document.getElementById('totalCountries').textContent = totalCountries;
    document.getElementById('totalCapacity').textContent = `${formatNumber(Math.round(totalCapacity))} MW`;
    document.getElementById('avgCapacity').textContent = `${formatNumber(Math.round(avgCapacity))} MW`;
}

// Setup control event listeners
function setupControls() {
    const minSlider = document.getElementById('minCapacity');
    const maxSlider = document.getElementById('maxCapacity');
    const minValue = document.getElementById('minCapacityValue');
    const maxValue = document.getElementById('maxCapacityValue');

    // Update display values
    minSlider.addEventListener('input', function() {
        minValue.textContent = formatNumber(parseInt(this.value));
        if (parseInt(this.value) > parseInt(maxSlider.value)) {
            maxSlider.value = this.value;
            maxValue.textContent = formatNumber(parseInt(this.value));
        }
    });

    maxSlider.addEventListener('input', function() {
        maxValue.textContent = formatNumber(parseInt(this.value));
        if (parseInt(this.value) < parseInt(minSlider.value)) {
            minSlider.value = this.value;
            minValue.textContent = formatNumber(parseInt(this.value));
        }
    });

    // Debounced update of markers
    let updateTimeout;
    function debouncedUpdate() {
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
            createMarkers();
            updateStats();
        }, 300);
    }

    minSlider.addEventListener('change', debouncedUpdate);
    maxSlider.addEventListener('change', debouncedUpdate);
}