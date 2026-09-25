import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeartbeat, faLock, faEnvelope, faUser, faSpinner } from '@fortawesome/free-solid-svg-icons';

const Auth = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Clear errors when toggling between Login and Register
  useEffect(() => { 
    setError(''); 
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  }, [isRegister]);

  // Redirect if already logged in
  useEffect(() => {
    if (localStorage.getItem("currentUserEmail")) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isRegister) {
      if (password !== confirmPassword) {
        setError("Passwords do not match!");
        return;
      }
      setLoading(true);
      try {
        const response = await axios.post(`http://${window.location.hostname}:5000/api/register`, {
          name,
          email,
          password
        });
        if (response.data.success) {
          setIsRegister(false);
          alert("Account created successfully! Please sign in.");
        } else {
          setError(response.data.error || "Registration failed.");
        }
      } catch (err) {
        setError(err.response?.data?.error || "Connection error. Ensure Flask backend is running.");
      } finally {
        setLoading(false);
      }
    } else {
      // Login Logic
      setLoading(true);
      try {
        const response = await axios.post(`http://${window.location.hostname}:5000/api/login`, {
          email,
          password
        });
        if (response.data.success) {
          localStorage.setItem("currentUserEmail", response.data.email);
          localStorage.setItem("userName", response.data.name);
          navigate("/dashboard");
        } else {
          setError(response.data.error || "Login failed.");
        }
      } catch (err) {
        setError(err.response?.data?.error || "Invalid credentials or backend connection failure.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-tr from-slate-900 via-slate-800 to-emerald-950 p-6 font-sans">
      <div className="w-full max-w-md bg-theme-card/10 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl p-8 text-center relative overflow-hidden">
        
        {/* Decorative background gradients */}
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-theme-accent/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

        {/* Logo Icon */}
        <div className="w-16 h-16 bg-theme-accent text-slate-950 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
          <FontAwesomeIcon icon={faHeartbeat} className="text-2xl animate-pulse" />
        </div>

        <h2 className="text-3xl font-black text-white tracking-wide">FOODIE <span className="text-theme-accent">AI</span></h2>
        <p className="text-theme-muted text-sm font-semibold mt-2.5 mb-8">
          {isRegister ? "Embark on your nutrition journey" : "Welcome back to smart eating"}
        </p>

        {error && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-3.5 text-xs font-semibold leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-theme-border">
                <FontAwesomeIcon icon={faUser} className="text-sm" />
              </span>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-theme-card/40 text-white placeholder:text-theme-border border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-theme-accent/30 rounded-xl pl-11 pr-4 py-3.5 text-sm transition outline-none font-medium" 
                placeholder="Full Name" 
                style={{ paddingLeft: '44px' }}
                required 
              />
            </div>
          )}
          
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-theme-border">
              <FontAwesomeIcon icon={faEnvelope} className="text-sm" />
            </span>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-theme-card/40 text-white placeholder:text-theme-border border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-theme-accent/30 rounded-xl pl-11 pr-4 py-3.5 text-sm transition outline-none font-medium" 
              placeholder="Email Address" 
              style={{ paddingLeft: '44px' }}
              required 
            />
          </div>

          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-theme-border">
              <FontAwesomeIcon icon={faLock} className="text-sm" />
            </span>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-theme-card/40 text-white placeholder:text-theme-border border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-theme-accent/30 rounded-xl pl-11 pr-4 py-3.5 text-sm transition outline-none font-medium" 
              placeholder="Password" 
              style={{ paddingLeft: '44px' }}
              required 
            />
          </div>

          {isRegister && (
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-theme-border">
                <FontAwesomeIcon icon={faLock} className="text-sm" />
              </span>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-theme-card/40 text-white placeholder:text-theme-border border border-white/10 focus:border-emerald-500 focus:ring-1 focus:ring-theme-accent/30 rounded-xl pl-11 pr-4 py-3.5 text-sm transition outline-none font-medium" 
                placeholder="Confirm Password" 
                style={{ paddingLeft: '44px' }}
                required 
              />
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-theme-accent hover:bg-emerald-600 active:scale-[0.98] text-slate-950 font-extrabold py-3.5 rounded-xl transition-all duration-200 mt-4 shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <FontAwesomeIcon icon={faSpinner} spin className="text-lg" />
            ) : (
              <span>{isRegister ? "Create Account" : "Sign In"}</span>
            )}
          </button>
        </form>

        <p className="mt-8 text-sm">
          <button 
            onClick={() => setIsRegister(!isRegister)} 
            className="text-theme-accent hover:text-theme-primary-light font-semibold cursor-pointer outline-none transition"
          >
            {isRegister ? "Already have an account? Login" : "New user? Register Now"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;