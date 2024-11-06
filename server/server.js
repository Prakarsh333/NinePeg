const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const fs = require('fs'); // Import the fs module

const app = express();
const PORT = 4000;
app.use(cors());
app.use(express.json()); // Middleware to parse JSON request body

// Set up the serial port connection
const port = new SerialPort({ path: 'COM9', baudRate: 9600 });
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

// Create HTTP server and Socket.IO instance
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000", // React app URL
        methods: ["GET", "POST"]
    }
});

// Listen for data from the serial port
parser.on('data', (data) => {
    console.log('Received from Arduino:', data);
    io.emit('arduino-data', data); // Emit the received data to all connected clients
});

// Handle socket connections
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Optionally, you can send a welcome message or initial data here
    socket.emit('message', 'Welcome to the Arduino Data Stream!');

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

// POST route to save user data
app.post("/user", (req, res) => {
    const userData = req.body;

    try {
        // Step 1: Read the existing JSON data
        let jsonData = [];
        if (fs.existsSync('data.json')) {
            const data = fs.readFileSync('data.json', 'utf-8');
            if (data) {
                jsonData = JSON.parse(data);
                if (!Array.isArray(jsonData)) {
                    jsonData = [];
                }
            }
        }

        // Step 2: Add new data to the existing JSON array
        jsonData.push(userData);

        // Step 3: Write updated JSON back to the file
        fs.writeFileSync('data.json', JSON.stringify(jsonData, null, 2), 'utf-8');

        console.log('Data appended successfully!');
        res.status(200).send({ message: 'Data saved successfully' });
    } catch (error) {
        console.error('Error reading or writing the file:', error);
        res.status(500).send({ error: 'Failed to save data' });
    }
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
