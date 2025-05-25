import React from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import TextToSpeech from "./TextToSpeech";
import CloneVoice from "./CloneVoice";

function Home() {
  const navigate = useNavigate();
  return (
    <div
      style={{
      
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        zIndex: '999',
      }} 
      className="main1"
    >
      <div className="mb-10 text-center  ">

     
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 drop-shadow-lg mb-2" style={{textShadow: '0 2px 8px #fff'}}>VocalCraft Studio</h1>
        <h2 className="text-lg md:text-xl font-medium text-black-700 mb-1">Text-to-Speech & Speech-to-Text Web App</h2>
        <p className="text-sm text-black-600 font-semibold">made by Bhoomika</p>
     
      <div className="flex flex-col md:flex-row gap-8 " >
        <div
          className="cursor-pointer bg-white bg-opacity-90 rounded-2xl shadow-xl p-8 flex flex-col items-center hover:scale-105 transition-transform w-72 "
          onClick={() => navigate("/text-to-speech")}
        >
          <h2 className="text-xl font-bold mb-2">Text to Speech</h2>
          <p className="text-gray-700 text-center">Convert your text to speech using browser or MP3 voices.</p>
        </div>
        <div
          className="cursor-pointer bg-white bg-opacity-90 rounded-2xl shadow-xl p-8 flex flex-col items-center hover:scale-105 transition-transform w-72"
          onClick={() => navigate("/clone-voice")}
        >
          <h2 className="text-xl font-bold mb-2">Speech to Text</h2>
          <p className="text-gray-700 text-center">Convert your speech to text.</p>
        </div>
      
      </div>
       </div>
    </div>
 
    
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/text-to-speech" element={<TextToSpeech />} />
        <Route path="/clone-voice" element={<CloneVoice />} />
      </Routes>
    </Router>
  );
}
