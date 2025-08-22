#!/usr/bin/env python3
"""
Smart Waste Management System - Flask Backend
Complete deployment-ready waste management application with SQLite database
"""

from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
import sqlite3
import os
import logging
from datetime import datetime, timedelta
import json

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__, static_folder='static', template_folder='.')
CORS(app)

# Database configuration
DATABASE = 'smart_waste.db'

def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    """Initialize database with tables and sample data"""
    conn = get_db_connection()
    
    # Create bins table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS bins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            capacity INTEGER NOT NULL DEFAULT 100,
            currentLevel INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'good',
            lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create maintenance_requests table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS maintenance_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bin_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            scheduled_date TIMESTAMP,
            completed_date TIMESTAMP,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bin_id) REFERENCES bins (id)
        )
    ''')
    
    # Check if we have sample data
    bins_count = conn.execute('SELECT COUNT(*) FROM bins').fetchone()[0]
    
    if bins_count == 0:
        # Insert sample data
        sample_bins = [
            ("Central Park Bin 1", 28.6139, 77.2090, 100, 85, "critical"),
            ("Downtown Plaza Bin", 28.6129, 77.2100, 100, 65, "warning"), 
            ("Mall Complex Bin 3", 28.6149, 77.2080, 100, 35, "good"),
            ("Residential Area Bin", 28.6159, 77.2070, 100, 20, "good"),
            ("Office District Bin", 28.6119, 77.2110, 100, 75, "warning")
        ]
        
        conn.executemany('''
            INSERT INTO bins (name, lat, lng, capacity, currentLevel, status)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', sample_bins)
        
        logger.info("Sample data inserted into database")
    
    conn.commit()
    conn.close()
    logger.info("Database initialized successfully")

def update_bin_status(bin_id, current_level):
    """Update bin status based on current level"""
    if current_level >= 80:
        return "critical"
    elif current_level >= 50:
        return "warning"
    else:
        return "good"

# Initialize database on startup
init_database()

# --- API ENDPOINTS ---

@app.route('/')
def index():
    """Serve the main application"""
    return render_template('index.html')

@app.route('/api/bins', methods=['GET'])
def get_bins():
    """Get all bins with current status"""
    try:
        conn = get_db_connection()
        bins = conn.execute('''
            SELECT id, name, lat, lng, capacity, currentLevel, status, lastUpdated
            FROM bins ORDER BY id
        ''').fetchall()
        conn.close()
        
        bins_list = []
        for bin_row in bins:
            bins_list.append({
                'id': bin_row['id'],
                'name': bin_row['name'],
                'lat': bin_row['lat'],
                'lng': bin_row['lng'],
                'capacity': bin_row['capacity'],
                'currentLevel': bin_row['currentLevel'],
                'status': bin_row['status'],
                'lastUpdated': bin_row['lastUpdated']
            })
        
        logger.info(f"Returning {len(bins_list)} bins")
        return jsonify(bins_list)
        
    except Exception as e:
        logger.error(f"Error in get_bins: {e}")
        return jsonify({"error": "Failed to fetch bins"}), 500

@app.route('/api/bins', methods=['POST'])
def add_bin():
    """Add a new bin"""
    try:
        data = request.get_json()
        
        if not all(key in data for key in ['name', 'lat', 'lng']):
            return jsonify({"error": "Missing required fields"}), 400
        
        capacity = data.get('capacity', 100)
        current_level = data.get('currentLevel', 0)
        status = update_bin_status(None, current_level)
        
        conn = get_db_connection()
        cursor = conn.execute('''
            INSERT INTO bins (name, lat, lng, capacity, currentLevel, status)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (data['name'], data['lat'], data['lng'], capacity, current_level, status))
        
        bin_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        logger.info(f"Added new bin with ID: {bin_id}")
        return jsonify({"id": bin_id, "message": "Bin added successfully"}), 201
        
    except Exception as e:
        logger.error(f"Error in add_bin: {e}")
        return jsonify({"error": "Failed to add bin"}), 500

@app.route('/api/bins/<int:bin_id>', methods=['DELETE'])
def delete_bin(bin_id):
    """Delete a bin"""
    try:
        conn = get_db_connection()
        
        # Check if bin exists
        bin_exists = conn.execute('SELECT id FROM bins WHERE id = ?', (bin_id,)).fetchone()
        if not bin_exists:
            conn.close()
            return jsonify({"error": "Bin not found"}), 404
        
        # Delete associated maintenance requests first
        conn.execute('DELETE FROM maintenance_requests WHERE bin_id = ?', (bin_id,))
        
        # Delete the bin
        conn.execute('DELETE FROM bins WHERE id = ?', (bin_id,))
        conn.commit()
        conn.close()
        
        logger.info(f"Deleted bin with ID: {bin_id}")
        return jsonify({"message": "Bin deleted successfully"})
        
    except Exception as e:
        logger.error(f"Error in delete_bin: {e}")
        return jsonify({"error": "Failed to delete bin"}), 500

@app.route('/api/bins/<int:bin_id>/maintenance', methods=['POST'])
def schedule_maintenance(bin_id):
    """Schedule maintenance for a bin"""
    try:
        data = request.get_json()
        maintenance_type = data.get('type', 'pickup')
        notes = data.get('notes', '')
        
        # Schedule for next day by default
        scheduled_date = datetime.now() + timedelta(days=1)
        
        conn = get_db_connection()
        
        # Check if bin exists
        bin_exists = conn.execute('SELECT id FROM bins WHERE id = ?', (bin_id,)).fetchone()
        if not bin_exists:
            conn.close()
            return jsonify({"error": "Bin not found"}), 404
        
        # Insert maintenance request
        cursor = conn.execute('''
            INSERT INTO maintenance_requests (bin_id, type, scheduled_date, notes)
            VALUES (?, ?, ?, ?)
        ''', (bin_id, maintenance_type, scheduled_date, notes))
        
        request_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        logger.info(f"Scheduled {maintenance_type} for bin {bin_id}")
        return jsonify({
            "id": request_id,
            "message": f"Maintenance scheduled successfully",
            "scheduled_date": scheduled_date.isoformat()
        }), 201
        
    except Exception as e:
        logger.error(f"Error in schedule_maintenance: {e}")
        return jsonify({"error": "Failed to schedule maintenance"}), 500

@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    """Get dashboard statistics"""
    try:
        conn = get_db_connection()
        
        # Get bin counts by status
        stats = conn.execute('''
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'critical' THEN 1 ELSE 0 END) as critical,
                SUM(CASE WHEN status = 'warning' THEN 1 ELSE 0 END) as warning,
                SUM(CASE WHEN status = 'good' THEN 1 ELSE 0 END) as good,
                AVG(currentLevel) as average_level
            FROM bins
        ''').fetchone()
        
        # Get pending maintenance requests
        pending_maintenance = conn.execute('''
            SELECT COUNT(*) as count FROM maintenance_requests 
            WHERE status = 'pending'
        ''').fetchone()
        
        conn.close()
        
        return jsonify({
            'total': stats['total'],
            'critical': stats['critical'],
            'warning': stats['warning'],
            'good': stats['good'],
            'averageLevel': round(stats['average_level'] or 0, 1),
            'pendingMaintenance': pending_maintenance['count']
        })
        
    except Exception as e:
        logger.error(f"Error in get_statistics: {e}")
        return jsonify({"error": "Failed to fetch statistics"}), 500

@app.route('/api/maintenance', methods=['GET'])
def get_maintenance_requests():
    """Get all maintenance requests"""
    try:
        conn = get_db_connection()
        requests_data = conn.execute('''
            SELECT m.*, b.name as bin_name
            FROM maintenance_requests m
            JOIN bins b ON m.bin_id = b.id
            ORDER BY m.created_at DESC
        ''').fetchall()
        conn.close()
        
        requests_list = []
        for req in requests_data:
            requests_list.append({
                'id': req['id'],
                'bin_id': req['bin_id'],
                'bin_name': req['bin_name'],
                'type': req['type'],
                'status': req['status'],
                'scheduled_date': req['scheduled_date'],
                'completed_date': req['completed_date'],
                'notes': req['notes'],
                'created_at': req['created_at']
            })
        
        return jsonify(requests_list)
        
    except Exception as e:
        logger.error(f"Error in get_maintenance_requests: {e}")
        return jsonify({"error": "Failed to fetch maintenance requests"}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        conn = get_db_connection()
        bin_count = conn.execute('SELECT COUNT(*) FROM bins').fetchone()[0]
        conn.close()
        
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "bins_count": bin_count
        })
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({"status": "unhealthy", "error": str(e)}), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    
    logger.info("Starting Smart Waste Management API server...")
    app.run(debug=debug, host='0.0.0.0', port=port)
