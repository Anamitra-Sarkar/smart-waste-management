# backend/app.py
from flask import Flask, jsonify, request, render_template_string
from flask_cors import CORS
import random
import requests
import logging
import sqlite3
import os
from datetime import datetime, timedelta

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initial setup
app = Flask(__name__, static_folder='static', static_url_path='/static')
CORS(app, origins=["*"])  # Allow all origins for deployment flexibility

# Database setup
DATABASE = 'smart_waste.db'

def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    """Initialize the database with tables"""
    conn = get_db_connection()
    
    # Create bins table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS bins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            city TEXT NOT NULL,
            lat REAL NOT NULL,
            lon REAL NOT NULL,
            fill_level INTEGER DEFAULT 0,
            status TEXT DEFAULT 'good',
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create maintenance requests table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS maintenance_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bin_id INTEGER NOT NULL,
            request_type TEXT DEFAULT 'collection',
            status TEXT DEFAULT 'pending',
            requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            scheduled_at TIMESTAMP,
            completed_at TIMESTAMP,
            FOREIGN KEY (bin_id) REFERENCES bins (id)
        )
    ''')
    
    conn.commit()
    conn.close()

# Initialize database
init_database()

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
    
    # Check if database already has bins
    conn = get_db_connection()
    existing_bins = conn.execute('SELECT COUNT(*) as count FROM bins').fetchone()
    
    if existing_bins['count'] > 0:
        # Load from database
        bins_data = conn.execute('SELECT * FROM bins').fetchall()
        smart_bins = []
        for bin_row in bins_data:
            smart_bins.append({
                "id": bin_row['id'],
                "city": bin_row['city'],
                "lat": bin_row['lat'],
                "lon": bin_row['lon'],
                "fill_level": bin_row['fill_level'],
                "status": bin_row['status']
            })
        bin_id_counter = max([b['id'] for b in smart_bins]) + 1 if smart_bins else 1
        conn.close()
        return
    
    # Initialize with sample data
    smart_bins = []
    bin_id_counter = 1
    
    # Create sample bins with diverse status levels
    sample_bins = []
    
    for city, bounds in city_bounds.items():
        for i in range(10):  # 10 bins per city
            lat = round(random.uniform(bounds[0], bounds[1]), 4)
            lon = round(random.uniform(bounds[2], bounds[3]), 4)
            
            # Create diverse fill levels for proper status distribution
            if i < 2:  # Critical bins (>90% full)
                fill_level = random.randint(91, 100)
            elif i < 5:  # Warning bins (70-90% full)
                fill_level = random.randint(70, 90)
            else:  # Good bins (<70% full)
                fill_level = random.randint(10, 69)
            
            status = 'critical' if fill_level > 90 else 'warning' if fill_level > 70 else 'good'
            
            bin_data = {
                "id": bin_id_counter,
                "city": city,
                "lat": lat,
                "lon": lon,
                "fill_level": fill_level,
                "status": status
            }
            
            # Insert into database
            conn.execute('''
                INSERT INTO bins (id, city, lat, lon, fill_level, status)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (bin_id_counter, city, lat, lon, fill_level, status))
            
            sample_bins.append(bin_data)
            bin_id_counter += 1
    
    smart_bins = sample_bins
    conn.commit()
    conn.close()

# Initialize bins on startup
initialize_bins()

# --- API ENDPOINTS ---

@app.route('/')
def serve_dashboard():
    """Serve the main dashboard"""
    try:
        with open('index.html', 'r') as f:
            return f.read()
    except FileNotFoundError:
        return jsonify({"error": "Dashboard not found"}), 404

@app.route('/api/stats')
def get_stats():
    """Get system statistics"""
    try:
        conn = get_db_connection()
        
        # Get bin statistics
        total_bins = len(smart_bins)
        critical_bins = len([b for b in smart_bins if b['fill_level'] > 90])
        warning_bins = len([b for b in smart_bins if 70 < b['fill_level'] <= 90])
        good_bins = len([b for b in smart_bins if b['fill_level'] <= 70])
        
        # Calculate average fill level
        avg_fill = sum(b['fill_level'] for b in smart_bins) / total_bins if total_bins > 0 else 0
        
        # Get maintenance statistics
        pending_maintenance = conn.execute(
            'SELECT COUNT(*) as count FROM maintenance_requests WHERE status = "pending"'
        ).fetchone()['count']
        
        completed_today = conn.execute(
            'SELECT COUNT(*) as count FROM maintenance_requests WHERE status = "completed" AND DATE(completed_at) = DATE("now")'
        ).fetchone()['count']
        
        stats = {
            "total_bins": total_bins,
            "critical_bins": critical_bins,
            "warning_bins": warning_bins,
            "good_bins": good_bins,
            "avg_fill_level": round(avg_fill, 1),
            "pending_maintenance": pending_maintenance,
            "completed_today": completed_today
        }
        
        conn.close()
        return jsonify(stats)
    except Exception as e:
        logger.error(f"Error in get_stats: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/bins', methods=['POST'])
def add_bin():
    """Add a new bin"""
    try:
        data = request.get_json()
        
        if not data or 'city' not in data or 'lat' not in data or 'lon' not in data:
            return jsonify({"error": "Missing required fields: city, lat, lon"}), 400
        
        global bin_id_counter
        
        bin_data = {
            "id": bin_id_counter,
            "city": data['city'],
            "lat": float(data['lat']),
            "lon": float(data['lon']),
            "fill_level": data.get('fill_level', 0),
            "status": 'good'
        }
        
        # Update status based on fill level
        if bin_data['fill_level'] > 90:
            bin_data['status'] = 'critical'
        elif bin_data['fill_level'] > 70:
            bin_data['status'] = 'warning'
        
        # Add to database
        conn = get_db_connection()
        conn.execute('''
            INSERT INTO bins (id, city, lat, lon, fill_level, status)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (bin_data['id'], bin_data['city'], bin_data['lat'], bin_data['lon'], 
              bin_data['fill_level'], bin_data['status']))
        conn.commit()
        conn.close()
        
        # Add to memory
        smart_bins.append(bin_data)
        bin_id_counter += 1
        
        logger.info(f"Added new bin with ID {bin_data['id']}")
        return jsonify(bin_data), 201
        
    except Exception as e:
        logger.error(f"Error in add_bin: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/bins/<int:bin_id>', methods=['DELETE'])
def delete_bin(bin_id):
    """Delete a bin"""
    try:
        global smart_bins
        
        # Check if bin exists
        bin_to_delete = next((b for b in smart_bins if b['id'] == bin_id), None)
        if not bin_to_delete:
            return jsonify({"error": "Bin not found"}), 404
        
        # Remove from database
        conn = get_db_connection()
        conn.execute('DELETE FROM bins WHERE id = ?', (bin_id,))
        conn.execute('DELETE FROM maintenance_requests WHERE bin_id = ?', (bin_id,))
        conn.commit()
        conn.close()
        
        # Remove from memory
        smart_bins = [b for b in smart_bins if b['id'] != bin_id]
        
        logger.info(f"Deleted bin with ID {bin_id}")
        return jsonify({"message": "Bin deleted successfully"}), 200
        
    except Exception as e:
        logger.error(f"Error in delete_bin: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/bins/<int:bin_id>/maintenance', methods=['POST'])
def schedule_maintenance(bin_id):
    """Schedule maintenance for a bin"""
    try:
        data = request.get_json() or {}
        
        # Check if bin exists
        bin_exists = any(b['id'] == bin_id for b in smart_bins)
        if not bin_exists:
            return jsonify({"error": "Bin not found"}), 404
        
        request_type = data.get('type', 'collection')
        scheduled_time = data.get('scheduled_at')
        
        conn = get_db_connection()
        
        # Insert maintenance request
        cursor = conn.execute('''
            INSERT INTO maintenance_requests (bin_id, request_type, scheduled_at)
            VALUES (?, ?, ?)
        ''', (bin_id, request_type, scheduled_time))
        
        maintenance_id = cursor.lastrowid
        conn.commit()
        
        # Get the created maintenance request
        maintenance = conn.execute('''
            SELECT * FROM maintenance_requests WHERE id = ?
        ''', (maintenance_id,)).fetchone()
        
        conn.close()
        
        maintenance_data = {
            "id": maintenance['id'],
            "bin_id": maintenance['bin_id'],
            "request_type": maintenance['request_type'],
            "status": maintenance['status'],
            "requested_at": maintenance['requested_at'],
            "scheduled_at": maintenance['scheduled_at']
        }
        
        logger.info(f"Scheduled maintenance for bin {bin_id}")
        return jsonify(maintenance_data), 201
        
    except Exception as e:
        logger.error(f"Error in schedule_maintenance: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/maintenance')
def get_maintenance_requests():
    """Get all maintenance requests"""
    try:
        conn = get_db_connection()
        maintenance_requests = conn.execute('''
            SELECT m.*, b.city, b.lat, b.lon 
            FROM maintenance_requests m
            JOIN bins b ON m.bin_id = b.id
            ORDER BY m.requested_at DESC
        ''').fetchall()
        
        requests_data = []
        for req in maintenance_requests:
            requests_data.append({
                "id": req['id'],
                "bin_id": req['bin_id'],
                "city": req['city'],
                "lat": req['lat'],
                "lon": req['lon'],
                "request_type": req['request_type'],
                "status": req['status'],
                "requested_at": req['requested_at'],
                "scheduled_at": req['scheduled_at'],
                "completed_at": req['completed_at']
            })
        
        conn.close()
        return jsonify(requests_data)
        
    except Exception as e:
        logger.error(f"Error in get_maintenance_requests: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/api/bins', methods=['GET'])
def get_all_bins():
    """Simulates the dynamic nature of bin fill levels."""
    try:
        # Simulate dynamic fill level changes
        conn = get_db_connection()
        
        for bin_item in smart_bins:
            if random.random() < 0.3:  # 30% chance to change
                change = random.randint(-5, 15)  # Can decrease or increase
                new_fill_level = max(10, min(100, bin_item['fill_level'] + change))
                
                # Update status based on fill level
                if new_fill_level > 90:
                    new_status = 'critical'
                elif new_fill_level > 70:
                    new_status = 'warning'
                else:
                    new_status = 'good'
                
                bin_item['fill_level'] = new_fill_level
                bin_item['status'] = new_status
                
                # Update database
                conn.execute('''
                    UPDATE bins SET fill_level = ?, status = ?, last_updated = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (new_fill_level, new_status, bin_item['id']))
        
        conn.commit()
        conn.close()
        
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
    # Get port from environment variable or default to 5000
    port = int(os.environ.get('PORT', 5000))
    # Get host from environment variable or default to 127.0.0.1
    host = os.environ.get('HOST', '127.0.0.1')
    # Get debug mode from environment variable
    debug = os.environ.get('FLASK_DEBUG', 'true').lower() == 'true'
    
    logger.info("Starting Smart Waste Management Dashboard API server...")
    logger.info(f"Initialized with {len(smart_bins)} smart bins")
    logger.info(f"Running on {host}:{port} (debug={debug})")
    
    app.run(debug=debug, host=host, port=port)
