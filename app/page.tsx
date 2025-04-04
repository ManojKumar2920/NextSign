'use client'
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { FaMicrophone, FaMicrophoneSlash, FaDownload, FaHistory, FaQuestionCircle, FaPlay, FaPause } from "react-icons/fa";

export default function Home() {
  const [input, setInput] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [directVideoUrl, setDirectVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playbackSuccess, setPlaybackSuccess] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [history, setHistory] = useState<{text: string, timestamp: Date}[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [translationSpeed, setTranslationSpeed] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const serverBaseUrl = "http://localhost:8000";
  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognition.onerror = (event: any) => {
        setError('Speech recognition failed');
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Handle video generation
  useEffect(() => {
    if (!input.trim()) {
      setVideoUrl(null);
      setDirectVideoUrl(null);
      return;
    }

    const generateVideo = async () => {
      setLoading(true);
      setError(null);
      setVideoUrl(null);
      setDirectVideoUrl(null);
      setPlaybackSuccess(false);

      try {
        const formData = new FormData();
        formData.append("text", input);

        const response = await fetch(`${serverBaseUrl}/generate-sign-video`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Failed to generate video");
        }

        const data = await response.json();
        
        let standardUrl = data.video_url;
        if (!standardUrl.startsWith('http')) {
          standardUrl = `${serverBaseUrl}${standardUrl}`;
        }

        const filename = standardUrl.split('/').pop();
        const directUrl = `${serverBaseUrl}/direct-video/${filename}`;
        const timestamp = new Date().getTime();
        
        setVideoUrl(`${standardUrl}?t=${timestamp}`);
        setDirectVideoUrl(`${directUrl}?t=${timestamp}`);
        
        // Add to history only if translation was successful
        if (input.trim()) {
          setHistory(prev => {
            const newHistory = [...prev, {text: input, timestamp: new Date()}].slice(-10);
            localStorage.setItem('translationHistory', JSON.stringify(newHistory));
            return newHistory;
          });
        }
      } catch (err: any) {
        setError(err.message || "Failed to generate video");
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(generateVideo, 500);
    return () => clearTimeout(timeoutId);
  }, [input]);

  // Load history from localStorage on initial render
  useEffect(() => {
    const savedHistory = localStorage.getItem('translationHistory');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        // Convert string timestamps back to Date objects
        const processedHistory = parsedHistory.map((item: any) => ({
          text: item.text,
          timestamp: new Date(item.timestamp)
        }));
        setHistory(processedHistory);
      } catch (e) {
        console.error("Failed to parse history:", e);
      }
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleVideoSuccess = () => {
    setPlaybackSuccess(true);
    if (videoRef.current) {
      videoRef.current.playbackRate = translationSpeed;
      videoRef.current.play();
    }
  };

  const handleVideoError = () => {
    if (videoUrl && !playbackSuccess && directVideoUrl) {
      setVideoUrl(directVideoUrl);
    }
  };

  const handleDownload = async () => {
    if (!videoUrl) return;

    try {
      // Fetch the video as a blob
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error("Failed to fetch video for download");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `sign_language_${input.slice(0, 10).replace(/\s+/g, '_') || 'video'}.mp4`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      setError("Failed to download video");
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
      setIsPaused(!isPaused);
    }
  };

  const handleHistoryItemClick = (text: string) => {
    setInput(text);
    setShowHistory(false);
  };

  const handleSpeedChange = (speed: number) => {
    setTranslationSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  return (
    <div className="min-h-screen  bg-gradient-to-br from-blue-100 to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl mt-20 bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all hover:shadow-3xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-400 p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="bg-white p-2 rounded-full shadow-md mr-4">
                <span role="img" aria-label="sign language" className="text-2xl">👋</span>
              </div>
              <div>
                <h1 className="text-3xl font-extrabold nohemi-bold text-white">
                  NextSign Translator
                </h1>
                <p className="text-blue-100 text-sm mt-1">
                  Instantly translate text or speech into sign language
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowTutorial(!showTutorial)}
              className="p-2 rounded-full cursor-pointer bg-blue-500 bg-opacity-30 hover:bg-opacity-50 text-white transition-all duration-300"
              title="How to use"
            >
              <FaQuestionCircle size={20} />
            </button>
          </div>
        </div>

        {/* Tutorial Overlay */}
        {showTutorial && (
          <div className="bg-indigo-50 p-4 border-b border-indigo-100">
            <h3 className="text-lg font-semibold text-indigo-800 mb-2">How to Use</h3>
            <ol className="list-decimal list-inside text-sm text-indigo-700 space-y-1">
              <li>Type text or click the microphone icon to use voice input</li>
              <li>The sign language video will generate automatically</li>
              <li>Use playback controls to pause/play or adjust speed</li>
              <li>Download videos for offline viewing</li>
              <li>Access your recent translations from the history button</li>
            </ol>
            <button 
              className="mt-3 text-indigo-600 font-medium text-sm hover:text-indigo-800"
              onClick={() => setShowTutorial(false)}
            >
              Got it
            </button>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Left Panel - Input */}
          <div className="p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800 nohemi-bold">Your Text</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="p-2 rounded-full cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all duration-300"
                    title="Translation History"
                  >
                    <FaHistory size={18} />
                  </button>
                  <button
                    onClick={toggleListening}
                    className={`p-2 rounded-full cursor-pointer text-white transition-all duration-300 ${
                      isListening
                        ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                        : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                    title={isListening ? 'Stop Listening' : 'Start Voice Input'}
                  >
                    {isListening ? <FaMicrophoneSlash size={18} /> : <FaMicrophone size={18} />}
                  </button>
                </div>
              </div>
              
              {/* History Dropdown */}
              {showHistory && (
                <div className="bg-white rounded-lg shadow-lg mb-4 absolute z-10 w-64 max-h-64 overflow-y-auto">
                  <div className="p-3 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-700 ">Recent Translations</h3>
                  </div>
                  {history.length > 0 ? (
                    <ul className="divide-y divide-gray-100">
                      {history.map((item, index) => (
                        <li 
                          key={index} 
                          className="p-3 hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleHistoryItemClick(item.text)}
                        >
                          <p className="text-sm font-medium text-gray-700 truncate">{item.text}</p>
                          <p className="text-xs text-gray-500">
                            {item.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="p-3 text-sm text-gray-500 italic">No history yet</p>
                  )}
                </div>
              )}
              
              <textarea
                className="w-full h-60 p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 resize-none shadow-inner"
                placeholder="Type or speak your message here..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              
              <div className="mt-4 text-center">
                {isListening && (
                  <span className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium animate-pulse">
                    Listening...
                  </span>
                )}
                {loading && (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    <span className="text-blue-600 text-sm font-medium">Translating</span>
                  </div>
                )}
                {error && (
                  <p className="text-red-500 text-sm font-medium">{error}</p>
                )}
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2 ">Quick Phrases</h3>
              <div className="flex flex-wrap gap-2">
                {["Hello", "Thank you", "How are you?", "Nice to meet you", "Please"].map((phrase) => (
                  <button
                    key={phrase}
                    className="px-3 py-1 bg-blue-50 cursor-pointer
                     hover:bg-blue-100 text-blue-700 rounded-full text-sm transition-all"
                    onClick={() => setInput(phrase)}
                  >
                    {phrase}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Video Output */}
          <div className="p-8 bg-gradient-to-b from-gray-50 to-white flex flex-col items-center justify-center relative">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 nohemi-bold">Sign Language Translation</h2>
            
            {videoUrl ? (
              <div className="w-full max-w-md">
                <div className="relative rounded-lg overflow-hidden shadow-lg">
                  <video
                    ref={videoRef}
                    className="w-full rounded-lg"
                    key={videoUrl}
                    autoPlay
                    loop
                    muted
                    onCanPlay={handleVideoSuccess}
                    onError={handleVideoError}
                  >
                    <source src={videoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                  
                  {/* Video controls overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 flex justify-between items-center">
                    <button
                      onClick={togglePlayPause}
                      className="text-white cursor-pointer hover:text-blue-200 transition-colors"
                      title={isPaused ? "Play" : "Pause"}
                    >
                      {isPaused ? <FaPlay size={16} /> : <FaPause size={16} />}
                    </button>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-white text-xs">Speed:</span>
                      <div className="flex space-x-1">
                        {[0.5, 1, 1.5].map(speed => (
                          <button
                            key={speed}
                            onClick={() => handleSpeedChange(speed)}
                            className={`text-xs px-2 py-1 cursor-pointer rounded ${
                              translationSpeed === speed 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-white/30 text-white hover:bg-white/40'
                            }`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                      
                      <button
                        onClick={handleDownload}
                        className="bg-blue-500 p-2 cursor-pointer rounded-full hover:bg-blue-600 transition-all duration-200"
                        title="Download Video"
                      >
                        <FaDownload className="text-white" size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 text-center">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    playbackSuccess 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-blue-100 text-blue-700 animate-pulse'
                  }`}>
                    {playbackSuccess ? 'Translation Ready' : 'Loading translation...'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-gray-100 rounded-lg p-8 w-full max-w-md h-64 flex flex-col items-center justify-center text-center">
                <div className="rounded-full bg-gray-200 p-4 mb-4">
                  <FaMicrophone className="text-gray-400" size={24} />
                </div>
                <p className="text-gray-500">
                  Start typing or speaking to see your translation
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Your translated sign language video will appear here
                </p>
              </div>
            )}
            
            {/* Tips box */}
            <div className="mt-6 bg-blue-50 p-4 rounded-lg text-sm w-full max-w-md">
              <h3 className="font-medium text-blue-700 mb-1">Tips for Better Translations</h3>
              <ul className="text-blue-600 text-xs space-y-1">
                <li>• Speak clearly and at a moderate pace</li>
                <li>• Use short, simple sentences</li>
                <li>• Avoid complex jargon or technical terms</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center text-xs text-gray-500">
          NextSign • Learn more about sign language at{" "}
          <Link href="https://islrtc.nic.in/" className="text-blue-500 hover:underline">ISLRTC</Link>
        </div>
      </div>
    </div>
  );
}