import React from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import TextToSpeech from "./TextToSpeech";
import AudiotoText from "./AudiotoText";
import Signup from "./Signup";
import Login from "./Login";
import Dashboard from "./Dashboard";
import VoiceRecording from "./VoiceRecording";
import VoiceCloning from "./VoiceCloning";
import "./App.css";

function Home() {
  const navigate = useNavigate();
  
  return (
    <div>
      <nav>
        <div className="logo">VocelGenX</div>
        <div className="nav-items">
          <a href="#resources">Resources</a>
          <a href="#student">Student</a>
          <a href="#document">Document</a>
          <a href="#solutions">Solutions</a>
          <a href="#login" onClick={(e) => { e.preventDefault(); navigate("/login"); }}>LogIn</a>
          <button onClick={() => navigate("/signup")}>Get Started</button>
        </div>
      </nav>
      
      <section className="hero">
        <div className="hero-container">
          <div className="column-left">
            <h1>Experience the pinnacle of lifelike audio with our AI</h1>
            <p>Featuring advanced text to speech and AI voice Generation</p>
            <div className="hero-buttons">
              <button onClick={() => navigate("/text-to-speech")}>Text to Speech</button>
              <button onClick={() => navigate("/clone-voice")}>Speech to Text</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/voice-recording" element={<VoiceRecording />} />
        <Route path="/voice-cloning" element={<VoiceCloning />} />
        <Route path="/text-to-speech" element={<TextToSpeech />} />
        <Route path="/audiotoText" element={<AudiotoText/>} />
      </Routes>
    </Router>
  );
}
