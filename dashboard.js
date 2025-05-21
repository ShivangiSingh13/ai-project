const express = require('express');
const router = express.Router();

// Get devices from server.js
const getDevices = () => {
  return [
    {
      _id: '1',
      name: 'Living Room Fan',
      type: 'fan',
      status: true,
      value: 3,
      room: 'Living Room',
      manufacturer: 'SmartHome Inc',
      model: 'Fan-2023',
      settings: {
        speed: 3,
        oscillation: true
      }
    },
    {
      _id: '2',
      name: 'Bedroom Light',
      type: 'light',
      status: true,
      value: 80,
      room: 'Bedroom',
      manufacturer: 'SmartHome Inc',
      model: 'Light-2023',
      settings: {
        brightness: 80,
        color: 'white'
      }
    },
    {
      _id: '3',
      name: 'Living Room AC',
      type: 'ac',
      status: true,
      value: 24,
      room: 'Living Room',
      manufacturer: 'SmartHome Inc',
      model: 'AC-2023',
      settings: {
        temperature: 24,
        mode: 'cool'
      }
    }
  ];
};

// Get energy usage data
router.get('/energy', (req, res) => {
  try {
    // Calculate total energy usage based on active devices
    const devices = getDevices();
    const activeDevices = devices.filter(d => d.status);
    
    // Simulate energy usage based on device type and value
    const currentUsage = activeDevices.reduce((total, device) => {
      let usage = 0;
      switch (device.type) {
        case 'light':
          usage = (device.value / 100) * 0.1; // 0.1 kWh at full brightness
          break;
        case 'fan':
          usage = (device.value / 3) * 0.05; // 0.05 kWh at full speed
          break;
        case 'ac':
          usage = 1.5; // 1.5 kWh when running
          break;
        default:
          usage = 0.1; // Default 0.1 kWh for other devices
      }
      return total + usage;
    }, 0);

    res.json({
      currentUsage: parseFloat(currentUsage.toFixed(2)),
      dailyAverage: 2.5,
      monthlyTotal: 75.0,
      peakUsage: 3.2,
      lastUpdated: new Date()
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching energy data' });
  }
});

// Get environment data
router.get('/environment', (req, res) => {
  try {
    // Simulate environment data
    const now = new Date();
    const hour = now.getHours();
    
    // Simulate temperature based on time of day
    let baseTemp = 22;
    if (hour >= 12 && hour <= 16) baseTemp = 26; // Warmer in afternoon
    if (hour >= 0 && hour <= 5) baseTemp = 20; // Cooler at night
    
    // Add some random variation
    const temperature = baseTemp + (Math.random() * 2 - 1);
    
    // Simulate humidity based on temperature
    const humidity = 40 + (Math.random() * 20);

    res.json({
      temperature: parseFloat(temperature.toFixed(1)),
      humidity: Math.round(humidity),
      lastUpdated: now
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching environment data' });
  }
});

// Get notifications
router.get('/notifications', (req, res) => {
  try {
    const devices = getDevices();
    const now = new Date();
    
    // Generate some sample notifications based on device status
    const notifications = devices.map(device => {
      if (device.status) {
        return {
          id: Math.random().toString(36).substr(2, 9),
          message: `${device.name} in ${device.room} is currently active`,
          type: 'info',
          timestamp: new Date(now.getTime() - Math.random() * 3600000) // Random time in last hour
        };
      }
      return null;
    }).filter(Boolean);

    // Add some system notifications
    notifications.push(
      {
        id: Math.random().toString(36).substr(2, 9),
        message: 'System check completed successfully',
        type: 'success',
        timestamp: new Date(now.getTime() - 1800000) // 30 minutes ago
      },
      {
        id: Math.random().toString(36).substr(2, 9),
        message: 'New firmware update available',
        type: 'warning',
        timestamp: new Date(now.getTime() - 7200000) // 2 hours ago
      }
    );

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

module.exports = router; 