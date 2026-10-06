# Deployment checklist

## MongoDB
Create a MongoDB Atlas database and copy its connection string into the backend `MONGO_URI` environment variable.

## Backend (Render/Railway)
- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Environment variables: `MONGO_URI`, `PORT`, optional `GROQ_API_KEY`

After deployment, test:
`https://YOUR-BACKEND/api/health`

## Frontend (Vercel/Netlify)
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable:
  `VITE_API_URL=https://YOUR-BACKEND/api`

For a Vite SPA, configure the host to rewrite unknown routes to `/index.html` so `/meetings/:id` works after refresh.
