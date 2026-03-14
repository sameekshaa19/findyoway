import os
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from PIL import Image
import io
from dotenv import load_dotenv
import cv2
import numpy as np

load_dotenv()  # Loads GEMINI_API_KEY from .env automatically

app = Flask(__name__)
CORS(app)

# Configure Gemini key from environment variable (set in .env or export)
api_key = os.environ.get("GEMINI_API_KEY", "YOUR_API_KEY_HERE")
genai.configure(api_key=api_key)

# Load MobileNet-SSD model for object detection
# Download model files if they don't exist
PROTOTXT_PATH = "MobileNetSSD_deploy.prototxt"
MODEL_PATH = "MobileNetSSD_deploy.caffemodel"
CLASS_NAMES = ["background", "aeroplane", "bicycle", "bird", "boat",
               "bottle", "bus", "car", "cat", "chair", "cow", "diningtable",
               "dog", "horse", "motorbike", "person", "pottedplant", "sheep",
               "sofa", "train", "tvmonitor"]

# Dangerous objects for visually impaired navigation
DANGEROUS_OBJECTS = ["person", "chair", "diningtable", "bottle", "sofa", "tvmonitor"]

def download_model():
    """Download MobileNet-SSD model files if not present."""
    prototxt_url = "https://raw.githubusercontent.com/chuanqi305/MobileNet-SSD/master/deploy.prototxt"
    model_url = "https://github.com/chuanqi305/MobileNet-SSD/raw/master/mobilenet_iter_73000.caffemodel"
    
    if not os.path.exists(PROTOTXT_PATH):
        import urllib.request
        print("Downloading MobileNet-SSD prototxt...")
        urllib.request.urlretrieve(prototxt_url, PROTOTXT_PATH)
    
    if not os.path.exists(MODEL_PATH):
        import urllib.request
        print("Downloading MobileNet-SSD model...")
        urllib.request.urlretrieve(model_url, MODEL_PATH)

# Download model on startup
download_model()

# Load the model
net = cv2.dnn.readNetFromCaffe(PROTOTXT_PATH, MODEL_PATH)

# ---------------------------------------------------------------------------
# /api/navigate  — spoken navigation queries (used by geminiService.askGemini)
# /chat          — alias kept for backward-compat
# ---------------------------------------------------------------------------
def _chat_logic(message, language="English", context=""):
    model = genai.GenerativeModel('gemini-1.5-flash')
    system_prompt = (
        f"You are a helpful indoor/outdoor navigation assistant. "
        f"Reply in {language}. Be concise — the response will be spoken aloud. "
        f"Context: {context}"
    )
    response = model.generate_content(f"{system_prompt}\n\nUser: {message}")
    return response.text

@app.route('/api/navigate', methods=['POST'])
def api_navigate():
    """Primary navigation chat endpoint (called by geminiService.js)."""
    try:
        data = request.json or {}
        message  = data.get('message', '')
        language = data.get('language', 'English')
        context  = data.get('context', '')
        if not message:
            return jsonify({"error": "message is required"}), 400
        reply = _chat_logic(message, language, context)
        return jsonify({"reply": reply}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/chat', methods=['POST'])
def chat():
    """Backward-compatible alias for /api/navigate."""
    try:
        data = request.json or {}
        message = data.get('message', '')
        if not message:
            return jsonify({"error": "message is required"}), 400
        reply = _chat_logic(message)
        return jsonify({"reply": reply}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------------------------------------
# /api/stt  — speech-to-text endpoint for VoiceBot component
# ---------------------------------------------------------------------------
@app.route('/api/stt', methods=['POST'])
def api_stt():
    """Speech-to-text endpoint - accepts audio file upload."""
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "audio file is required"}), 400
        
        audio_file = request.files['audio']
        language = request.form.get('language', 'English')
        
        # For demo purposes, return a placeholder transcript
        # In production, integrate with Google Cloud STT, Azure, or Whisper
        placeholder_transcripts = {
            'English': 'pharmacy',
            'Hindi': 'फार्मेसी',
            'Spanish': 'farmacia',
            'French': 'pharmacie'
        }
        
        transcript = placeholder_transcripts.get(language, 'pharmacy')
        
        return jsonify({"transcript": transcript}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------------------------------------
# /api/vision  — camera frame sign reading (used by geminiService.readSignsFromFrame)
# /read-signs  — alias kept for backward-compat (accepts multipart file upload)
# ---------------------------------------------------------------------------
def _vision_logic(image_bytes, goal="destination", language="English"):
    img = Image.open(io.BytesIO(image_bytes))
    model = genai.GenerativeModel('gemini-1.5-flash')
    prompt = (
        f"You are a navigation assistant for a visually impaired user. "
        f"The user is looking for: '{goal}'. "
        f"Look at the signs in this image and give a short spoken direction in {language}. "
        f"If no useful signs are visible, say 'No signs detected, keep walking slowly.'"
    )
    response = model.generate_content([prompt, img])
    return response.text

@app.route('/api/vision', methods=['POST'])
def api_vision():
    """Primary vision endpoint — accepts base64 JSON (called by geminiService.js)."""
    try:
        data = request.json or {}
        frame_b64 = data.get('frame', '')
        goal      = data.get('goal', 'destination')
        language  = data.get('language', 'English')
        if not frame_b64:
            return jsonify({"error": "frame is required"}), 400
        image_bytes = base64.b64decode(frame_b64)
        guidance = _vision_logic(image_bytes, goal, language)
        return jsonify({"guidance": guidance}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/read-signs', methods=['POST'])
def read_signs():
    """Backward-compatible alias — accepts multipart file upload."""
    try:
        if 'image' not in request.files:
            return jsonify({"error": "image file is required"}), 400
        image_bytes = request.files['image'].read()
        guidance = _vision_logic(image_bytes)
        return jsonify({"reply": guidance}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------------------------------------------------------------------
# /api/detect  — Real-time object detection endpoint
# ---------------------------------------------------------------------------
def estimate_distance(box_area, frame_area):
    """Estimate distance based on bounding box size."""
    ratio = box_area / frame_area
    if ratio > 0.3:
        return "very close"
    elif ratio > 0.15:
        return "about 1 to 2 meters"
    elif ratio > 0.05:
        return "about 3 to 4 meters"
    else:
        return "far away"

@app.route('/api/detect', methods=['POST'])
def api_detect():
    """Object detection endpoint — accepts base64 image, returns detected objects."""
    try:
        data = request.json or {}
        frame_b64 = data.get('frame', '')
        
        if not frame_b64:
            return jsonify({"error": "frame is required"}), 400
        
        # Decode base64 image
        image_bytes = base64.b64decode(frame_b64)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return jsonify({"error": "invalid image"}), 400
        
        (h, w) = image.shape[:2]
        frame_area = h * w
        
        # Prepare image for MobileNet-SSD
        blob = cv2.dnn.blobFromImage(cv2.resize(image, (300, 300)), 0.007843, (300, 300), 127.5)
        net.setInput(blob)
        detections = net.forward()
        
        objects = []
        for i in range(detections.shape[2]):
            confidence = detections[0, 0, i, 2]
            
            # Filter by confidence threshold
            if confidence > 0.5:
                idx = int(detections[0, 0, i, 1])
                class_name = CLASS_NAMES[idx]
                
                box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
                (startX, startY, endX, endY) = box.astype("int")
                
                # Calculate box area for distance estimation
                box_width = endX - startX
                box_height = endY - startY
                box_area = box_width * box_height
                
                distance = estimate_distance(box_area, frame_area)
                
                objects.append({
                    "name": class_name,
                    "score": float(confidence),
                    "distance": distance,
                    "isDangerous": class_name in DANGEROUS_OBJECTS,
                    "bbox": [int(startX), int(startY), int(box_width), int(box_height)]
                })
        
        # Sort by danger and confidence
        objects.sort(key=lambda x: (not x["isDangerous"], -x["score"]))
        
        return jsonify({
            "objects": objects,
            "count": len(objects)
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
