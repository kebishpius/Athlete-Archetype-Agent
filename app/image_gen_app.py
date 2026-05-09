"""
Nano-banana Image Generation Service
Two-step pipeline using Vertex AI:
  1. Gemini Flash describes the user's likeness from their uploaded photo
  2. Imagen 3 generates a cinematic Team USA action shot using that description
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
from vertexai.preview.vision_models import ImageGenerationModel
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

LOCATION = os.environ.get("GOOGLE_CLOUD_REGION", "us-central1")

# Initialize Vertex AI
vertexai.init(project=PROJECT_ID, location=LOCATION)

# GenAI client for Gemini vision (step 1)
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
            "Describe this person's physical appearance in vivid detail for an "
            "AI image generator. Include: face shape, skin tone, hair color and "
            "style, eye color if visible, approximate age, body type, and any "
            "distinctive features. Be specific and descriptive."
        )

        vision_response = genai_client.models.generate_content(
            model="gemini-2.0-flash-001",
            contents=[
                types.Part.from_bytes(
                    data=img_bytes,
                    mime_type=request.image_mime_type
                ),
                types.Part.from_text(text=likeness_prompt),
            ]
        )
        likeness_description = vision_response.text.strip()

        # ── STEP 2: Generate the action shot with Imagen 3 ──
        imagen_model = ImageGenerationModel.from_pretrained("imagen-3.0-generate-002")

        action_prompt = (
            f"Cinematic Olympic sports photograph of a Team USA athlete competing "
            f"in {request.sport}. The athlete looks like: {likeness_description}. "
            f"Wearing official red, white, and blue Team USA uniform. "
            f"Dramatic Olympic stadium backdrop, packed crowd, cinematic lighting, "
            f"heroic action pose inspired by {request.athlete_name}. "
            f"Hyper-realistic, 8K, social-media-ready square crop, "
            f"vibrant and inspirational."
        )

        images = imagen_model.generate_images(
            prompt=action_prompt,
            number_of_images=1,
            aspect_ratio="1:1",
            safety_filter_level="block_some",
            person_generation="allow_adult",
        )

        if not images.images:
            raise HTTPException(status_code=422, detail="Imagen returned no images.")

        # Convert to base64 for the frontend
        img_io = io.BytesIO()
        images[0]._pil_image.save(img_io, format="PNG")
        img_io.seek(0)
        b64 = base64.b64encode(img_io.read()).decode("utf-8")

        return {
            "success": True,
            "image_url": f"data:image/png;base64,{b64}"
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
