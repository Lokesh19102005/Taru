const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const checkinRoutes = require('./routes/checkin');
const psychiatristRoutes = require('./routes/psychiatrist');
const { getAllPsychiatrists } = require('./controllers/psychiatristController');
const availabilityRoutes = require('./routes/availability');
const appointmentRoutes = require('./routes/appointment');
const institutionRoutes = require('./routes/institution');
const meetingRoutes = require('./routes/meeting');

const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/psychiatrist', psychiatristRoutes);
app.get('/api/view_psychiatrist', getAllPsychiatrists);
app.use('/api/availability', availabilityRoutes);
app.use('/api/appointment', appointmentRoutes);
app.use('/api/institution', institutionRoutes);
app.use('/api', meetingRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Server Error' });
});

module.exports = app;
