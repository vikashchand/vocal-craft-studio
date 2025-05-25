import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import './App.css';
export default function TranscribeAudio() {
  const [audioFile, setAudioFile] = useState(null);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [transcription, setTranscription] = useState("");
  const [loading, setLoading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunks = useRef([]);
  const navigate = useNavigate();

  const handleAudioUpload = (e) => {
    const file = e.target.files[0];
    setAudioFile(file);
    setAudioBlob(null);
    setTranscription("");
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    chunks.current = [];

    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunks.current, { type: "audio/webm" });
      setAudioBlob(blob);
      setAudioFile(null);
    };

    mediaRecorderRef.current.start();
    setRecording(true);
    setTranscription("");
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  const transcribeAudio = async () => {
    setLoading(true);
    setTranscription("");

    const blob = audioBlob || audioFile;
    if (!blob) return alert("Please record or upload an audio file.");

    const formData = new FormData();
    formData.append("file", blob);

    try {
      // 1. Upload audio
      const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
        method: "POST",
        headers: {
          authorization: "68f5917a5a9440d2974051c231ccf18a",
        },
        body: blob,
      });
      const { upload_url } = await uploadRes.json();

      // 2. Start transcription
      const transcriptRes = await fetch("https://api.assemblyai.com/v2/transcript", {
        method: "POST",
        headers: {
          authorization: "68f5917a5a9440d2974051c231ccf18a",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ audio_url: upload_url }),
      });
      const { id } = await transcriptRes.json();

      // 3. Poll for completion
      let completed = false;
      while (!completed) {
        const pollingRes = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
          headers: {
            authorization: "68f5917a5a9440d2974051c231ccf18a",
          },
        });
        const data = await pollingRes.json();
        if (data.status === "completed") {
          setTranscription(data.text);
          completed = true;
        } else if (data.status === "error") {
          throw new Error(data.error);
        } else {
          await new Promise((res) => setTimeout(res, 2000));
        }
      }
    } catch (error) {
      console.error("Transcription error:", error);
      alert("Failed to transcribe audio.");
    } finally {
      setLoading(false);
    }
  };

  return (

 <div className="main">
            <div className="min-h-screen bg-gray-30 flex items-center justify-center p-4 main">
            
      <button
        onClick={() => navigate("/")}
        className="absolute top-4 left-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded shadow"
        style={{zIndex: 1000}}
      >
        Home
      </button>
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
       
        <h2 className="text-xl font-bold mb-4 text-center">Audio to Text Transcription</h2>

        <div className="mb-4">
          <label className="block mb-1 font-medium">Upload MP3 File</label>
          <input type="file" accept="audio/*" onChange={handleAudioUpload} />
        </div>

        <div className="mb-4">
          {!recording ? (
            <button
              onClick={startRecording}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Record Audio
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Stop Recording
            </button>
          )}
        </div>

        {(audioFile || audioBlob) && (
          <button
            onClick={transcribeAudio}
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 w-full"
          >
            {loading ? "Transcribing..." : "Transcribe"}
          </button>
        )}

        {transcription && (
          <div className="mt-6">
            <h3 className="font-semibold text-gray-700 mb-2">Transcription Result:</h3>
            <p className="bg-gray-100 p-3 rounded">{transcription}</p>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
