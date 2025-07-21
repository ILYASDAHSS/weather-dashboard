const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// In-memory cache to reduce API calls
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes


const rateLimitStore = new Map();
const RATE_LIMIT = 60; // requests per hour per IP
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour


const rateLimit = (req, res, next) => {
  const clientIP = req.ip ;
  const now = Date.now();
  
  if (!rateLimitStore.has(clientIP)) {
    rateLimitStore.set(clientIP, { count: 1, resetTime: now + RATE_WINDOW });
    return next();
  }
  
  const client = rateLimitStore.get(clientIP);
  
  if (now > client.resetTime) {
    client.count = 1;
    client.resetTime = now + RATE_WINDOW;
    return next();
  }
  
  if (client.count >= RATE_LIMIT) {
    return res.status(429).json({
      error: 'Too many requests. Please try again later.',
      resetTime: new Date(client.resetTime).toISOString()
    });
  }
  
  client.count++;
  next();
};

// Helper function to get weather data from OpenWeatherMap
const getWeatherData = async (url) => {
  const API_KEY = process.env.OPENWEATHER_API_KEY;
  
  if (!API_KEY) {
    throw new Error('API key not configured. Please add OPENWEATHER_API_KEY to your .env file');
  }
  
  const fullUrl = `${url}&appid=${API_KEY}&units=metric`;
  
  // Check cache first
  if (cache.has(fullUrl)) {
    const cached = cache.get(fullUrl);
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    cache.delete(fullUrl);
  }
  
  try {
    const response = await axios.get(fullUrl);
    const data = response.data;
    
    // Cache the response
    cache.set(fullUrl, {
      data: data,
      timestamp: Date.now()
    });
    
    return data;
  } catch (error) {
    if (error.response) {
      throw new Error(`Weather service error: ${error.response.data.message || 'Unknown error'}`);
    } else if (error.request) {
      throw new Error('Unable to connect to weather service');
    } else {
      throw new Error('Weather request failed');
    }
  }
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get weather by city name
app.get('/api/weather/:city', rateLimit, async (req, res) => {
  try {
    const city = req.params.city.trim();
    
    if (!city || city.length < 2) {
      return res.status(400).json({
        error: 'City name must be at least 2 characters long'
      });
    }
    
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}`;
    const weatherData = await getWeatherData(url);
    
    // Format the response
    const formattedData = {
      city: weatherData.name,
      country: weatherData.sys.country,
      temperature: Math.round(weatherData.main.temp),
      feelsLike: Math.round(weatherData.main.feels_like),
      description: weatherData.weather.description,
      icon: weatherData.weather.icon,
      humidity: weatherData.main.humidity,
      windSpeed: Math.round(weatherData.wind.speed * 3.6), // Convert m/s to km/h
      pressure: weatherData.main.pressure,
      visibility: weatherData.visibility ? Math.round(weatherData.visibility / 1000) : null,
      sunrise: new Date(weatherData.sys.sunrise * 1000).toLocaleTimeString(),
      sunset: new Date(weatherData.sys.sunset * 1000).toLocaleTimeString(),
      timestamp: new Date().toISOString()
    };
    
    res.json(formattedData);
  } catch (error) {
    console.error('Weather API Error:', error.message);
    
    if (error.message.includes('city not found')) {
      res.status(404).json({
        error: 'City not found. Please check the spelling and try again.'
      });
    } else if (error.message.includes('API key')) {
      res.status(500).json({
        error: 'Weather service configuration error'
      });
    } else {
      res.status(500).json({
        error: 'Failed to fetch weather data. Please try again.'
      });
    }
  }
});

// Get weather by coordinates
app.get('/api/weather/coordinates/:lat/:lon', rateLimit, async (req, res) => {
  try {
    const { lat, lon } = req.params;
    
    // Validate coordinates
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        error: 'Invalid coordinates provided'
      });
    }
    
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        error: 'Coordinates out of valid range'
      });
    }
    
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}`;
    const weatherData = await getWeatherData(url);
    
    // Format the response (same as city endpoint)
    const formattedData = {
      city: weatherData.name,
      country: weatherData.sys.country,
      temperature: Math.round(weatherData.main.temp),
      feelsLike: Math.round(weatherData.main.feels_like),
      description: weatherData.weather[0].description,
      icon: weatherData.weather[0].icon,
      humidity: weatherData.main.humidity,
      windSpeed: Math.round(weatherData.wind.speed * 3.6),
      pressure: weatherData.main.pressure,
      visibility: weatherData.visibility ? Math.round(weatherData.visibility / 1000) : null,
      sunrise: new Date(weatherData.sys.sunrise * 1000).toLocaleTimeString(),
      sunset: new Date(weatherData.sys.sunset * 1000).toLocaleTimeString(),
      timestamp: new Date().toISOString()
    };
    
    res.json(formattedData);
  } catch (error) {
    console.error('Weather API Error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch weather data for the provided coordinates'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({
    error: 'Internal server error'
  });
});

// Clean up cache and rate limit store periodically
setInterval(() => {
  const now = Date.now();
  
  // Clean expired cache entries
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp >= CACHE_DURATION) {
      cache.delete(key);
    }
  }
  
  // Clean expired rate limit entries
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

app.listen(PORT, () => {
  console.log(`Weather Dashboard server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to view the dashboard`);
  
  if (!process.env.OPENWEATHER_API_KEY) {
    console.warn('⚠️  WARNING: OPENWEATHER_API_KEY not found in environment variables');
    console.warn('   Please add your OpenWeatherMap API key to the .env file');
  }
});