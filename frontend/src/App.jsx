import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Upload, User, Activity, Award, ChevronRight, Loader2 } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

function App() {
  const [step, setStep] = useState(1);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [biometrics, setBiometrics] = useState({ height: 180, weight: 75, age: 25 });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

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

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const userId = `user-${crypto.randomUUID()}`;

      // Step 1: Create a session
      const sessionRes = await axios.post(`${API_BASE_URL}/apps/app/users/${userId}/sessions`);
      const sessionId = sessionRes.data.id;

      // Step 2: Build the message parts
      const messageParts = [
        { text: `My biometrics are: Height ${biometrics.height}cm, Weight ${biometrics.weight}kg, Age ${biometrics.age}. Please find my athlete archetype.` }
      ];

      // Include image if provided
      if (image && imagePreview) {
        messageParts.push({
          inline_data: {
            mime_type: image.type,
            data: imagePreview.split(',')[1]
          }
        });
      }

      // Step 3: Run the agent
      const response = await axios.post(`${API_BASE_URL}/run`, {
        appName: "app",
        userId: userId,
        sessionId: sessionId,
        newMessage: {
          role: "user",
          parts: messageParts
        }
      });

      // Step 4: Parse the array-of-events response
      const events = Array.isArray(response.data) ? response.data : [];
      const textResponse = events
        .filter(e => e.content && e.content.parts)
        .flatMap(e => e.content.parts)
        .filter(p => p.text)
        .map(p => p.text)
        .join("");

      if (!textResponse) {
        throw new Error("Empty response from agent. Please try again.");
      }

      setResult(textResponse);
      setStep(3);
    } catch (error) {
      console.error("Error generating profile:", error);
      alert("Failed to connect to the agent. Make sure the backend is running.");
    } finally {
      setLoading(false);
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

              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '16px', lineHeight: '1.6', fontSize: '1.1rem', whiteSpace: 'pre-wrap' }}>
                {result}
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
