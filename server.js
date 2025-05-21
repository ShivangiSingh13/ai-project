const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
global.io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Initialize global storage
global.inMemoryStorage = {
  devices: [
    // Living Room
    { _id: '1', name: 'Living Room Light', type: 'light', status: false, room: 'Living Room' },
    { _id: '2', name: 'Smart TV', type: 'tv', status: false, room: 'Living Room' },
    { _id: '3', name: 'Living Room AC', type: 'ac', status: false, room: 'Living Room' },
    { _id: '4', name: 'Living Room Curtains', type: 'curtain', status: false, room: 'Living Room' },
    { _id: '5', name: 'Sound System', type: 'speaker', status: false, room: 'Living Room' },
    
    // Bedroom
    { _id: '6', name: 'Bedroom Light', type: 'light', status: false, room: 'Bedroom' },
    { _id: '7', name: 'Bedroom AC', type: 'ac', status: false, room: 'Bedroom' },
    { _id: '8', name: 'Bedroom Fan', type: 'fan', status: false, room: 'Bedroom' },
    { _id: '9', name: 'Bedroom TV', type: 'tv', status: false, room: 'Bedroom' },
    { _id: '10', name: 'Bedroom Curtains', type: 'curtain', status: false, room: 'Bedroom' },
    
    // Kitchen
    { _id: '11', name: 'Kitchen Light', type: 'light', status: false, room: 'Kitchen' },
    { _id: '12', name: 'Refrigerator', type: 'appliance', status: false, room: 'Kitchen' },
    { _id: '13', name: 'Microwave', type: 'appliance', status: false, room: 'Kitchen' },
    { _id: '14', name: 'Coffee Maker', type: 'appliance', status: false, room: 'Kitchen' },
    { _id: '15', name: 'Kitchen Fan', type: 'fan', status: false, room: 'Kitchen' },
    
    // Bathroom
    { _id: '16', name: 'Bathroom Light', type: 'light', status: false, room: 'Bathroom' },
    { _id: '17', name: 'Water Heater', type: 'appliance', status: false, room: 'Bathroom' },
    { _id: '18', name: 'Exhaust Fan', type: 'fan', status: false, room: 'Bathroom' },
    
    // Study Room
    { _id: '19', name: 'Study Light', type: 'light', status: false, room: 'Study Room' },
    { _id: '20', name: 'Study AC', type: 'ac', status: false, room: 'Study Room' },
    { _id: '21', name: 'Desk Lamp', type: 'light', status: false, room: 'Study Room' },
    { _id: '22', name: 'Study Fan', type: 'fan', status: false, room: 'Study Room' },
    
    // Security
    { _id: '23', name: 'Front Door Lock', type: 'security', status: false, room: 'Security' },
    { _id: '24', name: 'Security Camera', type: 'camera', status: false, room: 'Security' },
    { _id: '25', name: 'Motion Sensor', type: 'sensor', status: false, room: 'Security' }
  ],
  automationRules: [],
  automations: [],
  users: []
};

// Socket.IO Connection
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('deviceCommand', async (data) => {
    try {
      // Find device and update status
      const device = global.inMemoryStorage.devices.find(d => d._id === data.deviceId);
      if (device) {
        device.status = data.status;
      }
      
      // Process command and emit response
      io.emit('deviceStatus', {
        deviceId: data.deviceId,
        status: 'updated',
        timestamp: new Date()
      });
    } catch (error) {
      socket.emit('error', { message: 'Failed to process command' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Routes
app.use('/api/devices', require('./routes/devices'));
const automationRoutes = require('./routes/automation');
const chatRoutes = require('./routes/chat');
app.use('/api/chat', chatRoutes);
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/energy', require('./routes/energy'));
app.use('/api/automation', automationRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
let currentPort = process.env.PORT || 5002;
const startServer = (port) => {
  if (port > 65535) {
    console.error('Port number too high. Please specify a valid port.');
    process.exit(1);
  }
  
  try {
    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
      // Update the current port in case it changed
      currentPort = port;
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is already in use. Trying port ${port + 1}`);
        startServer(port + 1);
      } else {
        console.error('Server error:', err);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(currentPort); 