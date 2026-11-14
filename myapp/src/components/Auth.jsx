import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeartbeat, faLock, faEnvelope, faUser, faSpinner, faShieldAlt } from '@fortawesome/free-solid-svg-icons';
import API_BASE_URL from '../apiConfig';

const Auth = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 2FA Verification State
  const [isTwoFactorStep, setIsTwoFactorStep] = useState(false);
  const [twoFactorEmail, setTwoFactorEmail] = useState('');
  const [twoFactorOtp, setTwoFactorOtp] = useState('');
  const [preview2FACode, setPreview2FACode] = useState('');

  const navigate = useNavigate();

  // Clear errors when toggling between Login and Register
  useEffect(() => { 
    setError(''); 
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setIsTwoFactorStep(false);
    setTwoFactorOtp('');
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
        const response = await axios.post(`${API_BASE_URL}/api/register`, {
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
        const response = await axios.post(`${API_BASE_URL}/api/login`, {
          email,
          password
        });
        if (response.data.success) {
          if (response.data.two_factor_required) {
            setIsTwoFactorStep(true);
            setTwoFactorEmail(response.data.email);
            if (response.data.preview_code) {
              setPreview2FACode(response.data.preview_code);
            }
            return;
          }
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

  const handleVerify2FALogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!twoFactorOtp || twoFactorOtp.trim().length !== 6) {
      setError("Please enter the complete 6-digit security code.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/2fa/verify-login`, {
        email: twoFactorEmail,
        otp: twoFactorOtp.trim()
      });
      if (response.data.success) {
        localStorage.setItem("currentUserEmail", response.data.email);
        localStorage.setItem("userName", response.data.name);
        navigate("/dashboard");
      } else {
        setError(response.data.error || "Invalid verification code.");
      }
    } catch (err) {
      setError(err.response?.data?.error || "2FA verification failed. Please check the code.");
    } finally {
      setLoading(false);
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
          {isTwoFactorStep 
            ? "Two-Factor Authentication Required" 
            : isRegister 
              ? "Embark on your nutrition journey" 
              : "Welcome back to smart eating"}
        </p>

        {error && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl p-3.5 text-xs font-semibold leading-relaxed">
            {error}
          </div>
        )}

        {isTwoFactorStep ? (
          /* 2FA Login Verification View */
          <div>
            <div className="w-14 h-14 bg-emerald-500/20 text-theme-accent border border-emerald-500/40 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
              <FontAwesomeIcon icon={faShieldAlt} />
            </div>
            <h3 className="text-lg font-extrabold text-white mb-1">Verify Your Identity</h3>
            <p className="text-theme-muted text-xs mb-5 leading-relaxed">
              Enter the 6-digit security code sent to <strong className="text-white">{twoFactorEmail}</strong>
            </p>

            {preview2FACode && (
              <div className="mb-4 p-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold">
                Verification Code: <span className="tracking-widest text-sm font-black underline">{preview2FACode}</span>
              </div>
            )}

            <form onSubmit={handleVerify2FALogin} className="space-y-4">
              <div>
                <input 
                  type="text" 
                  maxLength={6}
                  value={twoFactorOtp}
                  onChange={(e) => setTwoFactorOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-48 mx-auto text-center tracking-[8px] text-2xl font-black bg-theme-card/40 text-white border-2 border-emerald-500 rounded-xl py-3 outline-none"
                  placeholder="• • • • • •"
                  autoFocus
                  required 
                />
              </div>

              <button 
                type="submit" 
                disabled={loading || twoFactorOtp.length !== 6}
                className="w-full bg-theme-accent hover:bg-emerald-600 active:scale-[0.98] text-slate-950 font-extrabold py-3.5 rounded-xl transition-all duration-200 mt-2 shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? <FontAwesomeIcon icon={faSpinner} spin className="text-lg" /> : <span>Verify & Sign In</span>}
              </button>

              <button 
                type="button"
                onClick={() => {
                  setIsTwoFactorStep(false);
                  setTwoFactorOtp('');
                  setError('');
                }}
                className="text-xs text-theme-muted hover:text-white mt-4 underline cursor-pointer block mx-auto transition"
              >
                Back to Sign In
              </button>
            </form>
          </div>
        ) : (
          /* Normal Login / Register Form */
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
        )}

        {!isTwoFactorStep && (
          <p className="mt-8 text-sm">
            <button 
              onClick={() => setIsRegister(!isRegister)} 
              className="text-theme-accent hover:text-theme-primary-light font-semibold cursor-pointer outline-none transition"
            >
              {isRegister ? "Already have an account? Login" : "New user? Register Now"}
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default Auth;
