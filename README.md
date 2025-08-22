# Smart Waste Management System 🗑️

A comprehensive, production-ready smart waste management dashboard with real-time monitoring, route optimization, and deployment capabilities across multiple cloud platforms.

![Smart Waste Management System](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Python](https://img.shields.io/badge/Python-3.8%2B-blue)
![Flask](https://img.shields.io/badge/Flask-3.1.2-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 🚀 Features

### Dashboard & Visualization
- **Real-time Statistics**: Critical, warning, and good bin counts with average fill levels
- **Interactive Map**: Leaflet.js integration with color-coded bin markers
- **Status Filtering**: Filter bins by status (all, critical, warning, good)
- **Responsive Design**: Mobile-first approach with modern CSS Grid and Flexbox

### Bin Management
- **Add Bins**: Click-to-place interface with form validation
- **Delete Bins**: Remove bins with confirmation dialog
- **Status Tracking**: Automatic status calculation based on fill levels
- **Real-time Updates**: Automatic refresh every 30 seconds

### Maintenance System
- **Schedule Pickups**: One-click maintenance scheduling
- **Maintenance Requests**: Track pickup requests and completion
- **Status Management**: Pending, in-progress, and completed status tracking

### Technical Features
- **SQLite Database**: Persistent data storage with proper schema
- **RESTful API**: Complete CRUD operations for bins and maintenance
- **Error Handling**: Graceful fallbacks and user notifications
- **Health Monitoring**: Built-in health check endpoints

## 🛠️ Technology Stack

### Backend
- **Python 3.8+** - Modern Python with type hints
- **Flask 3.1.2** - Lightweight web framework
- **SQLite** - Embedded database for simplicity
- **Flask-CORS** - Cross-origin resource sharing
- **Gunicorn** - Production WSGI server

### Frontend
- **HTML5 & CSS3** - Modern web standards
- **JavaScript ES6+** - Modern JavaScript features
- **Leaflet.js** - Interactive maps
- **Font Awesome 6.0** - Icons and UI elements
- **Inter Font** - Modern typography

### Deployment
- **Docker** - Containerization support
- **Nginx** - Reverse proxy configuration
- **Multiple Platforms** - Vercel, Railway, Heroku ready

## 📸 Screenshots

### Main Dashboard
![Dashboard Overview](docs/dashboard-overview.png)

### Interactive Map
![Interactive Map](docs/interactive-map.png)

### Bin Management
![Bin Management](docs/bin-management.png)

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/Anamitra-Sarkar/smart-waste-management.git
   cd smart-waste-management
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application**
   ```bash
   python app.py
   ```

4. **Open your browser**
   Navigate to `http://localhost:5000`

### Using Docker

1. **Build the image**
   ```bash
   docker build -t smart-waste-management .
   ```

2. **Run the container**
   ```bash
   docker run -p 5000:5000 smart-waste-management
   ```

### Using Docker Compose

1. **Start all services**
   ```bash
   docker-compose up -d
   ```

This will start the application with Nginx reverse proxy on port 80.

## 🌐 Cloud Deployment

### Deploy to Vercel

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

### Deploy to Railway

1. **Connect your GitHub repository to Railway**
2. **Railway will automatically detect the configuration from `railway.toml`**
3. **Deploy with one click**

### Deploy to Heroku

1. **Install Heroku CLI**
2. **Create a new Heroku app**
   ```bash
   heroku create your-app-name
   ```

3. **Deploy**
   ```bash
   git push heroku main
   ```

### Deploy to DigitalOcean App Platform

1. **Connect your GitHub repository**
2. **Use the following build settings:**
   - **Build Command**: `pip install -r requirements.txt`
   - **Run Command**: `gunicorn --bind 0.0.0.0:$PORT app:app`

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FLASK_ENV` | Flask environment | `development` |
| `PORT` | Application port | `5000` |
| `DATABASE_URL` | Database connection string | `sqlite:///smart_waste.db` |

### Database Schema

#### Bins Table
```sql
CREATE TABLE bins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 100,
    currentLevel INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'good',
    lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Maintenance Requests Table
```sql
CREATE TABLE maintenance_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bin_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    scheduled_date TIMESTAMP,
    completed_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bin_id) REFERENCES bins (id)
);
```

## 📚 API Documentation

### Bins API

#### Get All Bins
```http
GET /api/bins
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Central Park Bin 1",
    "lat": 28.6139,
    "lng": 77.2090,
    "capacity": 100,
    "currentLevel": 85,
    "status": "critical",
    "lastUpdated": "2024-01-15T10:30:00Z"
  }
]
```

#### Add New Bin
```http
POST /api/bins
Content-Type: application/json

{
  "name": "New Bin",
  "lat": 28.6139,
  "lng": 77.2090,
  "capacity": 100,
  "currentLevel": 0
}
```

#### Delete Bin
```http
DELETE /api/bins/{id}
```

#### Schedule Maintenance
```http
POST /api/bins/{id}/maintenance
Content-Type: application/json

{
  "type": "pickup",
  "notes": "Scheduled via dashboard"
}
```

### Statistics API

#### Get Dashboard Statistics
```http
GET /api/statistics
```

**Response:**
```json
{
  "total": 5,
  "critical": 1,
  "warning": 2,
  "good": 2,
  "averageLevel": 58.4,
  "pendingMaintenance": 3
}
```

### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "bins_count": 5
}
```

## 🎨 Customization

### Color Scheme
The application uses CSS custom properties for easy theming:

```css
:root {
    --primary-color: #2c5282;
    --success-color: #38a169;
    --warning-color: #ed8936;
    --danger-color: #e53e3e;
    --background-color: #f7fafc;
}
```

### Map Configuration
Modify the map settings in `/static/js/app.js`:

```javascript
this.map = L.map('map').setView([28.6139, 77.2090], 12);
```

## 🧪 Testing

### Run Tests
```bash
python -m pytest tests/
```

### Manual Testing
1. **Add a new bin** - Click "Add New Bin" and test the form
2. **Schedule maintenance** - Click on a bin marker and schedule pickup
3. **Filter bins** - Test the status filter buttons
4. **Responsive design** - Test on mobile devices

## 📊 Performance

### Optimization Features
- **Lazy loading** - Images and non-critical resources
- **Caching** - Static assets cached for 1 year
- **Compression** - Gzip compression enabled
- **CDN ready** - Static assets can be served from CDN

### Monitoring
- **Health checks** - Built-in health monitoring
- **Error logging** - Comprehensive error tracking
- **Performance metrics** - Request timing and statistics

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

#### Database Connection Error
```bash
# Reset the database
rm smart_waste.db
python app.py
```

#### Port Already in Use
```bash
# Find and kill the process
lsof -ti:5000 | xargs kill -9
```

#### Docker Build Issues
```bash
# Clean Docker cache
docker system prune -a
```

### Getting Help

- **GitHub Issues**: [Report bugs or request features](https://github.com/Anamitra-Sarkar/smart-waste-management/issues)
- **Documentation**: Check the API documentation above
- **Community**: Join our Discord server for real-time help

## 🌟 Acknowledgments

- **OpenStreetMap** - Map tiles and data
- **Leaflet.js** - Interactive mapping library
- **Font Awesome** - Icon library
- **Flask Community** - Web framework and ecosystem

---

**Made with ❤️ for smart cities and sustainable waste management**

![Deployment Status](https://img.shields.io/badge/Deployment-Multi--Platform-blue)
![API Status](https://img.shields.io/badge/API-RESTful-green)
![Mobile](https://img.shields.io/badge/Mobile-Responsive-orange)