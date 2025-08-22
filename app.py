# backend/app.py
from flask import Flask, jsonify
from flask_cors import CORS
import random
import requests
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initial setup
app = Flask(__name__)
CORS(app, origins=["http://127.0.0.1:5500", "http://localhost:5500", "http://127.0.0.1:3000", "http://localhost:3000"])

# --- EXPANDED DATA SIMULATION ---
# We are now simulating 50 bins across major cities in West Bengal.
# Each city is defined by a bounding box (min_lat, max_lat, min_lon, max_lon).

city_bounds = {
    "Kolkata": (22.50, 22.65, 88.30, 88.45),
    "Asansol": (23.65, 23.75, 86.90, 87.00),
    "Siliguri": (26.65, 26.75, 88.35, 88.45),
    "Durgapur": (23.45, 23.55, 87.25, 87.35),
    "Kharagpur": (22.30, 22.40, 87.25, 87.35)
}

smart_bins = []
bin_id_counter = 1

def initialize_bins():
    """Initialize the smart bins data"""
    global smart_bins, bin_id_counter
    smart_bins = []
    bin_id_counter = 1
    
    for city, bounds in city_bounds.items():
        for i in range(10):  # 10 bins per city
            lat = round(random.uniform(bounds[0], bounds[1]), 4)
            lon = round(random.uniform(bounds[2], bounds[3]), 4)
            smart_bins.append({
                "id": bin_id_counter,
                "city": city,
                "lat": lat,
                "lon": lon,
                "fill_level": random.randint(10, 100)
            })
            bin_id_counter += 1

# Initialize bins on startup
initialize_bins()

# --- API ENDPOINTS ---

@app.route('/api/bins', methods=['GET'])
def get_all_bins():
    """Simulates the dynamic nature of bin fill levels."""
    try:
        # Simulate dynamic fill level changes
        for bin_item in smart_bins:
            if random.random() < 0.3:  # 30% chance to change
                change = random.randint(-5, 15)  # Can decrease or increase
                bin_item['fill_level'] = max(10, min(100, bin_item['fill_level'] + change))
        
        logger.info(f"Returning {len(smart_bins)} bins")
        return jsonify(smart_bins)
    except Exception as e:
        logger.error(f"Error in get_all_bins: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/route', methods=['GET'])
def get_optimized_route():
    """Calculates a real, drivable route for full bins using OSRM."""
    try:
        collection_threshold = 80
        full_bins = sorted([b for b in smart_bins if b['fill_level'] > collection_threshold], key=lambda b: b['id'])

        logger.info(f"Found {len(full_bins)} bins needing collection")

        if len(full_bins) < 2:
            return jsonify({"bins": full_bins, "route_geometry": []})

        coordinates = ";".join([f"{b['lon']},{b['lat']}" for b in full_bins])
        osrm_url = f"http://router.project-osrm.org/route/v1/driving/{coordinates}?overview=full&geometries=geojson"
        
        try:
            response = requests.get(osrm_url, timeout=10)
            response.raise_for_status()
            route_data = response.json()
            
            if 'routes' in route_data and len(route_data['routes']) > 0:
                route_geometry = [[coord[1], coord[0]] for coord in route_data['routes'][0]['geometry']['coordinates']]
                logger.info("Successfully generated route using OSRM")
                return jsonify({"bins": full_bins, "route_geometry": route_geometry})
            else:
                raise ValueError("No routes found in OSRM response")

        except (requests.exceptions.RequestException, ValueError) as e:
            logger.warning(f"OSRM API error: {e}, using fallback route")
            # Fallback: simple straight lines between points
            fallback_geometry = [[b['lat'], b['lon']] for b in full_bins]
            return jsonify({"bins": full_bins, "route_geometry": fallback_geometry})

    except Exception as e:
        logger.error(f"Error in get_optimized_route: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/heatmap', methods=['GET'])
def get_heatmap_data():
    """Provides data formatted for the heatmap layer."""
    try:
        heatmap_data = [[b['lat'], b['lon'], b['fill_level'] / 100.0] for b in smart_bins]
        logger.info(f"Returning heatmap data for {len(heatmap_data)} points")
        return jsonify(heatmap_data)
    except Exception as e:
        logger.error(f"Error in get_heatmap_data: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "bins_count": len(smart_bins)})

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    logger.info("Starting WB Smart Waste Dashboard API server...")
    logger.info(f"Initialized with {len(smart_bins)} smart bins")
    app.run(debug=True, host='127.0.0.1', port=5000)
