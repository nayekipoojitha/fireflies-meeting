const mongoose = require('mongoose');
const ActionItemSchema = new mongoose.Schema({
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true },
  task: { type: String, required: true },
  assignee: { type: String, default: 'Unassigned' },
  completed: { type: Boolean, default: false }
}, { timestamps: true });
module.exports = mongoose.model('ActionItem', ActionItemSchema);
