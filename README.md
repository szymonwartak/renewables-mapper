# Renewable Energy Mapper

An interactive web application that visualizes global renewable energy capacity data on a world map using logarithmically scaled circles.

## Features

- **Interactive World Map**: Built with Leaflet.js for smooth navigation and zooming
- **Logarithmic Scaling**: Circle sizes are scaled logarithmically to better represent the wide range of capacity values
- **Color-Coded Visualization**: Different colors represent different capacity ranges:
  - 🔴 Red: < 1,000 MW
  - 🔵 Blue: 1,000 - 10,000 MW
  - 🟡 Yellow: 10,000 - 100,000 MW
  - 🟢 Green: > 100,000 MW
- **Interactive Controls**: Sliders to filter countries by capacity range
- **Real-time Statistics**: Live updates showing total countries, capacity, and averages
- **Detailed Popups**: Click on any circle to see detailed information about that country
- **Responsive Design**: Works on desktop and mobile devices

## Data Source

The application uses renewable energy data from 2024, including:
- Country/area names
- Technology type (Total Renewable)
- Data type (Electricity Installed Capacity in MW)
- Grid connection type
- Year (2024)
- Capacity values in MW

## How to Use

1. **Open the Application**: Open `index.html` in a web browser
2. **Navigate the Map**:
   - Drag to pan around the world
   - Use mouse wheel or zoom controls to zoom in/out
   - Double-click to zoom in on a specific area
3. **Filter Data**: Use the sliders to filter countries by minimum and maximum capacity
4. **View Details**: Click on any circle to see detailed information about that country's renewable energy capacity
5. **Monitor Statistics**: Watch the statistics cards update in real-time as you filter the data

## Technical Details

### Logarithmic Scaling
The circle sizes use logarithmic scaling to handle the wide range of capacity values:
- Formula: `radius = minRadius + (maxRadius - minRadius) * (log(capacity) - log(min)) / (log(max) - log(min))`
- This ensures that countries with very large capacities (like China with 1.8M MW) don't completely dominate the visualization
- Countries with smaller capacities remain visible and comparable

### Geocoding
The application uses the OpenStreetMap Nominatim service to convert country names to geographic coordinates. A mapping table handles variations in country naming conventions between the data source and geocoding service.

### Performance
- Debounced updates prevent excessive API calls when adjusting filters
- Efficient marker management with proper cleanup
- Responsive design for various screen sizes

## File Structure

```
renewables-mapper/
├── index.html          # Main HTML file
├── styles.css          # CSS styles and responsive design
├── script.js           # JavaScript functionality
├── data.csv            # Renewable energy data
└── README.md           # This file
```

## Browser Compatibility

- Modern browsers with ES6+ support
- Requires internet connection for map tiles and geocoding
- Tested on Chrome, Firefox, Safari, and Edge

## Data Format

The CSV file should have the following columns:
1. Country/area
2. Technology
3. Data Type
4. Grid connection
5. Year
6. Electricity statistics (MW/GWh)

## Future Enhancements

- Add time series visualization
- Include different renewable energy types (solar, wind, hydro, etc.)
- Add export functionality for filtered data
- Implement clustering for better performance with many markers
- Add comparison tools between countries

## License

This project is open source and available under the MIT License.