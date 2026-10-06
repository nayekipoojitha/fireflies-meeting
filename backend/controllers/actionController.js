const mongoose = require('mongoose');
const ActionItem = require('../models/ActionItem');

exports.list = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid meeting ID format' });
    }
    const items = await ActionItem.find({ meetingId: req.params.id }).sort({ createdAt: 1 });
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: e.message || 'Could not list action items' });
  }
};

exports.create = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid meeting ID format' });
    }
    const task = String(req.body.task || '').trim();
    if (!task) return res.status(400).json({ message: 'Task description is required' });
    const assignee = String(req.body.assignee || 'Unassigned').trim();
    const item = await ActionItem.create({
      meetingId: req.params.id,
      task,
      assignee: assignee || 'Unassigned',
      completed: false
    });
    res.status(201).json(item);
  } catch (e) {
    res.status(500).json({ message: e.message || 'Could not create action item' });
  }
};

exports.update = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid action item ID format' });
    }
    const allowed = {};
    if (req.body.task !== undefined) allowed.task = String(req.body.task).trim();
    if (req.body.assignee !== undefined) allowed.assignee = String(req.body.assignee).trim() || 'Unassigned';
    if (req.body.completed !== undefined) allowed.completed = Boolean(req.body.completed);

    const item = await ActionItem.findByIdAndUpdate(req.params.id, allowed, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: 'Action item not found' });
    res.json(item);
  } catch (e) {
    res.status(500).json({ message: e.message || 'Could not update action item' });
  }
};

exports.remove = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid action item ID format' });
    }
    const item = await ActionItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Action item not found' });
    res.json({ message: 'Action item deleted successfully' });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Could not delete action item' });
  }
};
