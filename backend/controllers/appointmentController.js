const pool = require('../config/db');

const ALLOWED_STATUSES = [
    'Scheduled',
    'Completed',
    'Cancelled'
];

const ALLOWED_SORT_COLUMNS = [
    'id',
    'patient_name',
    'doctor_name',
    'department',
    'appointment_date',
    'appointment_time',
    'contact_number',
    'status',
    'created_date'
];

const cleanString = (value) =>
    typeof value === 'string' ? value.trim() : '';


// ============================================================
// GET APPOINTMENTS
// Search + Department + Status + Date Range + Sorting + Paging
// ============================================================
const getAppointments = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            department = '',
            status = '',
            dateFrom = '',
            dateTo = '',
            sortBy = 'appointment_date',
            sortOrder = 'DESC'
        } = req.query;

        const pageNumber = Math.max(
            parseInt(page, 10) || 1,
            1
        );

        const limitNumber = Math.min(
            Math.max(
                parseInt(limit, 10) || 10,
                1
            ),
            100
        );

        const offset =
            (pageNumber - 1) * limitNumber;

        const searchValue =
            cleanString(search);

        const departmentValue =
            cleanString(department);

        const statusValue =
            cleanString(status);

        const dateFromValue =
            cleanString(dateFrom);

        const dateToValue =
            cleanString(dateTo);

        const requestedSortBy =
            cleanString(sortBy);

        const requestedSortOrder =
            String(sortOrder).toUpperCase();

        const safeSortBy =
            ALLOWED_SORT_COLUMNS.includes(requestedSortBy)
                ? requestedSortBy
                : 'appointment_date';

        const safeSortOrder =
            requestedSortOrder === 'ASC'
                ? 'ASC'
                : 'DESC';


        // --------------------------------------------------------
        // Validate date range
        // --------------------------------------------------------
        const datePattern =
            /^\d{4}-\d{2}-\d{2}$/;

        if (
            dateFromValue &&
            !datePattern.test(dateFromValue)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Date From format'
            });
        }

        if (
            dateToValue &&
            !datePattern.test(dateToValue)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Date To format'
            });
        }

        if (
            dateFromValue &&
            dateToValue &&
            dateFromValue > dateToValue
        ) {
            return res.status(400).json({
                success: false,
                message: 'Date From cannot be later than Date To'
            });
        }


        // --------------------------------------------------------
        // Build common WHERE clause
        // --------------------------------------------------------
        let whereClause = 'WHERE 1 = 1';

        const queryParams = [];


        // Search
        if (searchValue) {
            whereClause += `
                AND (
                    patient_name LIKE ?
                    OR doctor_name LIKE ?
                    OR contact_number LIKE ?
                )
            `;

            const likeValue =
                `%${searchValue}%`;

            queryParams.push(
                likeValue,
                likeValue,
                likeValue
            );
        }


        // Department
        if (departmentValue) {
            whereClause +=
                ' AND department = ?';

            queryParams.push(
                departmentValue
            );
        }


        // Status
        if (statusValue) {
            if (
                !ALLOWED_STATUSES.includes(
                    statusValue
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid appointment status'
                });
            }

            whereClause +=
                ' AND status = ?';

            queryParams.push(
                statusValue
            );
        }


        // Date From
        if (dateFromValue) {
            whereClause +=
                ' AND DATE(appointment_date) >= ?';

            queryParams.push(
                dateFromValue
            );
        }


        // Date To
        if (dateToValue) {
            whereClause +=
                ' AND DATE(appointment_date) <= ?';

            queryParams.push(
                dateToValue
            );
        }


        // --------------------------------------------------------
        // Count query
        // --------------------------------------------------------
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM appointments
            ${whereClause}
        `;

        const [countRows] =
            await pool.query(
                countQuery,
                queryParams
            );

        const total =
            Number(countRows[0]?.total || 0);


        // --------------------------------------------------------
        // Data query
        // --------------------------------------------------------
        const appointmentsQuery = `
            SELECT
                id,
                patient_name,
                doctor_name,
                department,
                appointment_date,
                appointment_time,
                contact_number,
                status,
                created_date
            FROM appointments
            ${whereClause}
            ORDER BY
                ${safeSortBy} ${safeSortOrder},
                id DESC
            LIMIT ? OFFSET ?
        `;

        const appointmentParams = [
            ...queryParams,
            limitNumber,
            offset
        ];

        const [appointments] =
            await pool.query(
                appointmentsQuery,
                appointmentParams
            );


        // --------------------------------------------------------
        // Response
        // --------------------------------------------------------
        res.status(200).json({
            success: true,
            data: appointments,
            pagination: {
                page: pageNumber,
                limit: limitNumber,
                total,
                totalPages:
                    Math.ceil(
                        total / limitNumber
                    )
            }
        });

    } catch (error) {
        console.error(
            'Get appointments error:',
            error
        );

        res.status(500).json({
            success: false,
            message:
                'Failed to fetch appointments'
        });
    }
};


// ============================================================
// GET DOCTORS
// ============================================================
const getDoctors = async (req, res) => {
    try {
        const [doctors] =
            await pool.query(`
                SELECT
                    MIN(id) AS id,
                    doctor_name,
                    department
                FROM appointments
                WHERE doctor_name IS NOT NULL
                  AND TRIM(doctor_name) <> ''
                GROUP BY
                    doctor_name,
                    department
                ORDER BY
                    doctor_name ASC
            `);

        res.status(200).json({
            success: true,
            data: doctors
        });

    } catch (error) {
        console.error(
            'Get doctors error:',
            error
        );

        res.status(500).json({
            success: false,
            message:
                'Failed to fetch doctors'
        });
    }
};


// ============================================================
// GET APPOINTMENT BY ID
// ============================================================
const getAppointmentById = async (
    req,
    res
) => {
    try {
        const { id } = req.params;

        const [rows] =
            await pool.query(
                `
                SELECT
                    id,
                    patient_name,
                    doctor_name,
                    department,
                    appointment_date,
                    appointment_time,
                    contact_number,
                    status,
                    created_date
                FROM appointments
                WHERE id = ?
                `,
                [id]
            );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message:
                    'Appointment not found'
            });
        }

        res.status(200).json({
            success: true,
            data: rows[0]
        });

    } catch (error) {
        console.error(
            'Get appointment error:',
            error
        );

        res.status(500).json({
            success: false,
            message:
                'Failed to fetch appointment'
        });
    }
};


// ============================================================
// CREATE APPOINTMENT
// ============================================================
const createAppointment = async (
    req,
    res
) => {
    try {
        const {
            patient_name,
            doctor_name,
            department,
            appointment_date,
            appointment_time,
            contact_number,
            status
        } = req.body;

        const patientName =
            cleanString(patient_name);

        const doctorName =
            cleanString(doctor_name);

        const departmentName =
            cleanString(department);

        const contactNumber =
            cleanString(contact_number);

        const appointmentStatus =
            cleanString(status) ||
            'Scheduled';


        if (
            !patientName ||
            !doctorName ||
            !departmentName ||
            !appointment_date ||
            !appointment_time ||
            !contactNumber
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'All required fields must be provided'
            });
        }


        if (
            !ALLOWED_STATUSES.includes(
                appointmentStatus
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'Invalid appointment status'
            });
        }


        const [result] =
            await pool.query(
                `
                INSERT INTO appointments
                (
                    patient_name,
                    doctor_name,
                    department,
                    appointment_date,
                    appointment_time,
                    contact_number,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    patientName,
                    doctorName,
                    departmentName,
                    appointment_date,
                    appointment_time,
                    contactNumber,
                    appointmentStatus
                ]
            );


        const [newAppointment] =
            await pool.query(
                `
                SELECT
                    id,
                    patient_name,
                    doctor_name,
                    department,
                    appointment_date,
                    appointment_time,
                    contact_number,
                    status,
                    created_date
                FROM appointments
                WHERE id = ?
                `,
                [result.insertId]
            );


        res.status(201).json({
            success: true,
            message:
                'Appointment created successfully',
            data: newAppointment[0]
        });

    } catch (error) {
        console.error(
            'Create appointment error:',
            error
        );

        res.status(500).json({
            success: false,
            message:
                'Failed to create appointment'
        });
    }
};


// ============================================================
// UPDATE APPOINTMENT
// ============================================================
const updateAppointment = async (
    req,
    res
) => {
    try {
        const { id } = req.params;

        const {
            patient_name,
            doctor_name,
            department,
            appointment_date,
            appointment_time,
            contact_number,
            status
        } = req.body;

        const patientName =
            cleanString(patient_name);

        const doctorName =
            cleanString(doctor_name);

        const departmentName =
            cleanString(department);

        const contactNumber =
            cleanString(contact_number);

        const appointmentStatus =
            cleanString(status);


        if (
            !patientName ||
            !doctorName ||
            !departmentName ||
            !appointment_date ||
            !appointment_time ||
            !contactNumber ||
            !appointmentStatus
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'All required fields must be provided'
            });
        }


        if (
            !ALLOWED_STATUSES.includes(
                appointmentStatus
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'Invalid appointment status'
            });
        }


        const [result] =
            await pool.query(
                `
                UPDATE appointments
                SET
                    patient_name = ?,
                    doctor_name = ?,
                    department = ?,
                    appointment_date = ?,
                    appointment_time = ?,
                    contact_number = ?,
                    status = ?
                WHERE id = ?
                `,
                [
                    patientName,
                    doctorName,
                    departmentName,
                    appointment_date,
                    appointment_time,
                    contactNumber,
                    appointmentStatus,
                    id
                ]
            );


        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message:
                    'Appointment not found'
            });
        }


        const [updatedAppointment] =
            await pool.query(
                `
                SELECT
                    id,
                    patient_name,
                    doctor_name,
                    department,
                    appointment_date,
                    appointment_time,
                    contact_number,
                    status,
                    created_date
                FROM appointments
                WHERE id = ?
                `,
                [id]
            );


        res.status(200).json({
            success: true,
            message:
                'Appointment updated successfully',
            data: updatedAppointment[0]
        });

    } catch (error) {
        console.error(
            'Update appointment error:',
            error
        );

        res.status(500).json({
            success: false,
            message:
                'Failed to update appointment'
        });
    }
};


// ============================================================
// DELETE APPOINTMENT
// ============================================================
const deleteAppointment = async (
    req,
    res
) => {
    try {
        const { id } = req.params;

        const [result] =
            await pool.query(
                `
                DELETE FROM appointments
                WHERE id = ?
                `,
                [id]
            );


        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message:
                    'Appointment not found'
            });
        }


        res.status(200).json({
            success: true,
            message:
                'Appointment deleted successfully'
        });

    } catch (error) {
        console.error(
            'Delete appointment error:',
            error
        );

        res.status(500).json({
            success: false,
            message:
                'Failed to delete appointment'
        });
    }
};


module.exports = {
    getAppointments,
    getAppointmentById,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    getDoctors
};