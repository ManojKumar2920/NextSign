'use client'
import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import { FaMicrophone, FaMicrophoneSlash, FaDownload, FaHistory, FaQuestionCircle, FaPlay, FaPause } from "react-icons/fa";

// Define types for our application data
interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

interface FrameData {
  pose: Landmark[];
  left_hand: Landmark[];
  right_hand: Landmark[];
}

interface Sequence {
  frames: FrameData[];
}

interface SignSequenceData {
  sequences: Sequence[];
}

interface HistoryItem {
  text: string;
  timestamp: Date;
}

// Constants for drawing
const FRAME_WIDTH = 640;
const FRAME_HEIGHT = 480;
const POSE_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 7],  // right arm
  [0, 4], [4, 5], [5, 6], [6, 8],  // left arm
  [9, 10],  // shoulders
  [11, 12], [12, 14], [14, 16],  // right leg
  [11, 13], [13, 15],  // left leg
  [11, 23], [12, 24],  // torso
  [23, 24], [23, 25], [24, 26],  // hips
  [25, 27], [27, 29], [26, 28], [28, 30]  // feet
];

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],      // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],      // Index
  [0, 9], [9, 10], [10, 11], [11, 12], // Middle
  [0, 13], [13, 14], [14, 15], [15, 16],  // Ring
  [0, 17], [17, 18], [18, 19], [19, 20]   // Pinky
];

// Declare global interfaces
declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}

export default function Home() {
  const [input, setInput] = useState<string>("");
  const [signSequence, setSignSequence] = useState<SignSequenceData | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [translationSpeed, setTranslationSpeed] = useState<number>(1);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [totalFrames, setTotalFrames] = useState<number>(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const frameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const serverBaseUrl = "http://localhost:8000";

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
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

  // Function to draw landmarks on canvas
  const drawLandmarks = useCallback((
    ctx: CanvasRenderingContext2D, 
    landmarks: Landmark[] | undefined, 
    color: string, 
    radius: number = 3, 
    connections: [number, number][] | null = null
  ) => {
    if (!landmarks || landmarks.length === 0) return;
    
    // Draw circles
    for (const lm of landmarks) {
      const x = Math.floor(lm.x * FRAME_WIDTH);
      const y = Math.floor(lm.y * FRAME_HEIGHT);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    }

    // Draw connections if provided
    if (connections) {
      for (const [startIdx, endIdx] of connections) {
        if (startIdx < landmarks.length && endIdx < landmarks.length) {
          const x1 = Math.floor(landmarks[startIdx].x * FRAME_WIDTH);
          const y1 = Math.floor(landmarks[startIdx].y * FRAME_HEIGHT);
          const x2 = Math.floor(landmarks[endIdx].x * FRAME_WIDTH);
          const y2 = Math.floor(landmarks[endIdx].y * FRAME_HEIGHT);
          
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }
  }, []);

  // Function to render a single frame
  const renderFrame = useCallback((frameData: FrameData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw landmarks
    drawLandmarks(ctx, frameData.pose, 'rgb(255, 0, 0)', 3, POSE_CONNECTIONS);
    drawLandmarks(ctx, frameData.left_hand, 'rgb(0, 255, 0)', 3, HAND_CONNECTIONS);
    drawLandmarks(ctx, frameData.right_hand, 'rgb(0, 0, 255)', 3, HAND_CONNECTIONS);
  }, [drawLandmarks]);

  // Function to handle animation playback
  const startAnimation = useCallback(() => {
    if (!signSequence || !signSequence.sequences || signSequence.sequences.length === 0) return;
    
    setIsPlaying(true);
    setIsPaused(false);
    
    // Flatten all frames from all sequences
    const allFrames = signSequence.sequences.flatMap(seq => seq.frames);
    setTotalFrames(allFrames.length);
    
    let frameIndex = 0;
    const fps = 20 * translationSpeed; // Adjust FPS based on speed
    const frameDelay = 1000 / fps;
    
    // Start recording if canvas is available
    if (canvasRef.current && window.MediaRecorder) {
      try {
        const stream = canvasRef.current.captureStream(fps);
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        mediaRecorderRef.current = recorder;
        recordedChunksRef.current = [];
        
        recorder.ondataavailable = (e: BlobEvent) => {
          if (e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };
        
        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          setRecordedBlob(blob);
        };
        
        recorder.start();
      } catch (err) {
        console.error("Recording not supported:", err);
      }
    }
    
    // Animation loop
    const animate = () => {
      if (frameIndex >= allFrames.length) {
        // Animation complete, loop back to start
        frameIndex = 0;
        
        // Stop and restart recorder to create a complete recording
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          setTimeout(() => {
            if (isPlaying && !isPaused && canvasRef.current && window.MediaRecorder) {
              try {
                const stream = canvasRef.current.captureStream(fps);
                const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
                mediaRecorderRef.current = recorder;
                recordedChunksRef.current = [];
                
                recorder.ondataavailable = (e: BlobEvent) => {
                  if (e.data.size > 0) {
                    recordedChunksRef.current.push(e.data);
                  }
                };
                
                recorder.onstop = () => {
                  const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                  setRecordedBlob(blob);
                };
                
                recorder.start();
              } catch (err) {
                console.error("Recording not supported:", err);
              }
            }
          }, 100);
        }
      }
      
      renderFrame(allFrames[frameIndex]);
      setCurrentFrame(frameIndex);
      
      frameIndex++;
      frameTimerRef.current = setTimeout(() => {
        if (isPlaying && !isPaused) {
          animationRef.current = requestAnimationFrame(animate);
        }
      }, frameDelay);
    };
    
    // Start animation
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (frameTimerRef.current) {
        clearTimeout(frameTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [signSequence, translationSpeed, renderFrame, isPlaying, isPaused]);

  // Effect to handle sequence fetch
  useEffect(() => {
    if (!input.trim()) {
      setSignSequence(null);
      return;
    }

    const fetchSequence = async () => {
      setLoading(true);
      setError(null);
      setSignSequence(null);

      try {
        const formData = new FormData();
        formData.append("text", input);

        const response = await fetch(`${serverBaseUrl}/get-sign-sequence`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Failed to get sign sequence");
        }

        const data = await response.json();
        setSignSequence(data);
        
        // Add to history only if translation was successful
        if (input.trim()) {
          setHistory(prev => {
            const newHistory = [...prev, {text: input, timestamp: new Date()}].slice(-10);
            localStorage.setItem('translationHistory', JSON.stringify(newHistory));
            return newHistory;
          });
        }
      } catch (err: any) {
        setError(err.message || "Failed to get sign sequence");
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchSequence, 500);
    return () => clearTimeout(timeoutId);
  }, [input]);

  // Start animation when sequence is loaded
  useEffect(() => {
    if (signSequence && signSequence.sequences && signSequence.sequences.length > 0) {
      // Stop any existing animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (frameTimerRef.current) {
        clearTimeout(frameTimerRef.current);
      }
      
      // Start new animation
      const cleanupFn = startAnimation();
      return cleanupFn;
    }
  }, [signSequence, startAnimation]);

  // Effect for handling playback speed changes
  useEffect(() => {
    if (signSequence && isPlaying) {
      // Restart animation with new speed
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (frameTimerRef.current) {
        clearTimeout(frameTimerRef.current);
      }
      
      // Small delay to ensure clean restart
      setTimeout(() => {
        startAnimation();
      }, 50);
    }
  }, [translationSpeed, startAnimation, signSequence, isPlaying]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const togglePlayPause = () => {
    if (isPaused) {
      setIsPaused(false);
      startAnimation();
    } else {
      setIsPaused(true);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (frameTimerRef.current) {
        clearTimeout(frameTimerRef.current);
      }
    }
  };

  const handleHistoryItemClick = (text: string) => {
    setInput(text);
    setShowHistory(false);
  };

  const handleSpeedChange = (speed: number) => {
    setTranslationSpeed(speed);
  };

  const handleDownload = () => {
    if (!recordedBlob) return;
    
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sign_language_${input.slice(0, 10).replace(/\s+/g, '_') || 'video'}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-50 flex items-center justify-center p-6">
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
              <li>The sign language animation will generate automatically</li>
              <li>Use playback controls to pause/play or adjust speed</li>
              <li>Download animations for offline viewing</li>
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
                    <h3 className="font-semibold text-gray-700">Recent Translations</h3>
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
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Quick Phrases</h3>
              <div className="flex flex-wrap gap-2">
                {["Hello", "Thank you", "How are you?", "Nice to meet you", "Please"].map((phrase) => (
                  <button
                    key={phrase}
                    className="px-3 py-1 bg-blue-50 cursor-pointer hover:bg-blue-100 text-blue-700 rounded-full text-sm transition-all"
                    onClick={() => setInput(phrase)}
                  >
                    {phrase}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Canvas Output */}
          <div className="p-8 bg-gradient-to-b from-gray-50 to-white flex flex-col items-center justify-center relative">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 nohemi-bold">Sign Language Translation</h2>
            
            <div className="w-full max-w-md">
              <div className="relative rounded-lg overflow-hidden shadow-lg">
                <canvas 
                  ref={canvasRef} 
                  width={FRAME_WIDTH} 
                  height={FRAME_HEIGHT} 
                  className="w-full rounded-lg bg-white"
                />
                
                {/* Canvas controls overlay */}
                {signSequence && (
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
                        className={`p-2 cursor-pointer rounded-full transition-all duration-200 ${
                          recordedBlob ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-300'
                        }`}
                        title="Download Animation"
                        disabled={!recordedBlob}
                      >
                        <FaDownload className="text-white" size={14} />
                      </button>
                    </div>
                  </div>
                )}
                {!signSequence && !loading && (
                  <div className="bg-gray-100 absolute z-50 top-0 inset-0 rounded-lg p-8 w-full flex flex-col items-center justify-center text-center">
                    <div className="rounded-full bg-gray-200 p-4 mb-4">
                      <FaMicrophone className="text-gray-400" size={24} />
                    </div>
                    <p className="text-gray-500">
                      Start typing or speaking to see your translation
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-4 text-center">
                {signSequence ? (
                  <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    Translation Ready
                  </span>
                ) : loading ? (
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium animate-pulse">
                    Loading translation...
                  </span>
                ) : (
                  <div></div>
                )}
              </div>
            </div>
            
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