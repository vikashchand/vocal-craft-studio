from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import torchaudio as ta
from chatterbox.tts import ChatterboxTTS
import os
import logging
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Initialize the TTS model
logger.info("Initializing ChatterboxTTS model...")
model = ChatterboxTTS.from_pretrained(device="cpu")
logger.info("Model initialized successfully!")

# Check model capabilities
try:
    import inspect
    sig = inspect.signature(model.generate)
    params = list(sig.parameters.keys())
    logger.info(f"Model generate method supports parameters: {params}")
    
    # Check if voice cloning is supported
    voice_cloning_params = ['audio_prompt_path', 'voice_prompt', 'speaker', 'reference_audio']
    supported_voice_params = [p for p in voice_cloning_params if p in params]
    
    if supported_voice_params:
        logger.info(f"Voice cloning supported with parameters: {supported_voice_params}")
    else:
        logger.warning("Voice cloning parameters not found - this model may not support voice cloning")
        
except Exception as inspect_error:
    logger.warning(f"Could not inspect model capabilities: {inspect_error}")

# Check ChatterboxTTS version
try:
    import chatterbox
    if hasattr(chatterbox, '__version__'):
        logger.info(f"ChatterboxTTS version: {chatterbox.__version__}")
    else:
        logger.info("ChatterboxTTS version not available")
except Exception as version_error:
    logger.warning(f"Could not get ChatterboxTTS version: {version_error}")

# Ensure output directory exists
OUTPUT_DIR = "outputs"
if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

# Fixed output filename to reuse the same file
OUTPUT_AUDIO_PATH = os.path.join(OUTPUT_DIR, "generated_voice.wav")

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "model_loaded": True
    })

@app.route('/api/generate-speech', methods=['POST'])
def generate_speech():
    """Generate speech using ChatterboxTTS with optional voice cloning"""
    try:
        # Get text from request
        text = request.form.get('text')
        if not text:
            return jsonify({"error": "No text provided"}), 400
        
        logger.info(f"Generating speech for text: {text[:50]}...")
        
        # Check if audio prompt is provided for voice cloning
        if 'audio' in request.files:
            audio_file = request.files['audio']
            if audio_file.filename != '':
                # Save the uploaded audio file as voice prompt
                audio_prompt_path = os.path.join(OUTPUT_DIR, "voice_prompt.wav")
                audio_file.save(audio_prompt_path)
                logger.info(f"Saved audio prompt to: {audio_prompt_path}")
                logger.info(f"Audio file size: {os.path.getsize(audio_prompt_path)} bytes")
                
                # Convert to WAV format using torchaudio to ensure compatibility
                try:
                    waveform, sample_rate = ta.load(audio_prompt_path)
                    logger.info(f"Loaded audio: shape={waveform.shape}, sample_rate={sample_rate}")
                    
                    # Ensure audio is mono and proper length for voice cloning
                    if waveform.shape[0] > 1:
                        waveform = waveform.mean(dim=0, keepdim=True)
                        logger.info("Converted stereo to mono")
                    
                    # Check audio duration (ChatterboxTTS typically works better with 3-10 seconds)
                    duration = waveform.shape[1] / sample_rate
                    logger.info(f"Audio duration: {duration:.2f} seconds")
                    
                    if duration < 1.0:
                        logger.warning("Audio duration is very short (< 1s), voice cloning may not work well")
                    elif duration > 30.0:
                        logger.warning("Audio duration is very long (> 30s), trimming to first 30 seconds")
                        waveform = waveform[:, :int(30 * sample_rate)]
                    
                    # Resave as proper WAV file
                    ta.save(audio_prompt_path, waveform, sample_rate)
                    logger.info("Processed and saved audio prompt")
                    
                except Exception as conv_error:
                    logger.error(f"Audio conversion failed: {conv_error}")
                    logger.error(f"Conversion traceback: {traceback.format_exc()}")
                    return jsonify({"error": f"Audio processing failed: {str(conv_error)}"}), 400
                
                # Generate speech with voice cloning
                try:
                    logger.info("Attempting voice cloning...")
                    wav = model.generate(text, audio_prompt_path=audio_prompt_path)
                    logger.info("Successfully generated speech with voice cloning!")
                    
                except Exception as gen_error:
                    logger.error(f"Voice cloning failed: {gen_error}")
                    logger.error(f"Voice cloning traceback: {traceback.format_exc()}")
                    
                    # Check if it's a specific ChatterboxTTS error
                    if "audio_prompt_path" in str(gen_error) or "voice" in str(gen_error).lower():
                        logger.error("Voice cloning not supported or audio format incompatible")
                        return jsonify({
                            "error": "Voice cloning failed. This may be due to: 1) ChatterboxTTS version doesn't support voice cloning, 2) Audio format incompatible, 3) Audio too short/long. Try with a 3-10 second clear voice sample."
                        }), 400
                    else:
                        # For other errors, fall back to default voice
                        logger.info("Falling back to default voice...")
                        wav = model.generate(text)
                        logger.info("Generated speech with default voice (fallback)")
            else:
                # Generate speech with default voice
                wav = model.generate(text)
                logger.info("Generated speech with default voice (no audio file)")
        else:
            # Generate speech with default voice
            wav = model.generate(text)
            logger.info("Generated speech with default voice (no audio prompt)")
        
        # Save to fixed output path (overwrites previous file)
        ta.save(OUTPUT_AUDIO_PATH, wav, model.sr)
        logger.info(f"Saved generated audio to: {OUTPUT_AUDIO_PATH}")
        
        # Return the generated audio file
        return send_file(
            OUTPUT_AUDIO_PATH,
            as_attachment=True,
            download_name="generated_voice.wav",
            mimetype="audio/wav"
        )
        
    except Exception as e:
        logger.error(f"Error generating speech: {e}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/test-voice-cloning', methods=['POST'])
def test_voice_cloning():
    """Test endpoint specifically for voice cloning functionality"""
    try:
        # Check if audio prompt is provided
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided for voice cloning test"}), 400
            
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({"error": "Empty audio file provided"}), 400
        
        # Use test text
        text = request.form.get('text', "Hello, this is a test of voice cloning technology.")
        
        # Save the uploaded audio file as voice prompt
        audio_prompt_path = os.path.join(OUTPUT_DIR, "test_voice_prompt.wav")
        audio_file.save(audio_prompt_path)
        logger.info(f"Test: Saved audio prompt to: {audio_prompt_path}")
        
        # Process audio
        try:
            waveform, sample_rate = ta.load(audio_prompt_path)
            logger.info(f"Test: Loaded audio - shape={waveform.shape}, sample_rate={sample_rate}")
            
            # Convert to mono if stereo
            if waveform.shape[0] > 1:
                waveform = waveform.mean(dim=0, keepdim=True)
                logger.info("Test: Converted to mono")
            
            duration = waveform.shape[1] / sample_rate
            logger.info(f"Test: Audio duration: {duration:.2f} seconds")
            
            # Save processed audio
            ta.save(audio_prompt_path, waveform, sample_rate)
            
        except Exception as process_error:
            logger.error(f"Test: Audio processing failed: {process_error}")
            return jsonify({"error": f"Audio processing failed: {str(process_error)}"}), 400
        
        # Test voice cloning
        try:
            logger.info("Test: Attempting voice cloning...")
            wav = model.generate(text, audio_prompt_path=audio_prompt_path)
            logger.info("Test: Voice cloning successful!")
            
            # Save result
            test_output_path = os.path.join(OUTPUT_DIR, "test_cloned_voice.wav")
            ta.save(test_output_path, wav, model.sr)
            
            return send_file(
                test_output_path,
                as_attachment=True,
                download_name="test_cloned_voice.wav",
                mimetype="audio/wav"
            )
            
        except Exception as clone_error:
            logger.error(f"Test: Voice cloning failed: {clone_error}")
            logger.error(f"Test: Full traceback: {traceback.format_exc()}")
            
            # Check ChatterboxTTS model capabilities
            try:
                # Try to inspect the model's generate method
                import inspect
                sig = inspect.signature(model.generate)
                params = list(sig.parameters.keys())
                logger.info(f"Model generate method parameters: {params}")
                
                if 'audio_prompt_path' not in params and 'voice_prompt' not in params and 'speaker' not in params:
                    return jsonify({
                        "error": "Voice cloning not supported by this ChatterboxTTS model version",
                        "model_params": params,
                        "suggestion": "Try updating ChatterboxTTS or use a model that supports voice cloning"
                    }), 400
                    
            except Exception as inspect_error:
                logger.warning(f"Could not inspect model: {inspect_error}")
            
            return jsonify({
                "error": f"Voice cloning test failed: {str(clone_error)}",
                "suggestion": "Check audio format, duration (3-10 seconds recommended), and ChatterboxTTS model version"
            }), 500
            
    except Exception as e:
        logger.error(f"Test voice cloning error: {e}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/test-speech', methods=['POST'])
def test_speech():
    """Test endpoint for speech generation"""
    try:
        # Use default test text
        text = "Behind every powerful technology lies a chain of human intentions."
        
        logger.info("Running test speech generation...")
        wav = model.generate(text)
        
        # Save to fixed output path
        ta.save(OUTPUT_AUDIO_PATH, wav, model.sr)
        logger.info(f"Test audio saved to: {OUTPUT_AUDIO_PATH}")
        
        return send_file(
            OUTPUT_AUDIO_PATH,
            as_attachment=True,
            download_name="test_voice.wav",
            mimetype="audio/wav"
        )
        
    except Exception as e:
        logger.error(f"Error in test speech generation: {e}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/generate-text-only', methods=['POST'])
def generate_text_only():
    """Generate speech from text only (no voice cloning) - for debugging"""
    try:
        # Get text from request
        text = request.form.get('text') or request.json.get('text') if request.json else None
        if not text:
            return jsonify({"error": "No text provided"}), 400
        
        logger.info(f"Generating speech (text-only) for: {text[:50]}...")
        
        # Generate speech with default voice only
        wav = model.generate(text)
        logger.info("Generated speech with default voice (text-only mode)")
        
        # Save to fixed output path (overwrites previous file)
        ta.save(OUTPUT_AUDIO_PATH, wav, model.sr)
        logger.info(f"Saved generated audio to: {OUTPUT_AUDIO_PATH}")
        
        # Return the generated audio file
        return send_file(
            OUTPUT_AUDIO_PATH,
            as_attachment=True,
            download_name="generated_voice.wav",
            mimetype="audio/wav"
        )
        
    except Exception as e:
        logger.error(f"Error generating speech (text-only): {e}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Starting ChatterboxTTS API server...")
    print(f"Output directory: {OUTPUT_DIR}")
    print(f"Fixed output file: {OUTPUT_AUDIO_PATH}")
    app.run(debug=True, host='https://vocal-craft-studio.vercel.app', port=5001)
