# Smart Waste Management System 🗑️🌱

A comprehensive, production-ready smart waste management application with real-time monitoring, interactive mapping, and intelligent routing capabilities.

## 🚀 Features

### 📊 Interactive Dashboard
- **Real-time Monitoring**: Live updates of smart bin fill levels
- **Statistics Cards**: Critical, warning, and good bin counts with color-coded status
- **Auto-refresh**: Configurable automatic data refresh (30-second intervals)
- **Manual Refresh**: On-demand data updates

### 🗺️ Interactive Map
- **Leaflet.js Integration**: High-performance mapping with OpenStreetMap tiles
- **Color-coded Markers**: Visual status indicators (red: critical, orange: warning, green: good)
- **Multiple Views**: 
  - All bins view with detailed popups
  - Waste heatmap for density visualization
  - Optimized collection routes
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile

### 🔧 Bin Management
- **Add New Bins**: Simple form to add bins with GPS coordinates
- **Delete Bins**: Remove bins with confirmation dialog
- **Status Filtering**: Filter bins by status (critical, warning, good, all)
- **Maintenance Scheduling**: Schedule collection and maintenance requests

### 🛣️ Smart Routing
- **Optimized Routes**: Generate efficient collection routes using OSRM
- **Priority-based**: Routes prioritize bins with highest fill levels
- **Visual Route Display**: Interactive route visualization on map

### 🔍 Real-time Analytics
- **System Statistics**: Total bins, status distribution, average fill levels
- **Maintenance Tracking**: Pending and completed maintenance requests
- **Performance Metrics**: System health and operational insights

## 🏗️ Architecture

### Backend (Flask)
- **RESTful API**: Complete set of endpoints for all operations
- **SQLite Database**: Persistent data storage with automatic initialization
- **CORS Support**: Cross-origin request handling for deployment flexibility
- **Error Handling**: Comprehensive error handling and logging

### Frontend (HTML5/CSS3/JavaScript)
- **Modern UI**: Clean, professional interface with Poppins font
- **CSS Variables**: Consistent theming and easy customization
- **ES6+ JavaScript**: Modern JavaScript features for optimal performance
- **Font Awesome Icons**: Professional iconography throughout the interface

## 📡 API Endpoints

### Core Endpoints
- `GET /` - Serve main dashboard application
- `GET /api/health` - System health check
- `GET /api/stats` - System statistics and analytics

### Bin Management
- `GET /api/bins` - Retrieve all bins with current status
- `POST /api/bins` - Add new bin to the system
- `DELETE /api/bins/<id>` - Remove bin from system

### Maintenance System
- `POST /api/bins/<id>/maintenance` - Schedule maintenance for specific bin
- `GET /api/maintenance` - Retrieve all maintenance requests

### Visualization
- `GET /api/heatmap` - Get heatmap data for waste density visualization
- `GET /api/route` - Generate optimized collection route

## 🛠️ Installation & Setup

### Prerequisites
- Python 3.8 or higher
- Modern web browser
- Internet connection (for map tiles and external resources)

### Quick Start

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

4. **Access the dashboard**
   Open http://127.0.0.1:5000 in your web browser

### Database Initialization
The SQLite database is automatically created and initialized with sample data on first run. Sample data includes 50 bins across major cities in West Bengal with diverse status levels for testing.

## 🐳 Docker Deployment

### Using Docker
```bash
# Build the image
docker build -t smart-waste-management .

# Run the container
docker run -p 5000:5000 smart-waste-management
```

### Using Docker Compose (Recommended)
```bash
# Start all services
docker-compose up -d

# Access the application at http://localhost
```

The Docker Compose setup includes:
- Application container (Flask app)
- Nginx reverse proxy
- Automatic health checks
- Volume persistence for database

## ☁️ Cloud Deployment

### Vercel
1. Connect your GitHub repository to Vercel
2. The `vercel.json` configuration is already included
3. Deploy with automatic builds on push

### Railway
1. Connect your GitHub repository to Railway
2. The `railway.toml` configuration is already included
3. Deploy with automatic scaling and health checks

### Heroku
1. Create a new Heroku app
2. Connect your GitHub repository
3. Enable automatic deploys

### DigitalOcean/AWS/GCP
Use the included `Dockerfile` and `docker-compose.yml` for container-based deployments.

## 🏗️ File Structure

```
smart-waste-management/
├── app.py                  # Flask backend application
├── requirements.txt        # Python dependencies
├── index_new.html         # Main dashboard template
├── smart_waste.db         # SQLite database (auto-created)
├── static/
│   ├── css/
│   │   └── style.css      # Custom styles and responsive design
│   └── js/
│       └── app.js         # Frontend JavaScript logic
├── deployment/
│   ├── Dockerfile         # Docker container configuration
│   ├── docker-compose.yml # Multi-container setup
│   ├── nginx.conf         # Nginx reverse proxy config
│   ├── vercel.json        # Vercel deployment config
│   └── railway.toml       # Railway deployment config
├── package.json           # Project metadata and scripts
└── README.md             # This file
```

## 🎛️ Configuration

### Environment Variables
- `FLASK_ENV`: Set to 'production' for production deployment
- `FLASK_DEBUG`: Set to 'false' for production
- `PORT`: Application port (default: 5000)
- `DATABASE_URL`: Database connection string (optional, defaults to SQLite)

### Customization
- **Map Center**: Modify map center coordinates in `app.js`
- **Refresh Interval**: Change auto-refresh interval (default: 30 seconds)
- **Sample Data**: Modify city bounds and sample bin count in `app.py`
- **Styling**: Customize CSS variables in `style.css`

## 📱 Mobile Responsiveness

The application is designed with a mobile-first approach:
- **Responsive Sidebar**: Collapses on mobile devices
- **Touch-friendly Controls**: Optimized buttons and interactions
- **Adaptive Layout**: Grid system adjusts to screen size
- **Performance Optimized**: Minimal resource usage on mobile

## 🔒 Security Features

- **CORS Configuration**: Secure cross-origin request handling
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Prevention**: Parameterized database queries
- **XSS Protection**: Output sanitization and CSP headers
- **Health Checks**: Automated application monitoring

## 🧪 Testing

### Manual Testing
1. **Dashboard Loading**: Verify all statistics load correctly
2. **Map Functionality**: Test all three map views (bins, heatmap, route)
3. **Bin Management**: Add and delete bins through the interface
4. **Filtering**: Test status filtering functionality
5. **Maintenance**: Schedule maintenance requests
6. **Responsive Design**: Test on different screen sizes

### API Testing
```bash
# Health check
curl http://localhost:5000/api/health

# Get all bins
curl http://localhost:5000/api/bins

# Get statistics
curl http://localhost:5000/api/stats

# Add a new bin
curl -X POST http://localhost:5000/api/bins \
  -H "Content-Type: application/json" \
  -d '{"city": "Test City", "lat": 22.5, "lon": 88.4, "fill_level": 75}'
```

## 🚨 Troubleshooting

### Common Issues

1. **Map not loading**
   - Check internet connection for map tiles
   - Verify Leaflet.js is loading correctly
   - Check browser console for JavaScript errors

2. **Database errors**
   - Ensure write permissions in application directory
   - Check SQLite installation
   - Verify database file creation

3. **CORS issues**
   - Check CORS configuration in Flask app
   - Verify allowed origins
   - Test with browser developer tools

4. **Performance issues**
   - Check auto-refresh settings
   - Monitor database query performance
   - Verify adequate system resources

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenStreetMap**: Map tiles and geographic data
- **Leaflet.js**: Interactive mapping library
- **Font Awesome**: Professional icon set
- **Flask**: Python web framework
- **OSRM**: Routing machine for optimized routes

## 📞 Support

For support, email support@smartwaste.com or open an issue on GitHub.

---

**Made with ❤️ for smarter cities and cleaner environments**