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

import logging
import os

import google.auth
from fastapi import FastAPI
from google.adk.cli.fast_api import get_fast_api_app

from app.app_utils.telemetry import setup_telemetry
from app.app_utils.typing import Feedback

setup_telemetry()

# Resolve GCP project — fall back gracefully when running locally
try:
    _, project_id = google.auth.default()
except Exception:
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "hackathons-461900")

# Cloud Logging — only available when running on GCP / with valid ADC
try:
    from google.cloud import logging as google_cloud_logging
    logging_client = google_cloud_logging.Client(project=project_id)
    logger = logging_client.logger(__name__)
    _use_cloud_logging = True
except Exception:
    _local_logger = logging.getLogger(__name__)
    logger = None
    _use_cloud_logging = False

allow_origins = ["*"]

# Artifact bucket for ADK (created by Terraform, passed via env var)
logs_bucket_name = os.environ.get("LOGS_BUCKET_NAME")

AGENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# In-memory session configuration - no persistent storage
session_service_uri = None

artifact_service_uri = f"gs://{logs_bucket_name}" if logs_bucket_name else None

app: FastAPI = get_fast_api_app(
    agents_dir=AGENT_DIR,
    web=True,
    artifact_service_uri=artifact_service_uri,
    allow_origins=allow_origins,
    session_service_uri=session_service_uri,
    otel_to_cloud=_use_cloud_logging,
)
app.title = "athlete-archetype-agent"
app.description = "API for interacting with the Agent athlete-archetype-agent"


@app.post("/feedback")
def collect_feedback(feedback: Feedback) -> dict[str, str]:
    """Collect and log feedback.

    Args:
        feedback: The feedback data to log

    Returns:
        Success message
    """
    if _use_cloud_logging and logger:
        logger.log_struct(feedback.model_dump(), severity="INFO")
    else:
        logging.getLogger(__name__).info("Feedback: %s", feedback.model_dump())
    return {"status": "success"}


# Main execution
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
