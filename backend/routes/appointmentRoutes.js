const express = require('express');

const {
    getAppointments,
    getAppointmentById,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    getDoctors
} = require('../controllers/appointmentController');

const router = express.Router();

router.get('/', getAppointments);

router.get('/doctors', getDoctors);

router.get('/:id', getAppointmentById);

router.post('/', createAppointment);

router.put('/:id', updateAppointment);

router.delete('/:id', deleteAppointment);

module.exports = router;