# Athlete Archetype Agent (Team USA Hackathon)

A premium, multimodal AI-powered platform that uses 120 years of historical Olympic and Paralympic data to help fans discover their "Athlete Archetype." 

Built with **Google ADK**, **React**, **Gemini 3.1 Flash-lite**, and **Imagen 3** for Challenge 4 of the Team USA Hackathon.

## Features

- **Layered Interaction**: A "Digital Mirror" entry point where users can either upload an image or capture a live photo via their webcam (with UI guides and flash effects) to begin their journey.
- **Multimodal Analysis**: Analyzes both user biometrics (Height, Weight, Age) and uploaded images using Gemini 3.1 Flash-lite.
- **Historical Clustering**: Integrates with **BigQuery ML** (`Olympic_Data.athlete_archetypes`) to map users to historical archetypes (e.g., Powerhouse, Leverage, Agility).
- **Victory Shot Generation**: Uses **Imagen 3** on Vertex AI to generate an AI-powered personalized action shot of the user competing in their specific sport.
- **Advanced Social Sharing**: Seamless cross-platform sharing (Twitter/X, Facebook, LinkedIn, Instagram) using the native Web Share API on mobile devices, and an automated clipboard copy flow for desktop users.
- **Paralympic Parity**: Provides equal analytical depth and technically rigorous explanations for Paralympic classifications.
- **Premium UI**: Modern Glassmorphism aesthetic with micro-animations (Framer Motion), interactive Radar Charts (Recharts), and a custom camera capture interface.

## Tech Stack

- **Frontend**: React (Vite), Framer Motion, Axios, Recharts, Lucide-React.
- **Backend (ADK Agent)**: Python (FastAPI), Google Agent Development Kit (ADK), `gemini-3.1-flash-lite`.
- **Backend (Image Gen)**: Python (FastAPI), Vertex AI Vision Models (`imagen-3.0-generate-002`).
- **Infrastructure**: Google Cloud Run (Single-container multi-stage build).
- **Data**: BigQuery ML.

## Architecture

The project runs on a dual-backend local architecture proxying to a unified frontend:
- **Port 5173**: React / Vite Frontend
- **Port 8000**: Main ADK Agent Server (FastAPI)
- **Port 8001**: Imagen 3 Generation Service (FastAPI)

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 20+
- Google Cloud CLI (`gcloud`) with active Application Default Credentials (`gcloud auth application-default login`)
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
   Run all services simultaneously:
   ```bash
   # Terminal 1: ADK Backend (FastAPI)
   python -m uvicorn app.fast_api_app:app --host 0.0.0.0 --port 8000
   
   # Terminal 2: Image Gen Service (FastAPI)
   python -m app.image_gen_app
   
   # Terminal 3: Frontend (Vite)
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
- **Vertex AI**: Native integration via ADK and Imagen 3.
- **Cloud Run**: Fully containerized and deployed.

---
© 2026 Team USA Hackathon • Built with ❤️ using Google AI
