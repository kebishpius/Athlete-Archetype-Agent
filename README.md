# USA Athlete Archetype Guide

An AI-powered Streamlit web application that allows fans to input their biometric data (Height, Weight, and Age) to discover their historical athlete archetype based on 120 years of Olympic data.

## Overview

The application utilizes:
- **BigQuery ML** (`Olympic_Data.athlete_archetypes`) to cluster users into specific athlete archetypes based on historic biometric records.
- **Google Gemini 2.5 Flash** to dynamically generate personalized, encouraging, and analytical profiles comparing the user's biometrics to both Olympic and Paralympic athletes.
- **Streamlit** for the frontend, featuring a modern, generative-AI inspired UI with badges for suggested sport matches.

## Getting Started

### Prerequisites

Ensure you have the following installed:
- Python 3.8+
- Required packages (found in `requirements.txt`)
- Google Cloud credentials configured (for BigQuery access)
- Gemini API Key

### Installation

1. Clone this repository (if applicable) or download the source code.
2. Install the required Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Configuration

Ensure your `GEMINI_API_KEY` is set correctly in `app.py` or as an environment variable before running the application.

### Running the App

To start the local Streamlit server, run:
```bash
python -m streamlit run app.py
```
Then, open your web browser and navigate to `http://localhost:8501`.

## Usage
- Enter your **Height (cm)**, **Weight (kg)**, and **Age**.
- Click **"Generate Profile"**.
- View your unique historical archetype, detailed AI-generated profile, and Olympic/Paralympic sport recommendations presented via clean UI badges.
