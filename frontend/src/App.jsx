import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Upload, User, Activity, Award, ChevronRight, Loader2, Star, MapPin } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

const MatchCard = ({ athlete }) => (
  <motion.div 
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    className={`athlete-match-card ${athlete.is_2028 ? 'prospect' : ''}`}
  >
    <div className="card-header">
      <Star size={16} fill="var(--gold)" color="var(--gold)" />
      <span>{athlete.is_2028 ? 'LA 2028 Prospect' : `${athlete.Year} ${athlete.Medal || 'Olympian'}`}</span>
    </div>
    <h3>{athlete.Name}</h3>
    <div className="card-details">
      <p><Activity size={14} /> {athlete.Sport}</p>
      <p><MapPin size={14} /> {athlete.Event}</p>
    </div>
  </motion.div>
);

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

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
              'display_athlete_matches': '✨ Preparing your athlete cards...',
              'google_search': '🌐 Scouting historical & future stars...'
            };
            setAgentStatus(statusMap[toolName] || `Running ${toolName}...`);

            if (toolName === 'display_athlete_matches' && part.functionCall.args?.matches) {
              setMatches(part.functionCall.args.matches);
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

  return (
    <div className="app-container">
      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="gradient-text"
          style={{ fontSize: '3.5rem', fontWeight: '800', margin: 0 }}
        >
          TEAM USA
        </motion.h1>
        <p style={{ color: 'var(--gold)', letterSpacing: '4px', textTransform: 'uppercase', fontSize: '0.8rem', marginTop: '0.5rem' }}>
          Athlete Archetype Agent
        </p>
      </header>

      <main style={{ width: '100%', maxWidth: '800px' }}>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="glass-card"
            >
              <h2 style={{ color: 'var(--gold)', marginBottom: '1rem' }}>Layer 1: The Digital Mirror</h2>
              <p style={{ opacity: 0.8, marginBottom: '2rem' }}>Upload a photo to begin your alignment with 120 years of Team USA history.</p>
              
              <label className="image-upload-zone">
                <input type="file" hidden onChange={handleImageUpload} accept="image/*" />
                <Upload size={48} color="var(--gold)" style={{ marginBottom: '1rem' }} />
                <p>Drag & Drop or Click to Upload</p>
                <p style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.5rem' }}>JPG, PNG or WEBP (Max 5MB)</p>
              </label>
            </motion.div>
          )}

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
                  value={biometrics.height} 
                  onChange={(e) => setBiometrics({...biometrics, height: e.target.value})}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Weight (kg)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={biometrics.weight} 
                  onChange={(e) => setBiometrics({...biometrics, weight: e.target.value})}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Age</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={biometrics.age} 
                  onChange={(e) => setBiometrics({...biometrics, age: e.target.value})}
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
                <h2 className="gradient-text" style={{ margin: 0 }}>Your Historical Archetype</h2>
                <button 
                  onClick={() => setStep(1)} 
                  style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  Restart
                </button>
              </div>

              <div className="chat-container">
                {chatHistory.filter(msg => msg.role === "model" || (msg.role === "user" && msg.parts[0].text.length < 500)).map((msg, idx) => (
                  <div key={idx} className={`chat-bubble ${msg.role}`}>
                    {msg.parts[0].text}
                  </div>
                ))}

                {matches.length > 0 && (
                  <div className="matches-grid">
                    {matches.map((a, i) => <MatchCard key={i} athlete={a} />)}
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
                <h3 style={{ color: 'var(--gold)', marginBottom: '1.5rem' }}>Comparative Analytics</h3>
                <div style={{ height: '300px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                      { subject: 'Power', A: 80, fullMark: 150 },
                      { subject: 'Agility', A: 98, fullMark: 150 },
                      { subject: 'Endurance', A: 86, fullMark: 150 },
                      { subject: 'Speed', A: 99, fullMark: 150 },
                      { subject: 'Strategy', A: 85, fullMark: 150 },
                    ]}>
                      <PolarGrid stroke="var(--glass-border)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'white', fontSize: 12 }} />
                      <Radar name="User" dataKey="A" stroke="var(--gold)" fill="var(--gold)" fillOpacity={0.6} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      <footer style={{ marginTop: '4rem', opacity: 0.5, fontSize: '0.75rem', textAlign: 'center' }}>
        <p>© 2026 Team USA Hackathon • Challenge 4: The Athlete Archetype Agent</p>
        <p>Built with Gemini 3.0 Flash Lite & Google ADK</p>
      </footer>
    </div>
  );
}

export default App;
