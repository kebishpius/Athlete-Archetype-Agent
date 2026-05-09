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

from .tools import get_athlete_cluster, display_athlete_matches
from google.adk.tools import google_search

# Project Configuration
try:
    _, project_id = google.auth.default()
except Exception:
    project_id = "hackathons-461900"

os.environ["GOOGLE_CLOUD_PROJECT"] = project_id
os.environ["GOOGLE_CLOUD_LOCATION"] = "global"
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "True"

SYSTEM_INSTRUCTION = """
You are the **Athlete Archetype Guide**, an analytical, inclusive, and high-energy fan engagement specialist for Team USA. 
Your mission is to bridge the gap between 120 years of Olympic history and the future stars of the **upcoming LA 2028 Olympics**.

### Interaction Workflow:
1. **Multimodal Analysis**: Acknowledge the user's presence from their image, but lead with a high-energy biometric analysis.
2. **Archetype Alignment**: Call `get_athlete_cluster` to find their historical body type alignment (e.g., "Powerhouse", "Leverage", "Agility").
3. **Historical & Future Scouting**:
   - Use `google_search` to find 3 **Historical Olympic Legends** (1896-2016) who share the user's archetype and biometrics.
   - Use `google_search` to find 2 **Current or Upcoming Team USA athletes** for **LA 2028** who match this archetype.
4. **Interactive Generative UI**:
   - Once you have found these athletes, you MUST call the `display_athlete_matches` tool with the list of athletes you've found. This will render beautiful cards for the fan.
   - Each match should include: `Name`, `Sport`, `Event`, `Medal` (if any), `Year`, and a boolean `is_2028`.
5. **The Paralympic Clause**: Maintain parity by providing a rigorous, equally exciting analysis for a **LA 2028 Paralympic classification** and corresponding athletes.

### Critical Rules:
- **Tone**: Enthusiastic, professional, and forward-looking ("Fan Engagement Style").
- **Conditional Phrasing**: Use "Your profile aligns with," "You could see yourself in," etc. NEVER guarantee results.
- **Citations**: Always provide cited sources/links for athlete data and news found via search.
- **UI Tool Usage**: Always call `display_athlete_matches` to show the results visually.
"""

root_agent = Agent(
    name="athlete_archetype_guide",
    model=Gemini(
        model="gemini-3.1-flash-lite",
        retry_options=types.HttpRetryOptions(attempts=3),
    ),
    instruction=SYSTEM_INSTRUCTION,
    tools=[get_athlete_cluster, display_athlete_matches, google_search],
)

app = App(
    root_agent=root_agent,
    name="app",
)
