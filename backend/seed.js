require('dotenv').config();
const mongoose = require('mongoose');
const Meeting = require('./models/Meeting');
const Transcript = require('./models/Transcript');
const ActionItem = require('./models/ActionItem');

const meetings = [
  {
    title: 'Product Roadmap Meeting',
    duration: 45,
    participants: ['Poojitha', 'Rahul', 'Ananya'],
    summary: 'The team reviewed the Q4 roadmap, prioritized the mobile experience and agreed on owners for the next release.',
    topics: [['Product Roadmap', 8], ['Mobile Experience', 22], ['Release Timeline', 42]],
    lines: [
      ['Rahul', '00:00', 'Let’s review the Q4 product roadmap.'],
      ['Poojitha', '00:08', 'We should prioritize the mobile experience.'],
      ['Ananya', '00:22', 'I can coordinate with the design team.'],
      ['Rahul', '00:32', 'The first release should be ready next month.'],
      ['Poojitha', '00:42', 'I will finish the dashboard requirements by Friday.'],
      ['Ananya', '00:52', 'I will update the implementation plan.']
    ]
  },
  {
    title: 'Weekly Engineering Sync',
    duration: 32,
    participants: ['Rahul', 'Poojitha', 'Kiran'],
    summary: 'Engineering shared progress, discussed blockers and agreed to improve testing before the next sprint.',
    topics: [['Progress', 7], ['Testing', 25], ['Blockers', 44]],
    lines: [
      ['Rahul', '00:00', 'Let’s start with this week’s engineering updates.'],
      ['Kiran', '00:12', 'The API work is nearly complete.'],
      ['Poojitha', '00:22', 'The dashboard is ready for review.'],
      ['Kiran', '00:36', 'We need more automated tests before release.'],
      ['Rahul', '00:50', 'I will review the pull requests tomorrow.']
    ]
  },
  {
    title: 'Sprint Planning',
    duration: 38,
    participants: ['Poojitha', 'Ananya', 'Vikram'],
    summary: 'The team estimated sprint work and assigned frontend, backend and testing tasks.',
    topics: [['Sprint Goals', 7], ['Estimation', 25], ['Assignments', 45]],
    lines: [
      ['Poojitha', '00:00', 'Let’s define our sprint goals.'],
      ['Vikram', '00:10', 'The backend stories look like five points.'],
      ['Ananya', '00:25', 'I can take the testing tasks.'],
      ['Poojitha', '00:42', 'I’ll own the frontend dashboard work.']
    ]
  },
  {
    title: 'Client Discussion',
    duration: 29,
    participants: ['Poojitha', 'Client Team', 'Rahul'],
    summary: 'The client shared feedback on the current prototype and requested a simpler reporting flow.',
    topics: [['Feedback', 6], ['Reporting', 25], ['Next Steps', 45]],
    lines: [
      ['Client Team', '00:00', 'We like the prototype but want simpler reporting.'],
      ['Rahul', '00:12', 'We can simplify the reporting flow.'],
      ['Poojitha', '00:28', 'I will prepare a revised screen.'],
      ['Client Team', '00:46', 'Please share the revision by Thursday.']
    ]
  },
  {
    title: 'Marketing Strategy Meeting',
    duration: 41,
    participants: ['Ananya', 'Poojitha', 'Rahul'],
    summary: 'Marketing discussed launch messaging, target users and a lightweight campaign calendar.',
    topics: [['Target Users', 7], ['Messaging', 25], ['Campaign', 45]],
    lines: [
      ['Ananya', '00:00', 'Today we need to finalize the launch message.'],
      ['Poojitha', '00:12', 'Students and early-career users are our first audience.'],
      ['Rahul', '00:28', 'We should keep the campaign simple for launch.'],
      ['Ananya', '00:46', 'I will draft the campaign calendar.']
    ]
  }
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fireflies_clone');
    await Promise.all([
      Meeting.deleteMany({}),
      Transcript.deleteMany({}),
      ActionItem.deleteMany({})
    ]);

    for (let i = 0; i < meetings.length; i++) {
      const x = meetings[i];
      // Stagger dates slightly so sorting by recent/oldest is obvious
      const meetingDate = new Date(Date.now() - i * 86400000 * 2);

      const m = await Meeting.create({
        title: x.title,
        date: meetingDate,
        duration: x.duration,
        participants: x.participants,
        summary: x.summary,
        topics: x.topics.map(([title, timestamp]) => ({ title, timestamp }))
      });

      await Transcript.insertMany(
        x.lines.map(([speaker, t, text]) => {
          const [a, b] = t.split(':').map(Number);
          return {
            meetingId: m._id,
            speaker,
            timestamp: a * 60 + b,
            text
          };
        })
      );

      const tasks = [
        ['Review meeting notes', x.participants[0]],
        ['Complete assigned follow-up', x.participants[1] || x.participants[0]]
      ];

      await ActionItem.insertMany(
        tasks.map(([task, assignee], idx) => ({
          meetingId: m._id,
          task,
          assignee,
          completed: idx === 0 && x.title === 'Weekly Engineering Sync'
        }))
      );
    }

    console.log('Successfully seeded meetings, transcripts, and action items.');
    process.exit(0);
  } catch (e) {
    console.error('Error during seeding:', e);
    process.exit(1);
  }
})();
