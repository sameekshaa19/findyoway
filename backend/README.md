# Findyoway Backend

This is the Flask backend for the Findyoway application, featuring integrations with Gemini Pro and Gemini Pro Vision.

## Setup Instructions

### 1. Get a Free Gemini API Key
To use the voice and vision features, you will need a Google Gemini API key:
- Go to [Google AI Studio](https://aistudio.google.com/)
- Sign in and create a free API key.
- Open the `.env` file in this folder and replace `your-key-here` with your actual API key.

### 2. Install Dependencies
Make sure you have Python installed. Then run:
```bash
pip install -r requirements.txt
```

### 3. Run the Server
Start the Flask server on port 5000:
```bash
python app.py
```

### 4. Expose to the Internet (For testing with Mobile App)
If you are testing from a physical mobile device, you might need to expose your local server using ngrok:
```bash
ngrok http 5000
```
This will give you a public URL (e.g., `https://<random>.ngrok.io`) that you can use in your React Native app instead of `localhost` or `10.0.2.2`.
