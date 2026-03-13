import base64
from flask import Blueprint, request, jsonify
from services.gemini_service import read_signs_from_frame

vision_bp = Blueprint('vision', __name__)


@vision_bp.route('/vision', methods=['POST'])
def vision():
    """
    POST /api/vision
    Body: { "frame": base64_string, "goal": str, "language": str }
    Returns: { "guidance": str }

    Mobile sends a base64-encoded JPEG frame from expo-camera.
    Gemini Vision reads visible signs and returns spoken navigation guidance.
    """
    data = request.get_json()
    if not data or 'frame' not in data:
        return jsonify({'error': 'frame field is required'}), 400

    try:
        image_bytes = base64.b64decode(data['frame'])
    except Exception:
        return jsonify({'error': 'Invalid base64 image data'}), 400

    goal = data.get('goal', 'my destination')
    language = data.get('language', 'English')

    guidance = read_signs_from_frame(image_bytes, goal, language)
    return jsonify({'guidance': guidance}), 200
