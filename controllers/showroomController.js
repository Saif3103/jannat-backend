const ShowroomBooking = require('../models/ShowroomBooking');
const { v4: uuidv4 } = require('uuid');
const { notifyAdmin, notifyUser } = require('../utils/notify');

const BRANCHES = [
  'Jannat Rugs — Mathura Flagship',
  'Jannat Rugs — Delhi Experience Studio',
  'Jannat Rugs — Mumbai Appointment Desk',
];

const createShowroomBooking = async (req, res) => {
  try {
    const { branch, date, time, product, productSnapshot, customer, notes } = req.body;
    if (!branch || !date || !time) {
      return res.status(400).json({ success: false, message: 'Branch, date and time are required' });
    }

    const bookingId = `SHOW-${uuidv4().split('-')[0].toUpperCase()}`;
    const qrPayload = JSON.stringify({ bookingId, branch, date, time });
    // Lightweight QR as data URL text token (frontend can render barcode/QR from bookingId)
    const qrCode = `JRC:${bookingId}`;

    const booking = await ShowroomBooking.create({
      user: req.user._id,
      customer: {
        name: customer?.name || req.user.name,
        email: customer?.email || req.user.email,
        phone: customer?.phone || req.user.phone || '',
      },
      product: product || null,
      productSnapshot: productSnapshot || {},
      branch,
      date,
      time,
      notes: notes || '',
      bookingId,
      qrCode,
      status: 'Pending',
    });

    await notifyAdmin({
      type: 'showroom',
      title: 'New showroom visit',
      body: `${bookingId} · ${branch} · ${date} ${time}`,
      link: '/admin/bookings',
      refId: booking._id,
    });
    await notifyUser(req.user._id, {
      type: 'showroom',
      title: 'Showroom visit reserved',
      body: `Booking ${bookingId} confirmed for ${date} at ${time}.`,
      link: '/dashboard',
      refId: booking._id,
    });

    res.status(201).json({ success: true, booking, qrPayload });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getBranches = async (req, res) => {
  res.json({ success: true, branches: BRANCHES });
};

const getMyShowroomBookings = async (req, res) => {
  try {
    const list = await ShowroomBooking.find({ user: req.user._id }).sort('-createdAt');
    res.json({ success: true, bookings: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllShowroomBookings = async (req, res) => {
  try {
    const list = await ShowroomBooking.find({})
      .populate('user', 'name email phone')
      .sort('-createdAt');
    const today = new Date().toISOString().slice(0, 10);
    res.json({
      success: true,
      bookings: list,
      todaysVisits: list.filter((b) => b.date === today && !['Cancelled'].includes(b.status)),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateShowroomBooking = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const item = await ShowroomBooking.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    if (status) item.status = status;
    if (adminNotes !== undefined) item.adminNotes = adminNotes;
    await item.save();

    await notifyUser(item.user, {
      type: 'showroom',
      title: `Showroom visit ${status || 'updated'}`,
      body: adminNotes || `Your visit is now ${status}`,
      link: '/dashboard',
      refId: item._id,
    });

    res.json({ success: true, booking: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createShowroomBooking,
  getBranches,
  getMyShowroomBookings,
  getAllShowroomBookings,
  updateShowroomBooking,
};
