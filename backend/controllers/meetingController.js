const mongoose = require('mongoose');
const Meeting = require('../models/Meeting');
const Transcript = require('../models/Transcript');
const ActionItem = require('../models/ActionItem');

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

function toSec(v) {
  if (typeof v === 'number') return v;
  const p = String(v).split(':').map(Number);
  return p.length === 2 && !isNaN(p[0]) && !isNaN(p[1]) ? p[0] * 60 + p[1] : (Number(v) || 0);
}

exports.list = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    let filter = {};
    if (q) {
      const escaped = escapeRegex(q);
      filter = {
        $or: [
          { title: { $regex: escaped, $options: 'i' } },
          { participants: { $regex: escaped, $options: 'i' } }
        ]
      };
    }
    const meetings = await Meeting.find(filter).sort({ date: -1 });
    res.json(meetings);
  } catch (e) {
    res.status(500).json({ message: e.message || 'Could not fetch meetings' });
  }
};

exports.get = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid meeting ID format' });
    }
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    const [transcript, actionItems] = await Promise.all([
      Transcript.find({ meetingId: meeting._id }).sort({ timestamp: 1 }),
      ActionItem.find({ meetingId: meeting._id }).sort({ createdAt: 1 })
    ]);
    res.json({ ...meeting.toObject(), transcript, actionItems });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Could not fetch meeting' });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, date, duration, participants = [], transcript = '' } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: 'Title is required' });

    const parsedParticipants = Array.isArray(participants)
      ? participants.map(x => String(x).trim()).filter(Boolean)
      : String(participants).split(',').map(x => x.trim()).filter(Boolean);

    const meetingDate = date && !isNaN(new Date(date).getTime()) ? new Date(date) : new Date();

    const meeting = await Meeting.create({
      title: title.trim(),
      date: meetingDate,
      duration: Number(duration) > 0 ? Number(duration) : 30,
      participants: parsedParticipants
    });

    const lines = String(transcript).split(/\n+/).map(x => x.trim()).filter(Boolean);
    const docs = lines.map((line, i) => {
      const m = line.match(/^(?:\[?(\d+:\d+)\]?\s*)?([^:]+):\s*(.*)$/);
      return {
        meetingId: meeting._id,
        speaker: m ? m[2].trim() : 'Speaker',
        timestamp: m?.[1] ? toSec(m[1]) : i * 15,
        text: m ? m[3].trim() : line
      };
    });

    if (docs.length) {
      await Transcript.insertMany(docs);
    }

    const savedTranscript = await Transcript.find({ meetingId: meeting._id }).sort({ timestamp: 1 });
    res.status(201).json({ ...meeting.toObject(), transcript: savedTranscript, actionItems: [] });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Could not create meeting' });
  }
};

exports.update = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid meeting ID format' });
    }
    const allowed = {};
    if (req.body.title !== undefined) allowed.title = String(req.body.title).trim();
    if (req.body.date !== undefined && !isNaN(new Date(req.body.date).getTime())) {
      allowed.date = new Date(req.body.date);
    }
    if (req.body.duration !== undefined) {
      const dur = Number(req.body.duration);
      if (dur > 0) allowed.duration = dur;
    }
    if (req.body.participants !== undefined) {
      allowed.participants = Array.isArray(req.body.participants)
        ? req.body.participants.map(x => String(x).trim()).filter(Boolean)
        : String(req.body.participants).split(',').map(x => x.trim()).filter(Boolean);
    }

    const meeting = await Meeting.findByIdAndUpdate(req.params.id, allowed, { new: true, runValidators: true });
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    const [transcript, actionItems] = await Promise.all([
      Transcript.find({ meetingId: meeting._id }).sort({ timestamp: 1 }),
      ActionItem.find({ meetingId: meeting._id }).sort({ createdAt: 1 })
    ]);
    res.json({ ...meeting.toObject(), transcript, actionItems });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Could not update meeting' });
  }
};

exports.remove = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid meeting ID format' });
    }
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    await Promise.all([
      Meeting.findByIdAndDelete(req.params.id),
      Transcript.deleteMany({ meetingId: req.params.id }),
      ActionItem.deleteMany({ meetingId: req.params.id })
    ]);
    res.json({ message: 'Meeting deleted successfully' });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Could not delete meeting' });
  }
};
