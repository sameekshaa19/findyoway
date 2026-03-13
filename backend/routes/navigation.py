from flask import Blueprint, request, jsonify
from services.gemini_service import ask_navigation_bot

navigation_bp = Blueprint('navigation', __name__)


@navigation_bp.route('/navigate', methods=['POST'])
def navigate():
    """
    POST /api/navigate
    Body: { "message": str, "language": str, "context": str (optional) }
    Returns: { "reply": str }
    """
    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({'error': 'message field is required'}), 400

    message = data.get('message', '')
    language = data.get('language', 'English')
    context = data.get('context', '')

    reply = ask_navigation_bot(message, language, context)
    return jsonify({'reply': reply}), 200
