import { useState, useRef, useEffect } from "react";
import { Textarea } from "./components/ui/textarea";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import './App.css';
import {
    Volume2,
    Download,
    RefreshCw,
    Loader2,
    Play,
    Pause,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const VOICERSS_API_KEY = "7d30b157d5b84100b191ccf4eaa5a17d";

const VOICERSS_VOICES = [
    { label: "Linda (Female)", value: "Linda" },
    { label: "John (Male)", value: "John" },
];

export default function TextToSpeech() {
  const navigate = useNavigate();
    const [text, setText] = useState("");
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const [rate, setRate] = useState(1);
    const [voiceRSSVoice, setVoiceRSSVoice] = useState(VOICERSS_VOICES[0].value);
    const [browserVoices, setBrowserVoices] = useState([]);
    const [selectedBrowserVoiceURI, setSelectedBrowserVoiceURI] = useState("");
    const [hasSpoken, setHasSpoken] = useState(false);
    const utteranceRef = useRef(null);

    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            const englishVoices = voices.filter((v) =>
                v.lang.toLowerCase().startsWith("en")
            );
            setBrowserVoices(englishVoices);
            if (!selectedBrowserVoiceURI && englishVoices.length > 0) {
                setSelectedBrowserVoiceURI(englishVoices[0].voiceURI);
            }
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }, [selectedBrowserVoiceURI]);

    const speakText = () => {
        if (!text) return;

        setAudioUrl(null);
        setHasSpoken(true);
        setIsPaused(false);

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;

        const voice = browserVoices.find((v) => v.voiceURI === selectedBrowserVoiceURI);
        if (voice) {
            utterance.voice = voice;
        }

        utteranceRef.current = utterance;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
            setIsSpeaking(false);
            setIsPaused(false);
        };

        window.speechSynthesis.speak(utterance);
    };

    const togglePauseResume = () => {
        if (!isSpeaking && !isPaused) return;

        if (!isPaused) {
            window.speechSynthesis.pause();
            setIsPaused(true);
        } else {
            window.speechSynthesis.resume();
            setIsPaused(false);
        }
    };

    const stopSpeaking = () => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setIsPaused(false);
    };

    const generateAndOpenMp3 = () => {
        if (!text) return;
        setIsProcessing(true);
        setAudioUrl(null);

        try {
            const encodedText = encodeURIComponent(text);
            const speed = Math.round((rate - 0.5) * (10 / 1.5));
            const url = `https://api.voicerss.org/?key=${VOICERSS_API_KEY}&hl=en-us&src=${encodedText}&r=${speed}&c=MP3&f=44khz_16bit_stereo&v=${voiceRSSVoice}`;
            setAudioUrl(url);
            window.open(url, "_blank");
        } catch (error) {
            console.error("Error generating audio:", error);
            alert("Failed to generate audio from text.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleTextChange = (e) => {
        if (isSpeaking || isPaused) stopSpeaking();
        setText(e.target.value);
        setAudioUrl(null);
        setHasSpoken(false);
        setIsPaused(false);
    };

    const handleModify = () => {
        stopSpeaking();
        setHasSpoken(false);
    };

    return (
        <div className="main">
            <button
        onClick={() => navigate("/dashboard")}
        className="absolute top-4 left-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded shadow"
        style={{zIndex: 1000}}
      >
        Home
      </button>
            <div className="min-h-screen bg-gray-30 flex items-center justify-center p-4 main">
                <Card className="max-w-md w-full shadow-2xl p-6 bg-white rounded-2xl">
                    <CardContent>
                        <h1 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
                            Text to Speech Converter
                        </h1>
                       
                        <Textarea
                            value={text}
                            onChange={handleTextChange}
                            placeholder="Paste or type your text here..."
                            className="mb-20 h-40 text-base"
                        />

                        {text && (
                            <>
                                <div className="mb-4">
                                    <label className="block text-gray-600 font-medium mb-1">
                                        Speed: {rate.toFixed(1)}x
                                    </label>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="2"
                                        step="0.1"
                                        value={rate}
                                        onChange={(e) => setRate(parseFloat(e.target.value))}
                                        className="w-full accent-blue-500"
                                        disabled={isSpeaking || isProcessing}
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-gray-600 font-medium mb-1">
                                        Browser Voice (for speaking):
                                    </label>
                                    <select
                                        value={selectedBrowserVoiceURI}
                                        onChange={(e) => setSelectedBrowserVoiceURI(e.target.value)}
                                        disabled={isSpeaking || isProcessing}
                                        className="w-full border border-gray-300 rounded-md p-2"
                                    >
                                        {browserVoices.map((v) => (
                                            <option key={v.voiceURI} value={v.voiceURI}>
                                                {v.name} ({v.lang})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-gray-600 font-medium mb-1">
                                        VoiceRSS Voice (for MP3):
                                    </label>
                                    <select
                                        value={voiceRSSVoice}
                                        onChange={(e) => setVoiceRSSVoice(e.target.value)}
                                        disabled={isSpeaking || isProcessing}
                                        className="w-full border border-gray-300 rounded-md p-2"
                                    >
                                        {VOICERSS_VOICES.map(({ label, value }) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}

                        <div className="flex flex-wrap justify-center gap-4 mt-4">
                            {!hasSpoken && text && !isProcessing && (
                                <Button
                                    onClick={speakText}
                                    disabled={isSpeaking || !text}
                                    className="gap-1 px-5 py-1 text-sm font-medium"
                                >
                                    <Volume2 className="w-5 h-5" />
                                    Speak
                                </Button>
                            )}

                            {hasSpoken && !isProcessing && (
                                <>
                                    {isSpeaking || isPaused ? (
                                        <Button
                                            onClick={togglePauseResume}
                                            disabled={!isSpeaking && !isPaused}
                                            className={`gap-1 px-5 py-1 text-sm font-medium ${isPaused ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                                                } text-white`}
                                        >
                                            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                                            {isPaused ? "Resume" : "Pause"}
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={speakText}
                                            disabled={!text}
                                            className="gap-1 px-5 py-1 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                            <Play className="w-5 h-5" />
                                            Start
                                        </Button>
                                    )}

                                    <Button
                                        onClick={handleModify}
                                        className="gap-1 px-5 py-1 text-sm font-medium bg-yellow-500 hover:bg-yellow-600 text-white"
                                    >
                                        <RefreshCw className="w-5 h-5" />
                                        Modify
                                    </Button>

                                    <Button
                                        onClick={generateAndOpenMp3}
                                        className="gap-1 px-5 py-1 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        <Download className="w-5 h-5" />
                                        Generate & Download MP3
                                    </Button>
                                </>
                            )}

                            {isProcessing && (
                                <div className="flex items-center gap-2 text-blue-600 font-medium">
                                    <Loader2 className="animate-spin w-6 h-6" />
                                    Processing audio...
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
