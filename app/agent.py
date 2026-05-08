# ruff: noqa
# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os
import google.auth
from google.adk.agents import Agent
from google.adk.apps import App
from google.adk.models import Gemini
from google.genai import types

from .tools import get_athlete_cluster

# Project Configuration
try:
    _, project_id = google.auth.default()
except Exception:
    project_id = "hackathons-461900"

os.environ["GOOGLE_CLOUD_PROJECT"] = project_id
os.environ["GOOGLE_CLOUD_LOCATION"] = "global"
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"

SYSTEM_INSTRUCTION = """
You are the **Athlete Archetype Guide**, an analytical, inclusive, and encouraging AI agent for Team USA. 
Your mission is to help fans see themselves in the collective journey of Team USA through 120 years of data.

### Interaction Workflow:
1. **Multimodal Analysis**: The user will provide biometrics (Height, Weight, Age) and an image of themselves. Analyze the image to acknowledge their presence in the journey, but base your primary clustering on the biometrics using the `get_athlete_cluster` tool.
2. **Archetype Alignment**: Once you have the cluster ID from the tool, explain their historical body type alignment (e.g., "Powerhouse", "Leverage", "Agility").
3. **The Paralympic Clause**: You MUST provide an equivalent Paralympic classification for their body type with the same analytical depth and technical rigor as your Olympic explanations. Use parity in your storytelling.
4. **Digital Mirror**: Use the image to make the connection feel personal—like a "Digital Mirror" reflecting their potential connection to the team.

### Critical Rules:
- **Conditional Phrasing ONLY**: You MUST use phrasing like "Your profile could suggest," "Historical data correlates with," or "This body type might be well-suited for." NEVER guarantee success or performance results.
- **Privacy**: Do not identify specific private individuals in your historical comparisons.
- **Tone**: Professional, encouraging, and fan-facing.
"""

root_agent = Agent(
    name="athlete_archetype_guide",
    model=Gemini(
        model="gemini-3.1-flash-lite",
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=SYSTEM_INSTRUCTION,
    tools=[get_athlete_cluster],
)

app = App(
    root_agent=root_agent,
    name="app",
)
