"""Nano-banana Image Generation Service
Two-step pipeline using Vertex AI:
  1. Gemini Flash describes the user's likeness from their uploaded photo
  2. Nano Banana 2 (Gemini 3.1 Flash Image) generates a cinematic Team USA action shot using that description
"""
import os
import base64
import io
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import google.auth
from google import genai
from google.genai import types
import vertexai
import PIL.Image

app = FastAPI(title="Nano-banana Image Gen Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Resolve project from ADC (same as the main app)
try:
    _, PROJECT_ID = google.auth.default()
except Exception:
    PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "hackathons-461900")

LOCATION = os.environ.get("GOOGLE_CLOUD_REGION", "global")

# Initialize Vertex AI
vertexai.init(project=PROJECT_ID, location=LOCATION)

# Unified GenAI client for Gemini vision (step 1) and Nano Banana 2 (step 2)
genai_client = genai.Client(
    vertexai=True,
    project=PROJECT_ID,
    location=LOCATION,
)


class ImageGenRequest(BaseModel):
    image_base64: str        # Raw base64 (no data: prefix)
    image_mime_type: str     # e.g. "image/jpeg"
    sport: str               # e.g. "Gymnastics"
    athlete_name: str        # e.g. "Simone Biles"
    archetype_name: str      # e.g. "The Agile Acrobat"


@app.post("/generate-action-shot")
async def generate_action_shot(request: ImageGenRequest):
    try:
        img_bytes = base64.b64decode(request.image_base64)

        # ── STEP 1: Use Gemini to describe the user's likeness ──
        likeness_prompt = (
            "Describe the overall athletic energy and physical build of this person "
            "for a stylized 3D animation character. Focus on their build, "
            "dynamic posture, and athletic presence. Do NOT describe specific "
            "facial features or personal identifiers. Focus on creating a "
            "heroic, stylized animation reference based on their energy."
        )

        vision_response = genai_client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=[
                types.Part.from_bytes(
                    data=img_bytes,
                    mime_type=request.image_mime_type
                ),
                types.Part.from_text(text=likeness_prompt),
            ]
        )
        likeness_description = vision_response.text.strip()

        # ── STEP 2: Generate the action shot with Nano Banana 2 ──
        action_prompt = (
            f"High-quality 3D animation style character (Pixar or Overwatch style) "
            f"competing in {request.sport}. The character is a stylized, heroic "
            f"representation of the {request.archetype_name} archetype. "
            f"The character has the following energy: {likeness_description}. "
            f"Wearing official stylized Team USA athletic uniform (red, white, and blue). "
            f"Dynamic action pose in a vibrant, stylized Olympic stadium arena. "
            f"Clean lines, 3D render, expressive lighting, completely fictional character. "
            f"NO real people, NO photorealism, NO individual athletes."
        )

        # ── STEP 2: Generate the animation via Gemini image generation ──
        # Use generate_content with IMAGE response modality
        img_response = genai_client.models.generate_content(
            model="gemini-3.1-flash-image-preview",
            contents=[action_prompt],
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
            )
        )

        # Extract inline image data from response parts
        image_part = None
        for part in img_response.candidates[0].content.parts:
            if part.inline_data is not None:
                image_part = part
                break

        if image_part is None:
            raise HTTPException(status_code=422, detail="Nano Banana 2 returned no image.")

        # Convert the inline_data bytes to base64 for the frontend
        b64 = base64.b64encode(image_part.inline_data.data).decode("utf-8")
        mime = image_part.inline_data.mime_type or "image/png"

        return {
            "success": True,
            "image_url": f"data:{mime};base64,{b64}"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[image_gen_app] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {"status": "ok", "project": PROJECT_ID, "location": LOCATION}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)