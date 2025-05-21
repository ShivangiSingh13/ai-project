import { io } from 'socket.io-client';

// Create a socket connection to the server
export const socket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5002', {
  transports: ['websocket'],
  autoConnect: true
});

// Log socket connection status
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});

export default socket;
