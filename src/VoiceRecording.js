import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './VoiceRecording.css';

const VoiceRecording = () => {
  const navigate = useNavigate();
  const [timer, setTimer] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const intervalRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Cleanup any active recording
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  const updateTimerDisplay = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    setTimer({
      hours: hrs,
      minutes: mins,
      seconds: secs
    });
  };

  const startTimer = async () => {
    if (!isPaused) return;
    
    try {
      setError('');
      // Get microphone access and start recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setRecordedAudio(audioBlob);
        setUploadedFile(null); // Clear uploaded file when recording
        setSuccessMessage('Audio recorded successfully! You can now save or download it.');
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsPaused(false);
      setIsRecording(true);
      
      intervalRef.current = setInterval(() => {
        setTotalSeconds(prev => {
          const newTotal = prev + 1;
          updateTimerDisplay(newTotal);
          return newTotal;
        });
      }, 1000);
    } catch (err) {
      setError('Error accessing microphone. Please check permissions and try again.');
      console.error('Error accessing microphone:', err);
    }
  };

  const pauseTimer = () => {
    setIsPaused(true);
    setIsRecording(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
    }
  };

  const resumeTimer = () => {
    if (isPaused && mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      setIsPaused(false);
      setIsRecording(true);
      mediaRecorderRef.current.resume();
      
      intervalRef.current = setInterval(() => {
        setTotalSeconds(prev => {
          const newTotal = prev + 1;
          updateTimerDisplay(newTotal);
          return newTotal;
        });
      }, 1000);
    }
  };

  const stopTimer = () => {
    setIsPaused(true);
    setIsRecording(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setTotalSeconds(0);
    updateTimerDisplay(0);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Clear any existing recorded audio when uploading
      setRecordedAudio(null);
      setUploadedFile(file);
      setError('');
      setSuccessMessage(`File "${file.name}" uploaded successfully!`);
    }
  };

  const handleSave = () => {
    const audioToDownload = recordedAudio || uploadedFile;
    if (audioToDownload) {
      downloadAudio(audioToDownload);
    } else {
      setError('No audio to save. Please record audio or upload a file first.');
    }
  };

  const downloadAudio = (audioBlob) => {
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = recordedAudio ? `recorded_audio_${timestamp}.wav` : `uploaded_${uploadedFile.name}`;
    a.download = filename;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setSuccessMessage(`Audio downloaded as ${filename}`);
  };

  const playAudio = (audioBlob) => {
    const url = URL.createObjectURL(audioBlob);
    const audio = new Audio(url);
    audio.play();
    audio.onended = () => URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    // Stop any active recording
    if (mediaRecorderRef.current && (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')) {
      mediaRecorderRef.current.stop();
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    setRecordedAudio(null);
    setUploadedFile(null);
    setError('');
    setSuccessMessage('');
    setTotalSeconds(0);
    setIsRecording(false);
    setIsPaused(true);
    updateTimerDisplay(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const goBack = () => {
    navigate('/dashboard');
  };

  const formatTime = (value) => {
    return value.toString().padStart(2, '0');
  };

  return (
    <div className="voice-recording-container">
      <aside className="recording-sidebar">
        <h1 className="recording-logo">VocalGenX</h1>

        <button className="draft-btn">
          <i className="fa-solid fa-file-lines"></i>
          DRAFT
        </button>

        <label className="upload-btn">
          Upload
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="audio/*"
            hidden 
          />
        </label>

        {uploadedFile && (
          <div className="filename-display">
            <div className="audio-info">
              <i className="fa-solid fa-file-audio"></i>
              <span>Selected: {uploadedFile.name}</span>
            </div>
            <button
              className="play-btn-small"
              onClick={() => playAudio(uploadedFile)}
            >
              <i className="fa-solid fa-play"></i>
            </button>
          </div>
        )}

        {recordedAudio && (
          <div className="filename-display">
            <div className="audio-info">
              <i className="fa-solid fa-microphone"></i>
              <span>Recorded Audio Ready</span>
            </div>
            <button
              className="play-btn-small"
              onClick={() => playAudio(recordedAudio)}
            >
              <i className="fa-solid fa-play"></i>
            </button>
          </div>
        )}

        <div className="sidebar-extra">
          <div className="sidebar-item">
            <i className="fa-solid fa-circle-info"></i>
            <span>Audio Info</span>
          </div>
          <div className="sidebar-item">
            <i className="fa-solid fa-file-alt"></i>
            <span>Transcript</span>
          </div>
          <div className="sidebar-item">
            <i className="fa-solid fa-clock-rotate-left"></i>
            <span>History</span>
          </div>
          <div className="sidebar-item">
            <i className="fa-solid fa-gear"></i>
            <span>Settings</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="action-buttons">
          {(recordedAudio || uploadedFile) && (
            <button className="reset-btn" onClick={resetAll}>
              <i className="fa-solid fa-refresh"></i>
              Reset
            </button>
          )}
        </div>

        <button className="go-back" onClick={goBack}>
          ← Go Back
        </button>
      </aside>

      <main className="recorder-section">
        <div className="top-bar">
          <button 
            className="save-btn" 
            onClick={handleSave}
            disabled={!recordedAudio && !uploadedFile}
          >
            <i className="fa-solid fa-download"></i>
            Download
          </button>
          <select 
            className="language-select"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
          >
            <option value="">Select language</option>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="error-message">
            <i className="fa-solid fa-exclamation-triangle"></i>
            {error}
          </div>
        )}

        {successMessage && (
          <div className="success-message">
            <i className="fa-solid fa-check-circle"></i>
            {successMessage}
          </div>
        )}

        <div className="mic-container">
          <i className={`fa-solid fa-microphone mic-icon ${isRecording ? 'recording' : ''}`}></i>
          {isRecording && (
            <div className="recording-indicator">
              <div className="recording-dot"></div>
              <span>Recording...</span>
            </div>
          )}
          {mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused' && (
            <div className="paused-indicator">
              <i className="fa-solid fa-pause"></i>
              <span>Recording Paused</span>
            </div>
          )}
        </div>

        <div className="waveform">
          {[...Array(10)].map((_, index) => (
            <div 
              key={index} 
              className={`bar ${isRecording ? 'active' : ''}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            ></div>
          ))}
        </div>

        <p className="timer">
          {formatTime(timer.hours)}:{formatTime(timer.minutes)}:{formatTime(timer.seconds)}
        </p>

       

        <div className="controls">
          <button 
            onClick={startTimer} 
            disabled={isRecording || (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused')}
            className={isRecording ? 'active' : ''}
          >
            <i className="fa-solid fa-play"></i>
            Start Recording
          </button>
          <button 
            onClick={isPaused && mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused' ? resumeTimer : pauseTimer}
            disabled={!isRecording && !(mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused')}
            className={!isPaused ? 'active' : ''}
          >
            <i className={`fa-solid ${isPaused && mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused' ? 'fa-play' : 'fa-pause'}`}></i>
            {isPaused && mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused' ? 'Resume' : 'Pause'}
          </button>
          <button onClick={stopTimer}>
            <i className="fa-solid fa-stop"></i>
            Stop
          </button>
        </div>

        {/* Audio Preview Section */}
        {(recordedAudio || uploadedFile) && (
          <div className="audio-preview-section">
            <h3>Audio Preview</h3>
            <div className="audio-controls">
              <button 
                className="play-btn-large"
                onClick={() => playAudio(recordedAudio || uploadedFile)}
              >
                <i className="fa-solid fa-play"></i>
                Play Audio
              </button>
              <button 
                className="download-btn-large"
                onClick={handleSave}
              >
                <i className="fa-solid fa-download"></i>
                Download Audio
              </button>
            </div>
            <div className="audio-info">
              <span>
                {recordedAudio ? 'Recorded Audio' : `Uploaded: ${uploadedFile.name}`}
              </span>
              <small>
                {recordedAudio 
                  ? `Duration: ${formatTime(timer.hours)}:${formatTime(timer.minutes)}:${formatTime(timer.seconds)}`
                  : `Size: ${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB`
                }
              </small>
            </div>
          </div>
        )}
      </main>

    
    </div>
  );
};

export default VoiceRecording;
