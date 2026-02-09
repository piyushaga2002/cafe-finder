class CafeFinder {
    constructor() {
        this.map = null;
        this.service = null;
        this.infowindow = null;
        this.markers = [];
        this.userLocation = null;
        this.currentLocationMarker = null;

        // DOM Elements
        this.locationInput = document.getElementById('location-input');
        this.currentLocationBtn = document.getElementById('current-location-btn');
        this.findCafesBtn = document.getElementById('find-cafes-btn');
        this.clearBtn = document.getElementById('clear-btn');
        this.radiusSelect = document.getElementById('radius');
        this.cafeList = document.getElementById('cafe-list');
        this.resultsCount = document.getElementById('results-count');
        this.recenterMapBtn = document.getElementById('recenter-map');
        this.cafeDetailsModal = document.getElementById('cafe-details');
        this.cafeDetailsContent = document.getElementById('cafe-details-content');

        this.init();
    }

    init() {
        if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
            console.warn('Google Maps API not loaded. Operating in Demo Mode.');
            this.enableDemoMode();
            return;
        }

        this.initMap();
        this.bindEvents();
        this.getUserLocation();
    }

    initMap() {
        // Default to London if location not available
        const defaultLocation = { lat: 51.5074, lng: -0.1278 };

        this.map = new google.maps.Map(document.getElementById('map'), {
            center: defaultLocation,
            zoom: 14,
            styles: [
                {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                }
            ]
        });

        this.service = new google.maps.places.PlacesService(this.map);
        this.infowindow = new google.maps.InfoWindow();
    }

    bindEvents() {
        this.findCafesBtn.addEventListener('click', () => this.searchCafes());
        this.clearBtn.addEventListener('click', () => this.clearResults());
        this.currentLocationBtn.addEventListener('click', () => this.useCurrentLocation());
        this.recenterMapBtn.addEventListener('click', () => this.recenterMap());

        this.locationInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchCafes();
        });

        // Close modal when clicking X or outside
        document.querySelector('.close-modal').addEventListener('click', () => {
            this.cafeDetailsModal.classList.remove('active');
        });

        this.cafeDetailsModal.addEventListener('click', (e) => {
            if (e.target === this.cafeDetailsModal) {
                this.cafeDetailsModal.classList.remove('active');
            }
        });
    }

    getUserLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    this.map.setCenter(this.userLocation);
                    this.addCurrentLocationMarker();
                    this.locationInput.value = "Current Location";
                },
                (error) => {
                    console.error("Error getting location:", error);
                    this.locationInput.placeholder = "Enter a location (e.g., New York)";
                }
            );
        }
    }

    useCurrentLocation() {
        if (this.userLocation) {
            this.map.setCenter(this.userLocation);
            this.addCurrentLocationMarker();
            this.locationInput.value = "Current Location";
        } else {
            this.getUserLocation();
        }
    }

    addCurrentLocationMarker() {
        if (this.currentLocationMarker) {
            this.currentLocationMarker.setMap(null);
        }

        this.currentLocationMarker = new google.maps.Marker({
            position: this.userLocation,
            map: this.map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#4285F4',
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 2
            },
            title: "Your Location"
        });
    }

    async searchCafes() {
        const location = await this.getSearchLocation();
        if (!location) return;

        const radius = parseInt(this.radiusSelect.value);

        const request = {
            location: location,
            radius: radius,
            type: ['cafe', 'coffee_shop'],
            keyword: 'coffee cafe'
        };

        this.clearMarkers();

        this.service.nearbySearch(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                this.displayCafes(results, location);
            } else {
                this.showNoResults();
                alert('No cafes found in this area. Try a different location or larger radius.');
            }
        });
    }

    async getSearchLocation() {
        const input = this.locationInput.value.trim();

        if (input === "Current Location" || input === "") {
            if (this.userLocation) {
                return this.userLocation;
            } else {
                await this.getUserLocation();
                return this.userLocation;
            }
        }

        // Geocode the input location
        return new Promise((resolve) => {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ address: input }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    const location = results[0].geometry.location;
                    this.map.setCenter(location);
                    resolve({ lat: location.lat(), lng: location.lng() });
                } else {
                    alert('Location not found. Please try again.');
                    resolve(null);
                }
            });
        });
    }

    displayCafes(places, searchLocation) {
        this.cafeList.innerHTML = '';
        this.resultsCount.textContent = `(${places.length})`;

        if (places.length === 0) {
            this.showNoResults();
            return;
        }

        const bounds = new google.maps.LatLngBounds();

        places.forEach((place, index) => {
            if (!place.geometry || !place.geometry.location) return;

            const distance = this.calculateDistance(
                searchLocation.lat, searchLocation.lng,
                place.geometry.location.lat(), place.geometry.location.lng()
            );

            // Create marker
            const marker = new google.maps.Marker({
                position: place.geometry.location,
                map: this.map,
                title: place.name,
                icon: {
                    url: 'http://maps.google.com/mapfiles/ms/icons/coffee.png',
                    scaledSize: new google.maps.Size(40, 40)
                }
            });

            this.markers.push(marker);

            // Add click event to marker
            marker.addListener('click', () => {
                this.showPlaceDetails(place);
            });

            // Extend bounds to include this marker
            bounds.extend(place.geometry.location);

            // Create cafe list item
            const cafeElement = this.createCafeElement(place, distance, index);
            this.cafeList.appendChild(cafeElement);
        });

        // Fit map to show all markers with padding
        this.map.fitBounds(bounds);
        if (places.length === 1) {
            this.map.setZoom(16);
        }

        // Add search location to bounds if we have it
        if (searchLocation) {
            bounds.extend(searchLocation);
            this.map.fitBounds(bounds);
        }
    }

    createCafeElement(place, distance, index) {
        const div = document.createElement('div');
        div.className = 'cafe-item';
        div.dataset.index = index;

        const rating = place.rating ? place.rating.toFixed(1) : 'N/A';
        const ratingStars = place.rating ? '★'.repeat(Math.floor(place.rating)) : '';

        div.innerHTML = `
            <div class="cafe-name">
                ${place.name}
                <span class="cafe-rating">
                    <i class="fas fa-star"></i> ${rating}
                </span>
            </div>
            <div class="cafe-address">
                <i class="fas fa-map-marker-alt"></i>
                ${place.vicinity || 'Address not available'}
            </div>
            <div class="cafe-distance">
                ${distance.toFixed(2)} km away
                ${place.opening_hours && place.opening_hours.open_now ?
                '<span style="color: #4CAF50; margin-left: 10px;"><i class="fas fa-door-open"></i> Open Now</span>' :
                place.opening_hours ? '<span style="color: #F44336;"><i class="fas fa-door-closed"></i> Closed</span>' : ''}
            </div>
        `;

        div.addEventListener('click', () => {
            this.showPlaceDetails(place);
            this.highlightMarker(index);
        });

        return div;
    }

    showPlaceDetails(place) {
        // Get additional place details
        this.service.getDetails({
            placeId: place.place_id,
            fields: ['name', 'formatted_address', 'formatted_phone_number',
                'website', 'rating', 'reviews', 'opening_hours', 'photos']
        }, (placeDetails, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                this.displayPlaceDetails(placeDetails);
            }
        });
    }

    displayPlaceDetails(place) {
        const hours = place.opening_hours ?
            place.opening_hours.weekday_text.map(day => `<div>${day}</div>`).join('') :
            'Hours not available';

        const reviews = place.reviews ?
            place.reviews.slice(0, 3).map(review => `
                <div class="review">
                    <div class="review-author">${review.author_name}</div>
                    <div class="review-rating">${'★'.repeat(review.rating)}</div>
                    <div class="review-text">${review.text}</div>
                </div>
            `).join('') : 'No reviews yet';

        const photo = place.photos && place.photos.length > 0 ?
            `<img src="${place.photos[0].getUrl({ maxWidth: 400 })}" alt="${place.name}" style="width:100%; border-radius:8px; margin-bottom:1rem;">` : '';

        this.cafeDetailsContent.innerHTML = `
            ${photo}
            <h2>${place.name}</h2>
            <div class="detail-item">
                <i class="fas fa-map-marker-alt"></i>
                <span>${place.formatted_address || 'Address not available'}</span>
            </div>
            ${place.formatted_phone_number ? `
                <div class="detail-item">
                    <i class="fas fa-phone"></i>
                    <span>${place.formatted_phone_number}</span>
                </div>
            ` : ''}
            ${place.rating ? `
                <div class="detail-item">
                    <i class="fas fa-star"></i>
                    <span>${place.rating.toFixed(1)} (${place.user_ratings_total || '?'} reviews)</span>
                </div>
            ` : ''}
            <div class="detail-item">
                <i class="fas fa-clock"></i>
                <div>
                    <strong>Opening Hours:</strong>
                    ${hours}
                </div>
            </div>
            ${place.website ? `
                <div class="detail-item">
                    <i class="fas fa-globe"></i>
                    <a href="${place.website}" target="_blank">Visit Website</a>
                </div>
            ` : ''}
            <div class="reviews-section">
                <h3><i class="fas fa-comments"></i> Recent Reviews</h3>
                ${reviews}
            </div>
        `;

        this.cafeDetailsModal.classList.add('active');
    }

    highlightMarker(index) {
        this.markers.forEach((marker, i) => {
            if (i === parseInt(index)) {
                marker.setAnimation(google.maps.Animation.BOUNCE);
                setTimeout(() => marker.setAnimation(null), 1500);
                this.map.panTo(marker.getPosition());
                this.map.setZoom(16);
            }
        });
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    toRad(value) {
        return value * Math.PI / 180;
    }

    clearMarkers() {
        this.markers.forEach(marker => marker.setMap(null));
        this.markers = [];
    }

    clearResults() {
        this.clearMarkers();
        this.cafeList.innerHTML = `
            <div class="no-results">
                <i class="fas fa-coffee"></i>
                <p>Search for cafes to see results here</p>
            </div>
        `;
        this.resultsCount.textContent = '(0)';
        this.locationInput.value = '';
    }

    showNoResults() {
        this.cafeList.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>No cafes found in this area. Try a different location or larger radius.</p>
            </div>
        `;
        this.resultsCount.textContent = '(0)';
    }

    recenterMap() {
        if (this.userLocation) {
            this.map.setCenter(this.userLocation);
            this.map.setZoom(14);
        }
    }

    enableDemoMode() {
        // Show demo message in map container
        const mapContainer = document.getElementById('map');
        mapContainer.innerHTML = `
            <div style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f0f0f0; padding:20px; text-align:center;">
                <i class="fas fa-map-marked-alt" style="font-size:3rem; color:#6f4e37; margin-bottom:15px;"></i>
                <h3 style="margin-bottom:10px;">Demo Mode (No API Key)</h3>
                <p style="color:#666; max-width:400px;">
                    Google Maps requires an API key to function. 
                    <br>We've loaded some sample data so you can check out the design!
                </p>
            </div>
        `;

        // Mock data
        const demoCafes = [
            {
                name: "The Roasted Bean",
                vicinity: "123 Coffee Lane, Brewtown",
                rating: 4.8,
                user_ratings_total: 1250,
                opening_hours: { open_now: true }
            },
            {
                name: "Espresso Express",
                vicinity: "45 Aroma Ave, Cappuccino City",
                rating: 4.5,
                user_ratings_total: 890,
                opening_hours: { open_now: true }
            },
            {
                name: "Late Night Latte",
                vicinity: "789 Midnight St, Insomnia",
                rating: 4.2,
                user_ratings_total: 450,
                opening_hours: { open_now: false }
            },
            {
                name: "Morning Dew Cafe",
                vicinity: "101 Sunrise Blvd, Early Bird",
                rating: 4.9,
                user_ratings_total: 2100,
                opening_hours: { open_now: true }
            },
            {
                name: "Java Jive",
                vicinity: "555 Swing Street, Jazzville",
                rating: 4.6,
                user_ratings_total: 670,
                opening_hours: { open_now: true }
            }
        ];

        // Render mock data
        this.cafeList.innerHTML = '';
        this.resultsCount.textContent = `(${demoCafes.length})`;

        demoCafes.forEach((place, index) => {
            const distance = (Math.random() * 2) + 0.1; // Random distance

            // Create modified cafe element without map dependency
            const div = document.createElement('div');
            div.className = 'cafe-item';
            div.dataset.index = index;

            const rating = place.rating.toFixed(1);

            div.innerHTML = `
                <div class="cafe-name">
                    ${place.name}
                    <span class="cafe-rating">
                        <i class="fas fa-star"></i> ${rating}
                    </span>
                </div>
                <div class="cafe-address">
                    <i class="fas fa-map-marker-alt"></i>
                    ${place.vicinity}
                </div>
                <div class="cafe-distance">
                    ${distance.toFixed(2)} km away
                    ${place.opening_hours.open_now ?
                    '<span style="color: #4CAF50; margin-left: 10px;"><i class="fas fa-door-open"></i> Open Now</span>' :
                    '<span style="color: #F44336;"><i class="fas fa-door-closed"></i> Closed</span>'}
                </div>
            `;

            div.addEventListener('click', () => {
                alert(`You clicked on ${place.name}! In full mode, this would show details and highlight the map marker.`);
            });

            this.cafeList.appendChild(div);
        });

        // Disable search inputs
        this.locationInput.value = "Demo Location";
        this.locationInput.disabled = true;
        this.findCafesBtn.disabled = true;
        this.findCafesBtn.innerHTML = '<i class="fas fa-lock"></i> Demo Mode';
        this.findCafesBtn.style.opacity = "0.7";
        this.currentLocationBtn.disabled = true;
    }
}

// Initialize the app when the page loads
// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Replace with your actual Google Maps API key
    if (!document.querySelector('script[src*="maps.googleapis.com"]').src.includes('key=')) {
        alert('Please add your Google Maps API key to the script tag in index.html');
        return;
    }

    // Global function to catch Google Maps Authentication errors
    window.gm_authFailure = function () {
        console.warn('Google Maps Authentication Failed. Switching to Demo Mode.');
        if (window.cafeFinderApp) {
            window.cafeFinderApp.enableDemoMode();
        }
    };

    window.cafeFinderApp = new CafeFinder();
});