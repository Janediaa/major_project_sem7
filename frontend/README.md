# Healthcare Navigator – Frontend (prototype)

React + Vite + React Router + Lucide icons. Frontend only: no APIs, no auth.

    npm install
    npm run dev      # http://localhost:5173
    npm run build

## Where sample data lives
- `src/data/sampleData.js` – every invented doctor, hospital, policy, appointment, activity and chat answer.
- `src/services/ragService.js` – the only place the chat gets answers. Replace `askMedicalQuestion` with the FastAPI call.
- `src/config/modules.js` – sidebar, topbar titles and dashboard cards. Change a module's `status` when its backend is ready.
