import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './VoiceCloning.css';

const VoiceCloning = () => {
  const navigate = useNavigate();
  const [text, setText] = useState('Behind every powerful technology lies a chain');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConvertingAudio, setIsConvertingAudio] = useState(false);
  const [processedAudio, setProcessedAudio] = useState(null);
  const [processedAudioFormat, setProcessedAudioFormat] = useState('wav');
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [apiStatus, setApiStatus] = useState('unknown'); // 'unknown', 'connected', 'disconnected'
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const intervalRef = useRef(null);
  const fileInputRef = useRef(null);

  // ChatterboxTTS API configuration
  const CHATTERBOX_API_BASE_URL = 'http://localhost:5001/api';
  const ALLOWED_API_ENDPOINTS = [
    `${CHATTERBOX_API_BASE_URL}/health`,
    `${CHATTERBOX_API_BASE_URL}/test-speech`,
    `${CHATTERBOX_API_BASE_URL}/generate-speech`,
    `${CHATTERBOX_API_BASE_URL}/generate-text-only`
  ];

  useEffect(() => {
    // Test API connection on component mount
    testApiConnection();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Security function to validate API endpoints
  const isValidChatterboxEndpoint = (url) => {
    return ALLOWED_API_ENDPOINTS.includes(url);
  };

  // Function to convert recorded audio to proper WAV format
  const convertToWav = async (audioBlob) => {
    try {
      // Create an audio context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Convert blob to array buffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Decode the audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Convert to WAV format
      const wavBlob = audioBufferToWav(audioBuffer);
      
      console.log('Successfully converted audio to WAV format');
      console.log('Original size:', audioBlob.size, 'bytes');
      console.log('Converted size:', wavBlob.size, 'bytes');
      
      return wavBlob;
    } catch (error) {
      console.error('Audio conversion failed:', error);
      throw new Error('Failed to convert audio to WAV format');
    }
  };

  // Function to convert AudioBuffer to WAV blob
  const audioBufferToWav = (audioBuffer) => {
    const numberOfChannels = 1; // Force mono
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    const writeUint32 = (offset, value) => {
      view.setUint32(offset, value, true);
    };
    
    const writeUint16 = (offset, value) => {
      view.setUint16(offset, value, true);
    };
    
    // RIFF chunk descriptor
    writeString(0, 'RIFF');
    writeUint32(4, 36 + length * 2);
    writeString(8, 'WAVE');
    
    // FMT sub-chunk
    writeString(12, 'fmt ');
    writeUint32(16, 16);
    writeUint16(20, 1); // PCM format
    writeUint16(22, numberOfChannels);
    writeUint32(24, sampleRate);
    writeUint32(28, sampleRate * numberOfChannels * 2);
    writeUint16(32, numberOfChannels * 2);
    writeUint16(34, 16); // 16 bits per sample
    
    // Data sub-chunk
    writeString(36, 'data');
    writeUint32(40, length * 2);
    
    // Convert audio data to 16-bit PCM
    const channelData = audioBuffer.getChannelData(0); // Get first channel (mono)
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  const testApiConnection = async () => {
    try {
      const apiUrl = `${CHATTERBOX_API_BASE_URL}/health`;
      
      // Security check: Ensure we're only calling ChatterboxTTS API
      if (!isValidChatterboxEndpoint(apiUrl)) {
        throw new Error('Unauthorized API endpoint');
      }

      const response = await fetch(apiUrl);
      if (response.ok) {
        setApiStatus('connected');
      } else {
        setApiStatus('disconnected');
      }
    } catch (err) {
      setApiStatus('disconnected');
      console.error('API connection test failed:', err);
    }
  };

  const testVoiceCloning = async () => {
    setIsProcessing(true);
    setError('');
    setSuccessMessage('');

    try {
      console.log('Testing ChatterboxTTS API...');
      const apiUrl = `${CHATTERBOX_API_BASE_URL}/test-speech`;
      
      // Security check: Ensure we're only calling ChatterboxTTS API
      if (!isValidChatterboxEndpoint(apiUrl)) {
        throw new Error('Unauthorized API endpoint');
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
      });

      console.log('Test response status:', response.status);

      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || `Test failed: ${response.status}`;
        } catch {
          errorMessage = `Test failed: ${response.status} - ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const audioBlob = await response.blob();
      console.log('Test audio blob received:', audioBlob.size, 'bytes');
      
      setProcessedAudio(audioBlob);
      setSuccessMessage('ChatterboxTTS test completed successfully! 🎉');

    } catch (err) {
      console.error('ChatterboxTTS test error:', err);
      setError(`Test failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        setIsConvertingAudio(true);
        try {
          const originalAudioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          console.log('Original recorded audio:', originalAudioBlob.type, originalAudioBlob.size, 'bytes');
          
          // Convert to proper WAV format
          const wavAudioBlob = await convertToWav(originalAudioBlob);
          console.log('Converted to WAV:', wavAudioBlob.type, wavAudioBlob.size, 'bytes');
          
          setRecordedAudio(wavAudioBlob);
          setSuccessMessage('Audio recorded and converted to WAV format successfully! 🎉');
        } catch (conversionError) {
          console.error('Audio conversion failed:', conversionError);
          // Fallback to original blob if conversion fails
          const fallbackBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          setRecordedAudio(fallbackBlob);
          setError('Audio conversion failed, but recording saved. Voice cloning may not work properly.');
        } finally {
          setIsConvertingAudio(false);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      setError('Error accessing microphone. Please check permissions.');
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(intervalRef.current);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file type
      const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/m4a', 'audio/flac', 'audio/ogg', 'audio/aac'];
      const fileExtension = file.name.toLowerCase().split('.').pop();
      const allowedExtensions = ['wav', 'mp3', 'm4a', 'flac', 'ogg', 'aac'];
      
      if (allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension)) {
        setAudioFile(file);
        setRecordedAudio(null);
        setError('');
        console.log(`Uploaded audio file: ${file.name} (${file.type || 'type unknown'}, ${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      } else {
        setError(`Please select a valid audio file. Supported formats: ${allowedExtensions.join(', ').toUpperCase()}`);
      }
    }
  };

  const handleTextChange = (event) => {
    setText(event.target.value);
    setError('');
  };

  const runVoiceCloning = async () => {
    if (!text.trim()) {
      setError('Please enter text to synthesize.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccessMessage('');

    try {
      const formData = new FormData();
      formData.append('text', text);
      
      // Prepare API URL first for security logging
      const apiUrl = `${CHATTERBOX_API_BASE_URL}/generate-speech`;
      
      // Add audio prompt if available (recorded or uploaded)
      if (recordedAudio || audioFile) {
        const audioToUse = recordedAudio || audioFile;
        
        console.log('Speech generation request details:');
        console.log('- Text length:', text.length);
        console.log('- Audio source:', recordedAudio ? 'recorded (browser-converted)' : 'uploaded');
        console.log('- Audio type:', audioToUse.type);
        console.log('- Audio size:', audioToUse.size, 'bytes');
        console.log('- SECURITY: Audio will ONLY be sent to ChatterboxTTS API at', apiUrl);
        
        // Ensure we have a proper filename with extension
        let filename = 'voice_prompt.wav';
        if (audioFile && audioFile.name) {
          filename = audioFile.name;
        } else if (recordedAudio) {
          filename = 'browser_recorded_voice.wav'; // Proper name for converted audio
        }
        
        formData.append('audio', audioToUse, filename);
        console.log('Using voice cloning with audio prompt - SECURE TRANSMISSION TO CHATTERBOX API ONLY');
        console.log('Audio format verified as:', audioToUse.type);
      } else {
        console.log('Generating speech with default voice (no audio prompt)');
      }

      console.log('Sending request to ChatterboxTTS API...');
      
      // Security check: Ensure we're only calling ChatterboxTTS API
      if (!isValidChatterboxEndpoint(apiUrl)) {
        throw new Error('Unauthorized API endpoint - audio data will not be sent');
      }

      // Call the ChatterboxTTS API endpoint
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || `Server error: ${response.status}`;
        } catch {
          errorMessage = `Server error: ${response.status} - ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Get the processed audio
      const audioBlob = await response.blob();
      console.log('Received audio blob:', audioBlob.size, 'bytes');
      
      setProcessedAudio(audioBlob);
      setProcessedAudioFormat('wav'); // ChatterboxTTS always outputs WAV
      
      const hasVoiceCloning = recordedAudio || audioFile;
      const message = hasVoiceCloning 
        ? 'Voice cloning with ChatterboxTTS completed successfully! 🎉'
        : 'Text-to-speech with ChatterboxTTS completed successfully! 🎉';
      setSuccessMessage(message);

    } catch (err) {
      console.error('Speech generation error:', err);
      setError(`Speech generation failed: ${err.message}. Please check the console for more details.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const runTextOnlyGeneration = async () => {
    if (!text.trim()) {
      setError('Please enter text to synthesize.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccessMessage('');

    try {
      const formData = new FormData();
      formData.append('text', text);

      console.log('Sending text-only request to ChatterboxTTS API...');
      const apiUrl = `${CHATTERBOX_API_BASE_URL}/generate-text-only`;
      
      // Security check: Ensure we're only calling ChatterboxTTS API
      if (!isValidChatterboxEndpoint(apiUrl)) {
        throw new Error('Unauthorized API endpoint');
      }

      // Call the text-only API endpoint
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || `Server error: ${response.status}`;
        } catch {
          errorMessage = `Server error: ${response.status} - ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Get the processed audio
      const audioBlob = await response.blob();
      console.log('Received audio blob:', audioBlob.size, 'bytes');
      
      setProcessedAudio(audioBlob);
      setProcessedAudioFormat('wav');
      setSuccessMessage('Text-only speech generation completed successfully! 🎉');

    } catch (err) {
      console.error('Text-only generation error:', err);
      setError(`Text-only generation failed: ${err.message}. Please check the console for more details.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAudio = () => {
    if (processedAudio) {
      const url = URL.createObjectURL(processedAudio);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cloned_voice.${processedAudioFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const downloadRecordedAudio = () => {
    if (recordedAudio) {
      const url = URL.createObjectURL(recordedAudio);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `recorded_voice_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const playAudio = (audioBlob) => {
    const url = URL.createObjectURL(audioBlob);
    const audio = new Audio(url);
    audio.play();
    audio.onended = () => URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    setText('');
    setRecordedAudio(null);
    setAudioFile(null);
    setProcessedAudio(null);
    setProcessedAudioFormat('wav');
    setError('');
    setSuccessMessage('');
    setRecordingTime(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const goBack = () => {
    navigate('/dashboard');
  };

  return (
    <div className="voice-cloning-container">
      {/* Header */}
      <div className="voice-cloning-header">
        <button className="back-button" onClick={goBack}>
          <i className="fas fa-arrow-left"></i> Back to Dashboard
        </button>
        <h1>AI Voice Cloning</h1>
        <p>Clone any voice with AI-powered text-to-speech technology</p>
        
        {/* API Status Indicator */}
        <div className={`api-status ${apiStatus}`}>
          <i className={`fas ${apiStatus === 'connected' ? 'fa-check-circle' : apiStatus === 'disconnected' ? 'fa-exclamation-triangle' : 'fa-spinner fa-spin'}`}></i>
          <span>
            {apiStatus === 'connected' && 'API Connected'}
            {apiStatus === 'disconnected' && 'API Disconnected - Please start the Python server'}
            {apiStatus === 'unknown' && 'Checking API connection...'}
          </span>
          {apiStatus === 'disconnected' && (
            <button className="retry-connection" onClick={testApiConnection}>
              <i className="fas fa-redo"></i> Retry
            </button>
          )}
        </div>
      </div>

      <div className="voice-cloning-content">
        {/* Text Input Section */}
        <div className="section text-section">
          <h2><i className="fas fa-edit"></i> Enter Text</h2>
          <textarea
            value={text}
            onChange={handleTextChange}
            placeholder="Enter the text you want to synthesize with the cloned voice..."
            rows={6}
            className="text-input"
          />
          <div className="character-count">
            {text.length} characters
          </div>
        </div>

        {/* Voice Input Section */}
        <div className="section voice-section">
          <h2><i className="fas fa-microphone"></i> Voice Reference (Optional)</h2>
          <p className="section-description">Record your voice or upload an audio file for voice cloning. Leave empty for default voice.</p>
          
          <div className="voice-input-methods">
            {/* Recording */}
            <div className="recording-area">
              <h3>Record Voice</h3>
              <div className="recording-controls">
                <button
                  className={`record-btn ${isRecording ? 'recording' : ''}`}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                >
                  <i className={`fas ${isRecording ? 'fa-stop' : 'fa-microphone'}`}></i>
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </button>
                
                {isRecording && (
                  <div className="recording-indicator">
                    <div className="recording-dot"></div>
                    <span>Recording: {formatTime(recordingTime)}</span>
                  </div>
                )}
                
                {isConvertingAudio && (
                  <div className="converting-indicator">
                    <i className="fas fa-spinner fa-spin"></i>
                    <span>Converting audio to WAV format...</span>
                  </div>
                )}
              </div>

              {recordedAudio && (
                <div className="audio-preview">
                  <div className="audio-info">
                    <i className="fas fa-check-circle"></i>
                    <span>Voice recorded successfully</span>
                  </div>
                  <div className="audio-controls">
                    <button
                      className="play-btn"
                      onClick={() => playAudio(recordedAudio)}
                      disabled={isProcessing}
                    >
                      <i className="fas fa-play"></i> Play Recording
                    </button>
                    <button
                      className="download-btn"
                      onClick={downloadRecordedAudio}
                      disabled={isProcessing}
                    >
                      <i className="fas fa-download"></i> Download
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="divider">OR</div>

            {/* File Upload */}
            <div className="upload-area">
              <h3>Upload Audio File</h3>
              <label className="upload-label">
                <input
                  type="file"
                  accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg,.aac"
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  disabled={isProcessing}
                />
                <div className="upload-box">
                  <i className="fas fa-cloud-upload-alt"></i>
                  <span>Click to upload audio file</span>
                  <small>Supports MP3, WAV, M4A, FLAC, OGG, AAC formats</small>
                </div>
              </label>

              {audioFile && (
                <div className="audio-preview">
                  <div className="audio-info">
                    <i className="fas fa-file-audio"></i>
                    <span>{audioFile.name}</span>
                  </div>
                  <button
                    className="play-btn"
                    onClick={() => playAudio(audioFile)}
                    disabled={isProcessing}
                  >
                    <i className="fas fa-play"></i> Play File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="section action-section">
          <div className="action-buttons">
            <button
              className="clone-btn primary"
              onClick={runVoiceCloning}
              disabled={isProcessing || !text.trim() || apiStatus !== 'connected'}
            >
              {isProcessing ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Processing...
                </>
              ) : apiStatus !== 'connected' ? (
                <>
                  <i className="fas fa-exclamation-triangle"></i>
                  API Disconnected
                </>
              ) : (recordedAudio || audioFile) ? (
                <>
                  <i className="fas fa-magic"></i>
                  Generate with Voice Cloning
                </>
              ) : (
                <>
                  <i className="fas fa-volume-up"></i>
                  Generate Speech
                </>
              )}
            </button>

        

            <button
              className="reset-btn secondary"
              onClick={resetAll}
              disabled={isProcessing}
            >
              <i className="fas fa-redo"></i>
              Reset All
            </button>
          </div>
        </div>

        {/* Results Section */}
        {(processedAudio || error || successMessage) && (
          <div className="section results-section">
            <h2><i className="fas fa-volume-up"></i> Results</h2>
            
            {error && (
              <div className="error-message">
                <i className="fas fa-exclamation-triangle"></i>
                {error}
              </div>
            )}

            {successMessage && (
              <div className="success-message">
                <i className="fas fa-check-circle"></i>
                {successMessage}
              </div>
            )}

            {processedAudio && (
              <div className="processed-audio">
                <div className="audio-info">
                  <i className="fas fa-file-audio"></i>
                  <span>Generated audio file ({processedAudioFormat.toUpperCase()})</span>
                  <small>{(processedAudio.size / 1024 / 1024).toFixed(2)} MB</small>
                </div>
                <div className="audio-controls">
                  <button
                    className="play-btn large"
                    onClick={() => playAudio(processedAudio)}
                  >
                    <i className="fas fa-play"></i>
                    Play Cloned Voice
                  </button>
                  
                  <button
                    className="download-btn"
                    onClick={downloadAudio}
                  >
                    <i className="fas fa-download"></i>
                    Download {processedAudioFormat.toUpperCase()}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceCloning;
