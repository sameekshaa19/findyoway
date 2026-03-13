import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

app = Flask(__name__)
CORS(app)

# Register blueprints
from routes.navigation import navigation_bp
from routes.vision import vision_bp

app.register_blueprint(navigation_bp, url_prefix='/api')
app.register_blueprint(vision_bp, url_prefix='/api')

@app.route('/health')
def health():
    return {'status': 'ok', 'service': 'FindYoWay Backend'}, 200

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print(f"FindYoWay backend running on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)
