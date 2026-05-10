import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Upload, User, Activity, Award, ChevronRight, Loader2, Star, MapPin, Camera, Download, Share2, X, FlipHorizontal } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

import ReactMarkdown from 'react-markdown';

const MatchCard = ({ match }) => {
  const handleSearch = (e) => {
    e.stopPropagation();
    const query = `${match.Name} Olympic Event details`;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ y: -5, scale: 1.02 }}
      onClick={handleSearch}
      className="athlete-match-card"
      style={{ cursor: 'pointer' }}
    >
      <div className="card-header">
        <Activity size={16} color="var(--gold)" />
        <span>Recommended Olympic Event</span>
      </div>
      <h3>{match.Name}</h3>
      <div className="card-details">
        <p><Activity size={14} /> {match.Sport}</p>
        <p style={{ fontStyle: 'italic', opacity: 0.8 }}>{match.Event}</p>
      </div>
      <div className="card-footer-hint">
        <span>Click to explore event</span>
        <ChevronRight size={14} />
      </div>
    </motion.div>
  );
};

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const IMAGE_GEN_URL = import.meta.env.VITE_IMAGE_GEN_URL || 'http://localhost:8001';

function App() {
  const [step, setStep] = useState(1);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [biometrics, setBiometrics] = useState({ height: 180, weight: 75, age: 25 });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [userId, setUserId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [followUpMessage, setFollowUpMessage] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [agentStatus, setAgentStatus] = useState(null);
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState([
    { subject: 'Power', A: 0, B: 0 },
    { subject: 'Agility', A: 0, B: 0 },
    { subject: 'Endurance', A: 0, B: 0 },
    { subject: 'Speed', A: 0, B: 0 },
    { subject: 'Strategy', A: 0, B: 0 },
  ]);
  const [insight, setInsight] = useState("Your physical signature is being calculated...");
  const [victoryShot, setVictoryShot] = useState(null);
  const [isGeneratingShot, setIsGeneratingShot] = useState(false);
  const [shotError, setShotError] = useState(null);
  const victoryShotRef = useRef(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  // ── Camera state ──
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [cameraFacing, setCameraFacing] = useState('user'); // 'user' = front, 'environment' = back
  const [isCaptureFlash, setIsCaptureFlash] = useState(false);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const canvasRef = useRef(null);

  // Convert base64 data-URL to a File object
  const dataUrlToFile = (dataUrl, filename) => {
    const [header, data] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)[1];
    const binary = atob(data);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return new File([arr], filename, { type: mime });
  };

  const shareText = matches[0]
    ? `🏅 I just discovered my Olympic archetype — I'm built like ${matches[0].Name} in ${matches[0].Sport}! Find yours 👇 #Olympics #AthleteArchetype`
    : `🏅 I just discovered my Olympic archetype! #TeamUSA #Olympics #AthleteArchetype`;

  const showToast = (msg, duration = 4000) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), duration);
  };

  // Unified share handler:
  // 1. On mobile / Web Share API capable: hands the image file directly to the chosen app.
  // 2. On desktop: copies image to clipboard + opens the platform with pre-filled text.
  const handleShareToPlatform = async (platform) => {
    if (!victoryShot) return;

    const file = dataUrlToFile(victoryShot, 'TeamUSA_VictoryShot.png');

    // -- Mobile / native share path --
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'My Team USA Olympic Avatar', text: shareText });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // user cancelled
        // fall through to desktop path
      }
    }

    // -- Desktop path: clipboard + open platform --
    const platformUrls = {
      twitter:   `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
      facebook:  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://teamusa.org')}&quote=${encodeURIComponent(shareText)}`,
      linkedin:  `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://teamusa.org')}`,
      instagram: null, // no web intent; clipboard is the only path
    };

    // Try to copy image to clipboard so user can paste directly into the post
    let copied = false;
    try {
      const res = await fetch(victoryShot);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      copied = true;
    } catch {
      // Clipboard API not supported or denied
    }

    const url = platformUrls[platform];
    if (url) window.open(url, '_blank');

    if (copied) {
      showToast(`📋 Olympic Avatar copied! Paste it (Ctrl+V / ⌘V) into your ${platform === 'twitter' ? 'tweet' : platform === 'instagram' ? 'Instagram story' : 'post'}.`);
    } else {
      showToast(`💡 Download the image and attach it to your post manually.`);
    }
  };

  // ── Camera helpers ──
  const startCamera = async (facing = cameraFacing) => {
    setCameraError(null);
    try {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setCameraError('Camera access denied. Please allow camera permissions and try again.');
    }
  };

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    setShowCamera(false);
    setCameraError(null);
  };

  const flipCamera = () => {
    const next = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(next);
    startCamera(next);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    // Mirror front camera so captured image matches what user sees
    if (cameraFacing === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    // Flash animation
    setIsCaptureFlash(true);
    setTimeout(() => setIsCaptureFlash(false), 300);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    // Build a File object so the rest of the app treats it like an upload
    const arr = dataUrl.split(',');
    const bstr = atob(arr[1]);
    const bytes = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) bytes[i] = bstr.charCodeAt(i);
    const file = new File([bytes], 'camera-shot.jpg', { type: 'image/jpeg' });

    setImage(file);
    setImagePreview(dataUrl);
    stopCamera();
    setStep(2);
  };

  // Attach stream to video element whenever camera modal opens
  useEffect(() => {
    if (showCamera) {
      startCamera(cameraFacing);
    }
    return () => {
      if (!showCamera && cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
        cameraStreamRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCamera]);

  const handleRestart = () => {
    setStep(1);
    setImage(null);
    setImagePreview(null);
    setBiometrics({ height: 180, weight: 75, age: 25 });
    setLoading(false);
    setResult(null);
    setChatHistory([]);
    setUserId(null);
    setSessionId(null);
    setFollowUpMessage('');
    setStreamingText('');
    setAgentStatus(null);
    setMatches([]);
    setStats([
      { subject: 'Power', A: 0, B: 0 },
      { subject: 'Agility', A: 0, B: 0 },
      { subject: 'Endurance', A: 0, B: 0 },
      { subject: 'Speed', A: 0, B: 0 },
      { subject: 'Strategy', A: 0, B: 0 },
    ]);
    setInsight('Your physical signature is being calculated...');
    setVictoryShot(null);
    setIsGeneratingShot(false);
    setShotError(null);
    setShowShareModal(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
      setStep(2);
    }
  };

  const streamAgentResponse = async (uId, sId, messageParts, isFollowUp = false) => {
    setLoading(true);
    let fullText = "";
    
    try {
      const response = await fetch(`${API_BASE_URL}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: "app",
          userId: uId,
          sessionId: sId,
          newMessage: {
            role: "user",
            parts: messageParts
          }
        })
      });

      // ADK /run returns a complete JSON array — collect all chunks first
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let rawBody = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        rawBody += decoder.decode(value, { stream: true });
      }

      // Add model placeholder now that we have the response
      setChatHistory(prev => [...prev, { role: "model", parts: [{ text: "" }] }]);

      // Parse the full JSON array of ADK events
      let events = [];
      try {
        const parsed = JSON.parse(rawBody);
        events = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        console.error("Failed to parse backend response:", e, "\nRaw (first 500):", rawBody.slice(0, 500));
      }

      // Walk each ADK event
      for (const event of events) {
        if (!event.content) continue;

        const role = event.content.role;
        const parts = event.content.parts || [];

        for (const part of parts) {
          // Tool call — show status (Phase 2) and intercept Generative UI (Phase 3)
          if (part.functionCall) {
            const toolName = part.functionCall.name;
            const statusMap = {
              'get_athlete_cluster': '🧬 Clustering biometrics...',
              'display_athlete_matches': '✨ Identifying your best Olympic events...',
              'google_search': '🌐 Exploring Olympic event categories...'
            };
            setAgentStatus(statusMap[toolName] || `Running ${toolName}...`);

            if (toolName === 'display_athlete_matches' && part.functionCall.args?.matches) {
              setMatches(part.functionCall.args.matches);
            }
            if (toolName === 'display_comparative_analytics' && part.functionCall.args?.user_stats) {
              const u = part.functionCall.args.user_stats;
              const a = part.functionCall.args.archetype_average || {};
              setInsight(part.functionCall.args.key_insight || "");
              setStats([
                { subject: 'Power', A: u.Power || 0, B: a.Power || 0 },
                { subject: 'Agility', A: u.Agility || 0, B: a.Agility || 0 },
                { subject: 'Endurance', A: u.Endurance || 0, B: a.Endurance || 0 },
                { subject: 'Speed', A: u.Speed || 0, B: a.Speed || 0 },
                { subject: 'Strategy', A: u.Strategy || 0, B: a.Strategy || 0 },
              ]);
            }
          }

          // Tool response received — clear status
          if (part.functionResponse) {
            setAgentStatus(null);
          }

          // Model text — accumulate (Phase 1)
          if (role === 'model' && part.text) {
            fullText += part.text;
          }
        }
      }

      // Render the final accumulated text into the model bubble
      if (fullText) {
        setChatHistory(prev => {
          const newHistory = [...prev];
          for (let i = newHistory.length - 1; i >= 0; i--) {
            if (newHistory[i].role === "model") {
              newHistory[i].parts = [{ text: fullText }];
              break;
            }
          }
          return newHistory;
        });
      } else {
        console.warn("No model text in response. Events sample:", JSON.stringify(events[0]).slice(0, 300));
      }

    } catch (error) {
      console.error("Agent response error:", error);
    } finally {
      setAgentStatus(null);
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setMatches([]);
    setAgentStatus(null);
    try {
      const uId = `user-${crypto.randomUUID()}`;
      setUserId(uId);

      const sessionRes = await axios.post(`${API_BASE_URL}/apps/app/users/${uId}/sessions`);
      const sId = sessionRes.data.id;
      setSessionId(sId);

      const messageParts = [
        { text: `My biometrics are: Height ${biometrics.height}cm, Weight ${biometrics.weight}kg, Age ${biometrics.age}. Please find my athlete archetype, top 3 matching athletes, and best-suited Olympic event for LA 2028.` }
      ];

      if (image && imagePreview) {
        messageParts.push({
          inline_data: { mime_type: image.type, data: imagePreview.split(',')[1] }
        });
      }

      setChatHistory([{ role: "user", parts: messageParts }]);
      setStep(3);
      await streamAgentResponse(uId, sId, messageParts);
    } catch (error) {
      console.error("Error generating profile:", error);
      alert("Failed to connect to the agent.");
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!followUpMessage.trim() || loading) return;

    const userMessage = { role: "user", parts: [{ text: followUpMessage }] };
    setChatHistory(prev => [...prev, userMessage]);
    const msg = followUpMessage;
    setFollowUpMessage("");

    await streamAgentResponse(userId, sessionId, userMessage.parts, true);
  };

  const handleBiometricChange = (field, value) => {
    setBiometrics(prev => ({ ...prev, [field]: value }));
  };

  const validateBiometrics = (field) => {
    const limits = {
      height: { min: 50, max: 300 },
      weight: { min: 5, max: 500 },
      age: { min: 1, max: 100 }
    };
    const { min, max } = limits[field];
    const val = parseFloat(biometrics[field]);
    
    if (isNaN(val)) return;
    
    const clamped = Math.min(Math.max(val, min), max);
    if (clamped !== val) {
      setBiometrics(prev => ({ ...prev, [field]: clamped }));
    }
  };

  return (
    <div className="app-container">
      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="gradient-text"
          style={{ fontSize: '3.5rem', fontWeight: '800', margin: 0 }}
        >
          Team USA x Google Cloud Hackathon
        </motion.h1>
        <p style={{ color: 'var(--white)', letterSpacing: '4px', textTransform: 'uppercase', fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.8 }}>
          Athlete Archetype Agent
        </p>
      </header>

      <main style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="glass-card"
            >
              <h2 style={{ color: 'var(--gold)', marginBottom: '0.5rem' }}>Layer 1: The Digital Mirror</h2>
              <p style={{ opacity: 0.8, marginBottom: '2rem' }}>Choose how to add your photo to begin your alignment with 120 years of Team USA history.</p>

              <div className="capture-options">
                {/* Upload option */}
                <label className="capture-option" htmlFor="file-upload-input">
                  <input
                    id="file-upload-input"
                    type="file"
                    hidden
                    onChange={handleImageUpload}
                    accept="image/*"
                  />
                  <div className="capture-option-icon upload-icon">
                    <Upload size={36} color="var(--gold)" />
                  </div>
                  <h3>Upload Photo</h3>
                  <p>Choose an image from your device</p>
                  <span className="capture-option-hint">JPG, PNG or WEBP · Max 5MB</span>
                </label>

                <div className="capture-divider">
                  <span>or</span>
                </div>

                {/* Camera option */}
                <button
                  className="capture-option camera-option"
                  onClick={() => setShowCamera(true)}
                >
                  <div className="capture-option-icon camera-icon">
                    <Camera size={36} color="var(--usa-red)" />
                  </div>
                  <h3>Take a Photo</h3>
                  <p>Use your camera for a live shot</p>
                  <span className="capture-option-hint">Front or rear camera supported</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Camera Modal ── */}
          <AnimatePresence>
            {showCamera && (
              <motion.div
                className="camera-modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="camera-modal"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                >
                  {/* Header */}
                  <div className="camera-header">
                    <span className="camera-title">📷 Take Your Photo</span>
                    <button className="camera-close-btn" onClick={stopCamera}>
                      <X size={20} />
                    </button>
                  </div>

                  {/* Viewfinder */}
                  <div className="camera-viewfinder">
                    {cameraError ? (
                      <div className="camera-error">
                        <Camera size={48} style={{ opacity: 0.4, marginBottom: '1rem' }} />
                        <p>{cameraError}</p>
                        <button className="btn-primary" style={{ marginTop: '1rem', width: 'auto', padding: '0.75rem 2rem' }} onClick={() => startCamera()}>
                          Try Again
                        </button>
                      </div>
                    ) : (
                      <>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className={`camera-video ${cameraFacing === 'user' ? 'mirrored' : ''}`}
                        />
                        {isCaptureFlash && <div className="camera-flash" />}
                        {/* Corner guides */}
                        <div className="camera-guide tl" />
                        <div className="camera-guide tr" />
                        <div className="camera-guide bl" />
                        <div className="camera-guide br" />
                      </>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="camera-controls">
                    <button className="camera-flip-btn" onClick={flipCamera} title="Flip camera">
                      <FlipHorizontal size={22} />
                    </button>

                    <button
                      className="camera-capture-btn"
                      onClick={capturePhoto}
                      disabled={!!cameraError}
                      title="Capture photo"
                    >
                      <div className="camera-capture-inner" />
                    </button>

                    <div style={{ width: 48 }} />{/* spacer to balance flip btn */}
                  </div>

                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="glass-card"
            >
              <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
                <div style={{ width: '120px', height: '120px', borderRadius: '16px', overflow: 'hidden', border: '2px solid var(--gold)' }}>
                  <img src={imagePreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Profile" />
                </div>
                <div>
                  <h2 style={{ color: 'var(--gold)', margin: 0 }}>Biometric Layer</h2>
                  <p style={{ opacity: 0.8 }}>Provide your metrics for historical clustering.</p>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Height (cm)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  min="50"
                  max="300"
                  value={biometrics.height} 
                  onChange={(e) => handleBiometricChange('height', e.target.value)}
                  onBlur={() => validateBiometrics('height')}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Weight (kg)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  min="5"
                  max="500"
                  value={biometrics.weight} 
                  onChange={(e) => handleBiometricChange('weight', e.target.value)}
                  onBlur={() => validateBiometrics('weight')}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Age</label>
                <input 
                  type="number" 
                  className="input-field" 
                  min="1"
                  max="100"
                  value={biometrics.age} 
                  onChange={(e) => handleBiometricChange('age', e.target.value)}
                  onBlur={() => validateBiometrics('age')}
                />
              </div>

              <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
                {loading ? <Loader2 className="spin" style={{ margin: 'auto' }} /> : 'Align with Team USA'}
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card"
              style={{ maxWidth: '800px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 className="gold-title" style={{ margin: 0 }}>Your Historical Archetype</h2>
                <button 
                  onClick={handleRestart} 
                  style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  Restart
                </button>
              </div>

              <div className="chat-container">
                {chatHistory.filter(msg => msg.role === "model" || (msg.role === "user" && msg.parts[0].text.length < 500)).map((msg, idx) => (
                  <div key={idx} className={`chat-bubble ${msg.role}`}>
                    <ReactMarkdown>{msg.parts[0].text}</ReactMarkdown>
                  </div>
                ))}

                {matches.length > 0 && (
                  <div className="matches-grid">
                    {matches.map((m, i) => <MatchCard key={i} match={m} />)}
                  </div>
                )}
                {agentStatus && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="agent-thought"
                  >
                    {agentStatus}
                  </motion.div>
                )}
                {loading && !agentStatus && (
                  <div className="chat-bubble model" style={{ display: 'flex', justifyContent: 'center' }}>
                    <Loader2 className="spin" />
                  </div>
                )}
              </div>

              <div className="chat-input-area">
                <input 
                  type="text" 
                  className="chat-input" 
                  placeholder="Ask a follow-up question..." 
                  value={followUpMessage}
                  onChange={(e) => setFollowUpMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button className="chat-send-btn" onClick={handleSendMessage} disabled={loading}>
                  <ChevronRight />
                </button>
              </div>

              <div style={{ marginTop: '2rem', borderTop: '1px solid var(--glass-border)', paddingTop: '2rem' }}>
                <h3 style={{ color: 'var(--gold)', marginBottom: '1.5rem' }}>Historical Benchmarking</h3>
                <div className="analytics-dashboard">
                  <div className="radar-col">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats}>
                        <PolarGrid stroke="var(--glass-border)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'white', fontSize: 11 }} />
                        <Radar 
                          name="Your Signature" 
                          dataKey="A" 
                          stroke="var(--usa-red)" 
                          fill="var(--usa-red)" 
                          fillOpacity={0.6} 
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                    <div className="radar-legend">
                      <span className="legend-item"><span className="dot gold"></span> Your Signature</span>
                    </div>
                  </div>
                  
                  <div className="insight-col">
                    <div className="insight-card">
                      <Award size={24} color="var(--usa-red)" />
                      <h4>Performance Insight</h4>
                      <p>{insight}</p>
                    </div>

                    <div className="stat-summary">
                      {stats.map((s, i) => (
                        <div key={i} className="mini-stat">
                          <span className="label">{s.subject}</span>
                          <div className="bar-bg">
                            <motion.div 
                              className="bar-fill" 
                              initial={{ width: 0 }}
                              animate={{ width: `${s.A}%` }}
                            />
                          </div>
                          <span className="value">{s.A}%</span>
                        </div>
                      ))}
                    </div>

                    {/* ── Victory Shot Section ── */}
                    <div className="victory-shot-section">
                      <h4 className="victory-shot-title">
                        <Camera size={18} style={{ marginRight: '0.5rem' }} />
                        Generate Your Olympic Avatar
                      </h4>
                      <p className="victory-shot-subtitle">
                        See your archetype as a stylized Team USA animation — shareable on social media.
                      </p>

                      {!victoryShot ? (
                        <button
                          className="btn-victory"
                          onClick={async () => {
                            if (!imagePreview || !matches[0]) return;
                            setShotError(null);
                            setIsGeneratingShot(true);
                            try {
                              // Strip the data URL prefix to get raw base64
                              const base64Data = imagePreview.split(',')[1];
                              const mimeType = imagePreview.split(';')[0].split(':')[1] || 'image/jpeg';
                              const res = await fetch(`${IMAGE_GEN_URL}/generate-action-shot`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  image_base64: base64Data,
                                  image_mime_type: mimeType,
                                  sport: matches[0].Sport,
                                  athlete_name: matches[0].Name,
                                  archetype_name: matches[0].Event || matches[0].Sport
                                })
                              });
                              if (!res.ok) {
                                const err = await res.json();
                                throw new Error(err.detail || 'Generation failed');
                              }
                              const data = await res.json();
                              setVictoryShot(data.image_url);
                              setTimeout(() => victoryShotRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                            } catch (err) {
                              setShotError(err.message);
                            } finally {
                              setIsGeneratingShot(false);
                            }
                          }}
                          disabled={isGeneratingShot || !matches[0]}
                        >
                          {isGeneratingShot ? (
                            <><Loader2 size={18} className="spin" style={{ marginRight: '0.5rem' }} />Generating your Olympic Avatar...</>
                          ) : (
                            <><Camera size={18} style={{ marginRight: '0.5rem' }} />Generate Olympic Avatar 🏅</>
                          )}
                        </button>
                      ) : (
                        <motion.div
                          ref={victoryShotRef}
                          className="victory-shot-card"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                        >
                          <div className="victory-shot-badge">🥇 VICTORY SHOT</div>
                          <img
                            src={victoryShot}
                            alt={`Stylized animation character for ${matches[0].Name}`}
                            className="victory-shot-img"
                          />
                          <div className="victory-shot-footer">
                            <p><strong>You</strong> as an animated character in the {matches[0].Name} event — your perfect Olympic fit!</p>
                            <div className="victory-shot-actions">
                              <button className="btn-share share-main" onClick={() => setShowShareModal(true)}>
                                <Share2 size={16} style={{ marginRight: '0.4rem' }} />Share
                              </button>
                              <a href={victoryShot} download="TeamUSA_VictoryShot.png" className="btn-share download">
                                <Download size={16} style={{ marginRight: '0.4rem' }} />Download
                              </a>
                              <button className="btn-share regenerate" onClick={() => setVictoryShot(null)}>
                                Regenerate
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                      {shotError && (
                        <p className="shot-error">⚠ {shotError}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Social Share Modal ── */}
        {showShareModal && (
          <div className="share-modal-overlay" onClick={() => setShowShareModal(false)}>
            <motion.div
              className="share-modal"
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="share-modal-header">
                <h3>🏅 Share Your Victory Shot</h3>
                <button className="share-modal-close" onClick={() => setShowShareModal(false)}>✕</button>
              </div>

              <img src={victoryShot} alt="Victory Shot preview" className="share-preview-img" />

              <p className="share-caption">{shareText}</p>

              <div className="share-how-it-works">
                <span>📱</span>
                <span><strong>Mobile:</strong> your photo opens directly in the app &nbsp;•&nbsp; <strong>Desktop:</strong> image auto-copied, just paste into your post</span>
              </div>

              <div className="share-platforms">

                {/* Twitter / X */}
                <button className="share-platform twitter" onClick={() => handleShareToPlatform('twitter')}>
                  <span className="platform-icon">𝕏</span>
                  <span>Twitter / X</span>
                </button>

                {/* Facebook */}
                <button className="share-platform facebook" onClick={() => handleShareToPlatform('facebook')}>
                  <span className="platform-icon">f</span>
                  <span>Facebook</span>
                </button>

                {/* LinkedIn */}
                <button className="share-platform linkedin" onClick={() => handleShareToPlatform('linkedin')}>
                  <span className="platform-icon">in</span>
                  <span>LinkedIn</span>
                </button>

                {/* Instagram */}
                <button className="share-platform instagram" onClick={() => handleShareToPlatform('instagram')}>
                  <span className="platform-icon">📷</span>
                  <span>Instagram</span>
                </button>

                {/* Native share (mobile) */}
                <button className="share-platform native" onClick={() => handleShareToPlatform('twitter')}>
                  <span className="platform-icon"><Share2 size={18} /></span>
                  <span>More Apps…</span>
                </button>

                {/* Download */}
                <a href={victoryShot} download="TeamUSA_VictoryShot.png" className="share-platform download-full">
                  <span className="platform-icon"><Download size={18} /></span>
                  <span>Save Image</span>
                </a>

              </div>
            </motion.div>
          </div>
        )}

        {/* ── Toast Notification ── */}
        <AnimatePresence>
          {toast && (
            <motion.div
              className="share-toast"
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      <footer style={{ marginTop: '4rem', opacity: 0.5, fontSize: '0.75rem', textAlign: 'center' }}>
        <p>© 2026 Team USA x Google Cloud Hackathon • Challenge 4: The Athlete Archetype Agent</p>
        <p>Built with Gemini 3.0 Flash Lite & Google ADK</p>
      </footer>
    </div>
  );
}

export default App;
