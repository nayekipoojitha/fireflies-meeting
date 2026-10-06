# Fireflies-Inspired AI Meeting Assistant

A full-stack meeting workspace application inspired by modern AI meeting assistants like Fireflies.ai. It allows users to browse meetings, review synchronized audio recordings with interactive transcripts, explore AI-generated summaries and chapters, manage actionable next steps, and update meeting records.

---

## Tech Stack

- **Frontend**: React (v18), JavaScript (ES Modules), Vite, React Router DOM (v7)
- **Backend**: Node.js, Express, Mongoose, CORS, Dotenv
- **Database**: MongoDB (Local or MongoDB Atlas)
- **AI Integration (Optional)**: Groq SDK (`llama-3.1-8b-instant`) with automatic fallback to mock/seeded data
- **Audio**: HTML5 Audio API with timestamp-synchronized transcript seek

---

## Features

### 1. Meetings Dashboard
- **Meeting Directory**: Displays title, date, duration in minutes, and participants for each meeting.
- **Search**: Filter meetings dynamically by title or participant names.
- **Date Filter**: Filter meetings by specific calendar date.
- **Participant Filter**: Filter meetings by individual participant.
- **Sorting**: Toggle between "Most recent" and "Oldest" meetings.
- **Create Meeting**: Modal dialog to create new meetings with metadata and optional pasted transcripts.

### 2. Meeting Details & Interactive Audio Player
- **Recording Playback**: Built-in audio player using bundled demo audio (`/sample.wav`).
- **Synchronized Transcript**: View speakers, formatted timestamps (`MM:SS`), and dialogue text.
- **Audio Seeking**: Click any transcript line or key topic chapter to jump audio to that exact timestamp.
- **Active Line Tracking**: Highlights the active transcript line currently being spoken during playback.
- **Transcript Search & Highlight**: Search inside transcripts with real-time text highlight matches (`<mark>`).

### 3. AI Summary & Key Topics
- **"Generate with AI" Button**: Triggers summary generation for the active meeting.
- **Live Groq Generation**: If `GROQ_API_KEY` is present, uses Groq's `llama-3.1-8b-instant` model to extract summary, chapters/topics, and action items.
- **Graceful Fallback**: If Groq is missing, rate-limited, or unavailable, seamlessly falls back to existing or generated demo summaries without crashes or blank screens.
- **Key Chapters**: Clickable chapter markers with timestamps that seek the audio player.

### 4. Action Items Management
- **Add Items**: Create action items with task description and optional assignee.
- **Edit Items**: Inline edit mode to update task descriptions and assignees.
- **Complete/Incomplete**: Checkbox toggle persisting completion status directly to MongoDB.
- **Delete Items**: Delete action items with immediate UI update and database synchronization.
- **Persistence**: Retains all action items across page refreshes.

### 5. Meeting CRUD
- **Create**: Add meetings via the dashboard modal.
- **Read**: Fetch all meetings or individual meeting with transcripts and action items.
- **Edit**: Edit meeting modal (Title, Participants, Date, Duration) updating MongoDB and refreshing the UI immediately.
- **Delete**: Remove meeting and its associated transcripts and action items with confirmation.

### 6. Settings Page
- Toggle meeting notifications and automatic AI summary preferences.
- View workspace details (Workspace name, Plan, Transcription, AI provider).
- Fully functional without third-party project marketing text.

---

## Architecture

```text
fireflies-clone/
├── frontend/
│   ├── public/
│   │   └── sample.wav          # 60s demo audio recording
│   ├── src/
│   │   ├── components/
│   │   │   └── MeetingCard.jsx  # Reusable meeting item card
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx    # Library page with search, filters, sorting, creation
│   │   │   ├── MeetingDetails.jsx # Synchronized player, transcript, AI summary, actions
│   │   │   └── Settings.jsx     # Workspace preferences & settings
│   │   ├── services/
│   │   │   └── api.js           # Axios API client
│   │   ├── App.jsx              # App layout, navigation, toasts, and routes
│   │   ├── main.jsx             # React entrypoint
│   │   └── styles.css           # Fireflies-style responsive stylesheet
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
└── backend/
    ├── controllers/
    │   ├── actionController.js  # Action item CRUD logic
    │   └── meetingController.js # Meeting CRUD and listing logic
    ├── models/
    │   ├── ActionItem.js        # Action item schema
    │   ├── Meeting.js           # Meeting metadata schema
    │   └── Transcript.js        # Transcript line schema
    ├── routes/
    │   ├── actionRoutes.js      # /api/meetings/:id/actions & /api/actions/:id
    │   ├── aiRoutes.js          # /api/meetings/:id/generate-ai
    │   └── meetingRoutes.js     # /api/meetings CRUD
    ├── seed.js                  # Database seed script with 5 demo meetings
    ├── server.js                # Express app entrypoint & MongoDB connection
    ├── package.json
    └── .env.example
```

---

## MongoDB Schema

### 1. `Meeting` (`meetings`)
- `title` (String, required): Title of the meeting
- `date` (Date, default: Date.now): Scheduled or recorded date
- `duration` (Number, default: 30): Duration in minutes
- `participants` ([String]): Array of participant names
- `summary` (String): AI-generated or seeded summary
- `topics` ([{ title: String, timestamp: Number }]): Chapters/topics with timestamp in seconds
- `createdAt` (Date, default: Date.now)

### 2. `Transcript` (`transcripts`)
- `meetingId` (ObjectId, ref: 'Meeting', required): Associated meeting reference
- `speaker` (String): Speaker name
- `timestamp` (Number): Offset in seconds from start of audio
- `text` (String): Spoken line content

### 3. `ActionItem` (`actionitems`)
- `meetingId` (ObjectId, ref: 'Meeting', required): Associated meeting reference
- `task` (String, required): Action item task description
- `assignee` (String, default: 'Unassigned'): Person responsible
- `completed` (Boolean, default: false): Completion flag
- `createdAt` / `updatedAt` (Timestamps)

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status check |
| `GET` | `/api/meetings` | List meetings (supports `?q=...` query) |
| `GET` | `/api/meetings/:id` | Get meeting with transcript and action items |
| `POST` | `/api/meetings` | Create a new meeting (with optional transcript) |
| `PUT` | `/api/meetings/:id` | Update meeting metadata (title, date, duration, participants) |
| `DELETE` | `/api/meetings/:id` | Delete meeting and related transcripts/actions |
| `GET` | `/api/meetings/:id/actions` | List action items for a meeting |
| `POST` | `/api/meetings/:id/actions` | Create a new action item |
| `PUT` | `/api/actions/:id` | Update an action item (task, assignee, completed) |
| `DELETE` | `/api/actions/:id` | Delete an action item |
| `POST` | `/api/meetings/:id/generate-ai` | Generate summary, topics & actions using Groq / fallback |

---

## Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/fireflies_clone
GROQ_API_KEY=YOUR_GROQ_API_KEY
```
*(If `GROQ_API_KEY` is omitted or left as placeholder, the app automatically falls back to seeded/mock summary data).*

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5000/api
```

---

## Local Setup & Running

### Prerequisites
- Node.js (v18+)
- MongoDB running locally on port 27017 (or MongoDB Atlas connection URI)

### 1. Database Setup
Ensure MongoDB is running:
- **Windows Service**: Started automatically or via `net start MongoDB`
- **macOS / Linux**: `brew services start mongodb-community` or `sudo systemctl start mongod`

### 2. Backend Setup
```bash
cd fireflies-clone/backend
npm install
npm run seed
npm run dev
```
Backend will start on `http://localhost:5000`.

### 3. Frontend Setup
In a second terminal:
```bash
cd fireflies-clone/frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Testing Workflow Checklist

1. **Dashboard**:
   - Filter meetings by text search (`Poojitha`, `Roadmap`, etc.).
   - Filter meetings by participant dropdown (e.g., `Rahul`).
   - Filter meetings by date or sort by `Most recent` / `Oldest`.
   - Click `+ New meeting` to create a meeting.
2. **Meeting Details**:
   - Click any meeting card to open details.
   - Click Play on the audio player — notice the active transcript line highlights as playback advances.
   - Click any transcript line or key topic chapter to seek audio to that timestamp.
   - Search within the transcript to see highlighted text matches (`<mark>`).
3. **AI Summary**:
   - Click `Generate with AI` — notice summary updates and toast notifies the user.
4. **Action Items**:
   - Enter a new action item and optional assignee, click `Add`.
   - Click the checkmark to toggle completed status.
   - Click the pencil `✎` icon to edit an action item, modify task/assignee, and click `Save`.
   - Refresh the page to verify changes persisted to MongoDB.
5. **Meeting Edit & Delete**:
   - Click `Edit` at the top right, update title/duration/date/participants, and save.
   - Notice immediate UI update and persistence.
   - Click `Delete` to remove the meeting and return to the dashboard.
6. **Settings**:
   - Navigate to `/settings` — verify toggles, workspace details, and clean presentation.

---

## Assumptions and Limitations

- **Speech-to-Text**: Real-time microphone capture and speech-to-text bots are outside MVP scope; seeded demo audio and parsed transcripts are used as per project guidelines.
- **AI Processing**: If no `GROQ_API_KEY` is provided or if Groq services are unreachable, the backend provides structured fallback summaries and chapters to ensure an uninterrupted experience.
- **Authentication**: Single-tenant workspace mode without user sign-in/passwords.
