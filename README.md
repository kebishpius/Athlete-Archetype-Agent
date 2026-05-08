# Athlete Archetype Agent (Team USA Hackathon)

A premium, multimodal AI-powered platform that uses 120 years of historical Olympic and Paralympic data to help fans discover their "Athlete Archetype." 

Built with **Google ADK**, **React**, and **Gemini 3.1 Flash-lite** for Challenge 4 of the Team USA Hackathon.

## Features

- **Layered Interaction**: A "Digital Mirror" entry point where users upload an image to begin their journey.
- **Multimodal Analysis**: Analyzes both user biometrics (Height, Weight, Age) and uploaded images using Gemini 3.1 Flash-lite.
- **Historical Clustering**: Integrates with **BigQuery ML** (`Olympic_Data.athlete_archetypes`) to map users to historical archetypes (e.g., Powerhouse, Leverage, Agility).
- **Paralympic Parity**: Provides equal analytical depth and technically rigorous explanations for Paralympic classifications.
- **Premium UI**: Modern Glassmorphism aesthetic with micro-animations (Framer Motion) and interactive Radar Charts (Recharts).

## Tech Stack

- **Frontend**: React (Vite), Framer Motion, Axios, Recharts, Lucide-React.
- **Backend**: Python (FastAPI), Google Agent Development Kit (ADK).
- **AI Model**: `gemini-3.1-flash-lite` on Vertex AI (`global` region).
- **Infrastructure**: Google Cloud Run (Single-container multi-stage build).
- **Data**: BigQuery ML.

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 20+
- Google Cloud CLI (`gcloud`)
- `uv` (for Python package management)
- `agents-cli` (`pip install google-agents-cli`)

### Local Development

1. **Install Dependencies**:
   ```bash
   # Backend
   uv sync
   
   # Frontend
   cd frontend
   npm install
   ```

2. **Run Locally**:
   ```bash
   # Terminal 1: Backend (FastAPI)
   uv run uvicorn app.fast_api_app:app --reload --port 8000
   
   # Terminal 2: Frontend (Vite)
   cd frontend
   npm run dev
   ```

### Deployment

To deploy to Google Cloud Run:
```bash
gcloud run deploy athlete-archetype-agent --source . --project hackathons-461900 --region us-central1 --allow-unauthenticated
```

## Hackathon Compliance

- **Challenge 4**: Specifically designed for "The Athlete Archetype Agent".
- **Conditional Phrasing**: Uses non-deterministic language (e.g., "Your profile could suggest") to avoid guaranteeing results.
- **Paralympic Clause**: Integrated at the core of the agent's system instructions to ensure parity.
- **Vertex AI**: Native integration via ADK.
- **Cloud Run**: Fully containerized and deployed.

---
© 2026 Team USA Hackathon • Built with ❤️ using Google AI
