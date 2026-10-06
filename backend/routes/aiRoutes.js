const router = require('express').Router();
const mongoose = require('mongoose');
const Meeting = require('../models/Meeting');
const Transcript = require('../models/Transcript');
const ActionItem = require('../models/ActionItem');
const Groq = require('groq-sdk');

function fmt(s) {
  const sec = typeof s === 'number' ? s : 0;
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

async function full(m) {
  const [transcript, actionItems] = await Promise.all([
    Transcript.find({ meetingId: m._id }).sort({ timestamp: 1 }),
    ActionItem.find({ meetingId: m._id }).sort({ createdAt: 1 })
  ]);
  return { ...m.toObject(), transcript, actionItems };
}

function generateFallbackSummary(meeting, transcript) {
  if (meeting.summary && meeting.summary.trim()) {
    return meeting.summary;
  }
  if (transcript && transcript.length > 0) {
    const speakers = [...new Set(transcript.map(t => t.speaker).filter(Boolean))];
    const speakerList = speakers.length ? speakers.join(', ') : 'The team';
    return `${speakerList} met to discuss ${meeting.title}. The meeting covered key progress updates, addressed current blockers, and outlined immediate next steps.`;
  }
  return `The team held a session regarding ${meeting.title}, aligning on deliverables and assigning tasks for the upcoming cycle.`;
}

function generateFallbackTopics(meeting, transcript) {
  if (meeting.topics && meeting.topics.length > 0) {
    return meeting.topics;
  }
  if (transcript && transcript.length > 0) {
    const topics = [];
    topics.push({ title: 'Discussion Kickoff', timestamp: transcript[0]?.timestamp || 0 });
    if (transcript.length > 2) {
      const mid = transcript[Math.floor(transcript.length / 2)];
      topics.push({ title: 'Key Updates & Review', timestamp: mid?.timestamp || 20 });
    }
    if (transcript.length > 4) {
      const last = transcript[transcript.length - 1];
      topics.push({ title: 'Action Items & Next Steps', timestamp: last?.timestamp || 40 });
    }
    return topics;
  }
  return [
    { title: 'Overview & Objectives', timestamp: 0 },
    { title: 'Project Updates', timestamp: 20 },
    { title: 'Action Planning', timestamp: 40 }
  ];
}

function generateFallbackActionItems(meeting) {
  const participants = meeting.participants && meeting.participants.length ? meeting.participants : ['Lead'];
  return [
    { task: `Review ${meeting.title} notes and confirm milestones`, assignee: participants[0] || 'Unassigned' },
    { task: 'Follow up on pending team action items', assignee: participants[1] || participants[0] || 'Unassigned' }
  ];
}

router.post('/meetings/:id/generate-ai', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid meeting ID format' });
    }
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    const transcript = await Transcript.find({ meetingId: meeting._id }).sort({ timestamp: 1 });

    const hasGroqKey = process.env.GROQ_API_KEY &&
      process.env.GROQ_API_KEY.trim() !== '' &&
      process.env.GROQ_API_KEY !== 'YOUR_GROQ_API_KEY';

    let liveAiSuccess = false;

    if (hasGroqKey) {
      try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const text = transcript.map(x => `${fmt(x.timestamp)} ${x.speaker}: ${x.text}`).join('\n');
        const prompt = `Analyze this meeting transcript. Return ONLY valid JSON with keys:
- summary (string: concise 2-3 sentence overview)
- topics (array of objects with title: string, timestamp: number in seconds)
- actionItems (array of objects with task: string, assignee: string)
Transcript:
${text || meeting.title}`;

        const completion = await groq.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          response_format: { type: 'json_object' }
        });

        const rawContent = completion.choices?.[0]?.message?.content || '{}';
        const data = JSON.parse(rawContent);

        if (data.summary && typeof data.summary === 'string') {
          meeting.summary = data.summary.trim();
        }
        if (Array.isArray(data.topics) && data.topics.length > 0) {
          meeting.topics = data.topics.map(t => ({
            title: String(t.title || '').trim(),
            timestamp: Number(t.timestamp) >= 0 ? Number(t.timestamp) : 0
          }));
        }
        await meeting.save();

        if (Array.isArray(data.actionItems) && data.actionItems.length > 0) {
          await ActionItem.deleteMany({ meetingId: meeting._id });
          await ActionItem.insertMany(data.actionItems.map(x => ({
            meetingId: meeting._id,
            task: String(x.task || '').trim(),
            assignee: String(x.assignee || 'Unassigned').trim(),
            completed: false
          })));
        }

        liveAiSuccess = true;
      } catch (groqErr) {
        console.warn('Groq generation encountered an error; falling back gracefully:', groqErr.message);
      }
    }

    // Graceful fallback if Groq was not configured or threw an error
    if (!liveAiSuccess) {
      if (!meeting.summary || !meeting.summary.trim()) {
        meeting.summary = generateFallbackSummary(meeting, transcript);
      }
      if (!meeting.topics || meeting.topics.length === 0) {
        meeting.topics = generateFallbackTopics(meeting, transcript);
      }
      await meeting.save();

      const existingActions = await ActionItem.countDocuments({ meetingId: meeting._id });
      if (existingActions === 0) {
        const fallbackTasks = generateFallbackActionItems(meeting);
        await ActionItem.insertMany(fallbackTasks.map(t => ({
          meetingId: meeting._id,
          task: t.task,
          assignee: t.assignee,
          completed: false
        })));
      }
    }

    const payload = await full(meeting);
    res.json({ ...payload, liveAi: liveAiSuccess });
  } catch (e) {
    console.error('generate-ai fatal error:', e.message);
    try {
      const fallbackMeeting = await Meeting.findById(req.params.id);
      if (fallbackMeeting) {
        return res.json(await full(fallbackMeeting));
      }
    } catch {}
    res.status(500).json({ message: e.message || 'AI generation failed' });
  }
});

module.exports = router;
