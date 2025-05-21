const express = require('express');
const router = express.Router();

// In-memory storage for energy usage data
let energyData = {
  currentUsage: 0,
  historicalData: [],
};

// Initialize with some sample data
const initializeEnergyData = () => {
  const now = new Date();
  const data = [];
  
  // Generate 30 days of historical data
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Generate realistic energy usage patterns
    let dailyUsage = 0;
    for (let hour = 0; hour < 24; hour++) {
      // Higher usage during morning (6-9) and evening (17-22)
      let hourlyUsage = 1.5;
      if (hour >= 6 && hour <= 9) {
        hourlyUsage = 2.5;
      } else if (hour >= 17 && hour <= 22) {
        hourlyUsage = 3.0;
      }
      
      // Add some randomness
      hourlyUsage += (Math.random() - 0.5);
      
      data.push({
        timestamp: new Date(date.setHours(hour, 0, 0, 0)),
        usage: parseFloat(hourlyUsage.toFixed(2))
      });
    }
  }
  
  energyData.historicalData = data;
  energyData.currentUsage = data[data.length - 1].usage;
};

// Initialize data on startup
initializeEnergyData();

// Update current usage every minute
setInterval(() => {
  const now = new Date();
  const hour = now.getHours();
  
  // Calculate new usage based on time of day
  let baseUsage = 1.5;
  if (hour >= 6 && hour <= 9) {
    baseUsage = 2.5;
  } else if (hour >= 17 && hour <= 22) {
    baseUsage = 3.0;
  }
  
  // Add some randomness
  const newUsage = baseUsage + (Math.random() - 0.5);
  energyData.currentUsage = parseFloat(newUsage.toFixed(2));
  
  // Add to historical data
  energyData.historicalData.push({
    timestamp: now,
    usage: energyData.currentUsage
  });
  
  // Keep only last 30 days of data
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  energyData.historicalData = energyData.historicalData.filter(
    data => data.timestamp >= thirtyDaysAgo
  );
}, 60000); // Update every minute

// Get current energy usage
router.get('/current', (req, res) => {
  res.json({ currentUsage: energyData.currentUsage });
});

// Get historical energy usage data
router.get('/history', (req, res) => {
  const { range = '24h' } = req.query;
  const now = new Date();
  let startTime;
  
  switch (range) {
    case '24h':
      startTime = new Date(now);
      startTime.setHours(startTime.getHours() - 24);
      break;
    case '7d':
      startTime = new Date(now);
      startTime.setDate(startTime.getDate() - 7);
      break;
    case '30d':
      startTime = new Date(now);
      startTime.setDate(startTime.getDate() - 30);
      break;
    default:
      startTime = new Date(now);
      startTime.setHours(startTime.getHours() - 24);
  }
  
  const filteredData = energyData.historicalData.filter(
    data => data.timestamp >= startTime
  );
  
  res.json(filteredData);
});

// Get energy usage statistics
router.get('/stats', (req, res) => {
  const now = new Date();
  const last24Hours = new Date(now);
  last24Hours.setHours(last24Hours.getHours() - 24);
  
  const last24HoursData = energyData.historicalData.filter(
    data => data.timestamp >= last24Hours
  );
  
  const totalUsage = last24HoursData.reduce((sum, data) => sum + data.usage, 0);
  const averageUsage = totalUsage / last24HoursData.length;
  const peakUsage = Math.max(...last24HoursData.map(data => data.usage));
  
  res.json({
    totalUsage: parseFloat(totalUsage.toFixed(2)),
    averageUsage: parseFloat(averageUsage.toFixed(2)),
    peakUsage: parseFloat(peakUsage.toFixed(2)),
    dataPoints: last24HoursData.length
  });
});

module.exports = router; 