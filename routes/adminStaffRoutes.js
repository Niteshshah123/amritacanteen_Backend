const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// CREATE STAFF (only admin)
router.post('/', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { fullName, email, phone, password, role } = req.body;

    if (!['kitchen', 'staff', 'delivery'].includes(role)) {
      return res.status(400).json({ error: 'Invalid staff role' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      email,
      phone,
      passwordHash,
      role,
    });

    res.status(201).json({ message: "Staff created successfully", user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET ALL STAFF
router.get('/', requireAuth, requireRole(['admin']), async (req, res) => {
  const staff = await User.find({ role: { $in: ['kitchen', 'staff', 'delivery'] } });
  res.json({ staff });
});

// UPDATE STAFF
router.put('/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  const { fullName, email, phone, role } = req.body;

  const updated = await User.findByIdAndUpdate(
    req.params.id,
    { fullName, email, phone, role },
    { new: true }
  );

  res.json({ message: "Updated successfully", updated });
});

// DELETE STAFF
router.delete('/:id', requireAuth, requireRole(['admin']), async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: "Staff deleted successfully" });
});

module.exports = router;
