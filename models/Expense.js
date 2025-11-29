const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['salary', 'inventory', 'goods', 'utilities', 'maintenance'],
  },
  amount: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  date: { 
    type: Date, 
    required: true 
  },
  note: String,
  recordedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);

