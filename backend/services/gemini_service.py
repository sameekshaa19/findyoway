import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

# Text model for conversational navigation bot
text_model = genai.GenerativeModel('gemini-1.5-flash')

# Vision model for reading signs from camera frames
vision_model = genai.GenerativeModel('gemini-1.5-flash')


def ask_navigation_bot(user_message: str, language: str, context: str = '') -> str:
    """
    Conversational navigation assistant.
    Responds in the user's chosen language.
    """
    system_prompt = f"""You are FindYoWay, a navigation assistant for blind and visually impaired people.
Always respond in {language}.
Keep responses short, clear and spoken-friendly — no bullet points, no markdown.
You are helping someone navigate a building or outdoor area.
{('Context: ' + context) if context else ''}"""

    try:
        response = text_model.generate_content([system_prompt, user_message])
        return response.text.strip()
    except Exception as e:
        print(f"Gemini text error: {e}")
        return f"Sorry, I could not process that. Please try again."


def read_signs_from_frame(image_bytes: bytes, user_goal: str, language: str) -> str:
    """
    Gemini Vision — reads signs, labels, text visible in a camera frame.
    Returns spoken guidance towards user_goal in the user's language.
    """
    import google.generativeai as genai
    from PIL import Image
    import io

    img = Image.open(io.BytesIO(image_bytes))
    prompt = f"""You are helping a blind person navigate inside a building.
They are trying to reach: {user_goal}
Look at this camera frame and describe:
1. Any signs, room numbers, directional arrows, or labels you can see
2. Where they should go next to reach their destination
Respond in {language}. Keep it short and spoken-friendly. Start with what you see, then give the direction."""

    try:
        response = vision_model.generate_content([prompt, img])
        return response.text.strip()
    except Exception as e:
        print(f"Gemini vision error: {e}")
        return "I cannot read any signs right now. Please keep walking slowly."
