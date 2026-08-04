const Consultation = require('../models/Consultation');
const { v4: uuidv4 } = require('uuid');
const { notifyAdmin, notifyUser } = require('../utils/notify');

const createConsultation = async (req, res) => {
  try {
    const {
      preferredDate,
      preferredTime,
      consultationType,
      specialRequirements,
      product,
      productSnapshot,
      customer,
    } = req.body;

    if (!preferredDate || !preferredTime) {
      return res.status(400).json({ success: false, message: 'Date and time are required' });
    }

    const bookingId = `CONS-${uuidv4().split('-')[0].toUpperCase()}`;
    const consultation = await Consultation.create({
      user: req.user._id,
      customer: {
        name: customer?.name || req.user.name,
        email: customer?.email || req.user.email,
        phone: customer?.phone || req.user.phone || '',
      },
      product: product || null,
      productSnapshot: productSnapshot || {},
      preferredDate,
      preferredTime,
      consultationType: consultationType || 'WhatsApp',
      specialRequirements: specialRequirements || '',
      bookingId,
      status: 'Pending',
    });

    await notifyAdmin({
      type: 'consultation',
      title: 'New design consultation',
      body: `${bookingId} · ${consultation.customer.name} · ${preferredDate} ${preferredTime}`,
      link: '/admin/bookings',
      refId: consultation._id,
    });
    await notifyUser(req.user._id, {
      type: 'consultation',
      title: 'Consultation booked',
      body: `Booking ${bookingId} received. We will confirm shortly.`,
      link: '/dashboard',
      refId: consultation._id,
    });

    res.status(201).json({ success: true, consultation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getMyConsultations = async (req, res) => {
  try {
    const list = await Consultation.find({ user: req.user._id }).sort('-createdAt');
    res.json({ success: true, consultations: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllConsultations = async (req, res) => {
  try {
    const list = await Consultation.find({})
      .populate('user', 'name email phone')
      .sort('-createdAt');
    res.json({ success: true, consultations: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateConsultation = async (req, res) => {
  try {
    const { status, adminNotes, rescheduleDate, rescheduleTime } = req.body;
    const item = await Consultation.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });

    if (status) item.status = status;
    if (adminNotes !== undefined) item.adminNotes = adminNotes;
    if (status === 'Rescheduled') {
      if (rescheduleDate) item.rescheduleDate = rescheduleDate;
      if (rescheduleTime) item.rescheduleTime = rescheduleTime;
    }
    await item.save();

    await notifyUser(item.user, {
      type: 'consultation',
      title: `Consultation ${status || 'updated'}`,
      body: adminNotes || `Your consultation is now ${status}`,
      link: '/dashboard',
      refId: item._id,
    });

    res.json({ success: true, consultation: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createConsultation,
  getMyConsultations,
  getAllConsultations,
  updateConsultation,
};
