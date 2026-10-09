const express = require('express');
const cors = require('cors');
require('dotenv').config();

const appointmentRoutes = require('./routes/appointmentRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Hospital Appointment Management API is running'
    });
});

app.use('/api/appointment', appointmentRoutes);

const PORT = process.env.PORT || 4200;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});