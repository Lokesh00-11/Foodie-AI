import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUserShield, faBell, faPalette, faDatabase, 
  faToggleOn, faToggleOff, faTrash, faDownload,
  faKey, faShieldAlt, faCheckCircle, faExclamationTriangle,
  faSpinner, faLock, faTimes, faEye, faEyeSlash
} from '@fortawesome/free-solid-svg-icons';
import API_BASE_URL from '../apiConfig';

const SettingsPage = () => {
  const navigate = useNavigate();
  const userEmail = localStorage.getItem("currentUserEmail") || "";
  const userName = localStorage.getItem("userName") || "User";

  const [toggles, setToggles] = useState({
    pushNotifications: true,
    emailSummaries: false,
    darkMode: localStorage.getItem('theme') === 'dark',
    mealReminders: true,
    dataSharing: false,
  });

  // 2FA & Security States
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);

  // Modals
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [is2FASetupModalOpen, setIs2FASetupModalOpen] = useState(false);
  const [is2FADisableModalOpen, setIs2FADisableModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");

  // 2FA Setup Form State
  const [setupOtp, setSetupOtp] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [setupSuccess, setSetupSuccess] = useState("");
  const [previewOtp, setPreviewOtp] = useState("");

  // 2FA Disable Form State
  const [disablePassword, setDisablePassword] = useState("");
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError] = useState("");

  // Delete Account Form State
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Fetch initial security status from backend
  useEffect(() => {
    if (!userEmail) return;
    const fetchSecurityStatus = async () => {
      try {
        const res = await axios.post(`${API_BASE_URL}/api/security-status`, { email: userEmail });
        if (res.data && res.data.success) {
          setTwoFactorEnabled(Boolean(res.data.two_factor_enabled));
        }
      } catch (err) {
        console.error("Failed to load security status:", err);
      }
    };
    fetchSecurityStatus();
  }, [userEmail]);

  useEffect(() => {
    if (toggles.darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [toggles.darkMode]);

  useEffect(() => {
    const handleThemeChange = () => {
      setToggles(prev => ({ ...prev, darkMode: localStorage.getItem('theme') === 'dark' }));
    };
    window.addEventListener("themeUpdated", handleThemeChange);
    return () => window.removeEventListener("themeUpdated", handleThemeChange);
  }, []);

  const handleToggle = (key) => {
    if (key === 'pushNotifications' && !toggles.pushNotifications) {
      if ("Notification" in window) {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            setToggles(prev => ({ ...prev, pushNotifications: true }));
            alert("Push notifications enabled!");
          } else {
            alert("Permission for notifications was denied.");
          }
        });
        return;
      } else {
        alert("This browser does not support desktop notifications.");
        return;
      }
    }

    setToggles(prev => {
      const newState = !prev[key];
      if (key === 'darkMode') {
        localStorage.setItem('theme', newState ? 'dark' : 'light');
        window.dispatchEvent(new Event("themeUpdated"));
      }
      return { ...prev, [key]: newState };
    });
  };

  const handleDataAction = (action) => {
    if (action === 'Export Data') {
      const exportObject = {
        exportedAt: new Date().toISOString(),
        userEmail: localStorage.getItem("currentUserEmail") || "",
        userName: localStorage.getItem("userName") || "",
        userProfile: JSON.parse(localStorage.getItem("userProfile") || "{}"),
        activePlan: JSON.parse(localStorage.getItem("activePlan") || "{}"),
        savedHistory: JSON.parse(localStorage.getItem("savedWeeklyHistory") || "[]"),
        settings: toggles
      };
      const data = JSON.stringify(exportObject, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `foodie_ai_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (action === 'Clear History') {
      if (window.confirm("Are you sure you want to clear your daily meal tracking history? Your profile and diet plan will remain safe.")) {
        const email = localStorage.getItem("currentUserEmail") || "";
        localStorage.removeItem(`eaten_weekly_${email}`);
        localStorage.removeItem("eatenWeekly");
        localStorage.removeItem("customMeals");
        localStorage.removeItem("todayEatenMeals");
        window.dispatchEvent(new Event("mealHistoryCleared"));
        alert("Your meal tracking history has been successfully cleared.");
      }
    }
  };

  // 1. Password Change Handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwdError("All fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPwdError("New password must be at least 6 characters long.");
      return;
    }

    setPwdLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/change-password`, {
        email: userEmail,
        current_password: currentPassword,
        new_password: newPassword
      });
      if (res.data && res.data.success) {
        setPwdSuccess("Your password has been changed successfully! A confirmation email has been sent.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setIsPasswordModalOpen(false);
          setPwdSuccess("");
        }, 2000);
      } else {
        setPwdError(res.data?.error || "Failed to change password.");
      }
    } catch (err) {
      setPwdError(err.response?.data?.error || "Error connecting to server. Please try again.");
    } finally {
      setPwdLoading(false);
    }
  };

  // 2. Start 2FA Setup (Send OTP)
  const handleStart2FASetup = async () => {
    setSetupError("");
    setSetupSuccess("");
    setSetupOtp("");
    setPreviewOtp("");
    setSecurityLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/2fa/send-otp`, { email: userEmail });
      if (res.data && res.data.success) {
        if (res.data.preview_code) {
          setPreviewOtp(res.data.preview_code);
        }
        setIs2FASetupModalOpen(true);
      } else {
        alert(res.data?.error || "Could not send verification code. Please try again.");
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to reach server. Make sure the backend is running.");
    } finally {
      setSecurityLoading(false);
    }
  };

  // 3. Confirm 2FA Activation with OTP
  const handleConfirm2FA = async (e) => {
    e.preventDefault();
    setSetupError("");
    setSetupSuccess("");

    if (!setupOtp || setupOtp.trim().length !== 6) {
      setSetupError("Please enter the complete 6-digit verification code.");
      return;
    }

    setSetupLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/2fa/toggle`, {
        email: userEmail,
        enable: true,
        otp: setupOtp.trim()
      });
      if (res.data && res.data.success) {
        setTwoFactorEnabled(true);
        setSetupSuccess("Two-Factor Authentication is now enabled! Your account is protected.");
        setTimeout(() => {
          setIs2FASetupModalOpen(false);
          setSetupSuccess("");
        }, 2000);
      } else {
        setSetupError(res.data?.error || "Invalid verification code.");
      }
    } catch (err) {
      setSetupError(err.response?.data?.error || "Verification failed. Please check the code.");
    } finally {
      setSetupLoading(false);
    }
  };

  // 4. Disable 2FA
  const handleConfirmDisable2FA = async (e) => {
    e.preventDefault();
    setDisableError("");

    if (!disablePassword) {
      setDisableError("Please enter your current password to confirm.");
      return;
    }

    setDisableLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/2fa/toggle`, {
        email: userEmail,
        enable: false,
        password: disablePassword
      });
      if (res.data && res.data.success) {
        setTwoFactorEnabled(false);
        setIs2FADisableModalOpen(false);
        setDisablePassword("");
        alert("Two-Factor Authentication has been disabled.");
      } else {
        setDisableError(res.data?.error || "Failed to disable 2FA.");
      }
    } catch (err) {
      setDisableError(err.response?.data?.error || "Incorrect password or network error.");
    } finally {
      setDisableLoading(false);
    }
  };

  // 5. Delete Account Permanently
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteError("");

    if (!deletePassword) {
      setDeleteError("Account password is required to confirm deletion.");
      return;
    }

    setDeleteLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/delete-account`, {
        email: userEmail,
        password: deletePassword
      });
      if (res.data && res.data.success) {
        localStorage.clear();
        alert("Your account and all associated data have been permanently deleted.");
        navigate("/auth");
      } else {
        setDeleteError(res.data?.error || "Failed to delete account.");
      }
    } catch (err) {
      setDeleteError(err.response?.data?.error || "Incorrect password. Deletion cancelled.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto min-h-full animate-fadeIn font-sans">
      <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 mb-8">Settings & Preferences</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Appearance & Theme */}
        <div className="bg-theme-card rounded-3xl p-6 border border-slate-200/60 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 rounded-full bg-theme-primary-light text-theme-primary flex items-center justify-center">
               <FontAwesomeIcon icon={faPalette} />
             </div>
             <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-xl">Appearance</h3>
          </div>
          
          <div className="space-y-4">
             <div className="flex justify-between items-center p-4 bg-theme-bg/50 rounded-2xl border border-slate-100 dark:border-slate-800">
               <div>
                 <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Dark Mode</h4>
                 <p className="text-xs text-theme-muted mt-1">Switch between light and dark aesthetics.</p>
               </div>
               <button onClick={() => handleToggle('darkMode')} className={`text-2xl cursor-pointer ${toggles.darkMode ? 'text-theme-accent' : 'text-slate-300'}`}>
                 <FontAwesomeIcon icon={toggles.darkMode ? faToggleOn : faToggleOff} />
               </button>
             </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-theme-card rounded-3xl p-6 border border-slate-200/60 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center">
               <FontAwesomeIcon icon={faBell} />
             </div>
             <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-xl">Notifications</h3>
          </div>
          
          <div className="space-y-4">
             <div className="flex justify-between items-center p-4 bg-theme-bg/50 rounded-2xl border border-slate-100 dark:border-slate-800">
               <div>
                 <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Push Notifications</h4>
                 <p className="text-xs text-theme-muted mt-1">Receive daily alerts on browser.</p>
               </div>
               <button onClick={() => handleToggle('pushNotifications')} className={`text-2xl cursor-pointer ${toggles.pushNotifications ? 'text-theme-accent' : 'text-slate-300'}`}>
                 <FontAwesomeIcon icon={toggles.pushNotifications ? faToggleOn : faToggleOff} />
               </button>
             </div>
             <div className="flex justify-between items-center p-4 bg-theme-bg/50 rounded-2xl border border-slate-100 dark:border-slate-800">
               <div>
                 <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Meal Logging Reminders</h4>
                 <p className="text-xs text-theme-muted mt-1">Get reminded if you miss a meal.</p>
               </div>
               <button onClick={() => handleToggle('mealReminders')} className={`text-2xl cursor-pointer ${toggles.mealReminders ? 'text-theme-accent' : 'text-slate-300'}`}>
                 <FontAwesomeIcon icon={toggles.mealReminders ? faToggleOn : faToggleOff} />
               </button>
             </div>
          </div>
        </div>

        {/* Data & Privacy */}
        <div className="bg-theme-card rounded-3xl p-6 border border-slate-200/60 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
               <FontAwesomeIcon icon={faDatabase} />
             </div>
             <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-xl">Data & Privacy</h3>
          </div>
          
          <div className="space-y-4">
             <div className="flex justify-between items-center p-4 bg-theme-bg/50 rounded-2xl border border-slate-100 dark:border-slate-800">
               <div>
                 <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Share anonymous analytics</h4>
                 <p className="text-xs text-theme-muted mt-1">Help us improve the nutrition AI recommendation engine.</p>
               </div>
               <button onClick={() => handleToggle('dataSharing')} className={`text-2xl cursor-pointer ${toggles.dataSharing ? 'text-theme-accent' : 'text-slate-300'}`}>
                 <FontAwesomeIcon icon={toggles.dataSharing ? faToggleOn : faToggleOff} />
               </button>
             </div>
             
             <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <button onClick={() => handleDataAction('Export Data')} className="w-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer border border-blue-200 dark:border-blue-800">
                   <FontAwesomeIcon icon={faDownload} /> Export My Data (.JSON)
                </button>
                <button onClick={() => handleDataAction('Clear History')} className="w-full bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 hover:bg-slate-100 font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-700">
                   <FontAwesomeIcon icon={faTrash} /> Clear Meal History
                </button>
             </div>
          </div>
        </div>

        {/* Account Security */}
        <div className="bg-theme-card rounded-3xl p-6 border border-slate-200/60 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
               <FontAwesomeIcon icon={faUserShield} />
             </div>
             <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-xl">Account Security</h3>
          </div>
          
          <div className="space-y-4 flex-1 flex flex-col justify-between">
             <div className="space-y-3">
                
                {/* 1. Change Password Action */}
                <button 
                  onClick={() => {
                    setIsPasswordModalOpen(true);
                    setPwdError("");
                    setPwdSuccess("");
                  }} 
                  className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                   <FontAwesomeIcon icon={faKey} /> Change Password
                </button>
                
                {/* 2. Two-Factor Authentication (2FA) Action */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FontAwesomeIcon icon={faShieldAlt} className={twoFactorEnabled ? "text-emerald-500" : "text-slate-400"} />
                    <div className="text-left">
                      <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        Two-Factor Auth
                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase ${twoFactorEnabled ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-200 text-slate-700'}`}>
                          {twoFactorEnabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                      <p className="text-[11px] text-theme-muted mt-0.5">Require 6-digit OTP when logging in.</p>
                    </div>
                  </div>

                  {twoFactorEnabled ? (
                    <button 
                      onClick={() => {
                        setIs2FADisableModalOpen(true);
                        setDisableError("");
                        setDisablePassword("");
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-extrabold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                    >
                      Disable
                    </button>
                  ) : (
                    <button 
                      onClick={handleStart2FASetup}
                      disabled={securityLoading}
                      className="px-3 py-1.5 rounded-lg text-xs font-extrabold text-white bg-theme-accent hover:bg-emerald-600 transition flex items-center gap-1.5 cursor-pointer shadow shadow-emerald-500/10"
                    >
                      {securityLoading ? <FontAwesomeIcon icon={faSpinner} spin /> : "Enable 2FA"}
                    </button>
                  )}
                </div>

             </div>

             {/* 3. Delete Account Permanently */}
             <div className="pt-4 border-t border-red-100 dark:border-red-950 mt-6">
                <button 
                  onClick={() => {
                    setIsDeleteModalOpen(true);
                    setDeleteError("");
                    setDeletePassword("");
                  }} 
                  className="w-full bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 font-extrabold py-3 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                   <FontAwesomeIcon icon={faExclamationTriangle} /> Delete Account Permanently
                </button>
             </div>
          </div>
        </div>

      </div>

      {/* ============================================================ */}
      {/* MODAL 1: CHANGE PASSWORD */}
      {/* ============================================================ */}
      {isPasswordModalOpen && typeof document !== 'undefined' && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            zIndex: 99999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backdropFilter: 'blur(8px)',
            padding: '20px',
            boxSizing: 'border-box'
          }}
          onClick={() => setIsPasswordModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer transition"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-theme-accent flex items-center justify-center text-lg">
                <FontAwesomeIcon icon={faKey} />
              </div>
              <div>
                <h3 className="text-xl font-extrabold m-0">Change Password</h3>
                <p className="text-xs text-theme-muted mt-0.5">Secure your Foodie AI account</p>
              </div>
            </div>

            {pwdError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {pwdError}
              </div>
            )}
            {pwdSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <FontAwesomeIcon icon={faCheckCircle} /> {pwdSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="text-xs font-extrabold text-theme-muted uppercase tracking-wider block mb-1.5">Current Password</label>
                <div className="relative">
                  <input 
                    type={showCurrentPwd ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-500 pr-10"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <FontAwesomeIcon icon={showCurrentPwd ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-theme-muted uppercase tracking-wider block mb-1.5">New Password</label>
                <div className="relative">
                  <input 
                    type={showNewPwd ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-500 pr-10"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <FontAwesomeIcon icon={showNewPwd ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-theme-muted uppercase tracking-wider block mb-1.5">Confirm New Password</label>
                <input 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button 
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-bold text-sm cursor-pointer transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={pwdLoading}
                  className="flex-1 bg-theme-accent hover:bg-emerald-600 text-white py-3 rounded-xl font-extrabold text-sm cursor-pointer transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {pwdLoading ? <FontAwesomeIcon icon={faSpinner} spin /> : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ============================================================ */}
      {/* MODAL 2: 2FA ACTIVATION (ENTER OTP) */}
      {/* ============================================================ */}
      {is2FASetupModalOpen && typeof document !== 'undefined' && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            zIndex: 99999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backdropFilter: 'blur(8px)',
            padding: '20px',
            boxSizing: 'border-box'
          }}
          onClick={() => setIs2FASetupModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 relative text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIs2FASetupModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer transition"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center text-2xl mb-4">
              <FontAwesomeIcon icon={faShieldAlt} />
            </div>

            <h3 className="text-xl font-extrabold mb-1">Enable Two-Factor Auth</h3>
            <p className="text-xs text-theme-muted mb-5 leading-relaxed">
              We've dispatched a 6-digit verification code to <strong>{userEmail}</strong>. Enter it below to activate 2FA protection.
            </p>

            {previewOtp && (
              <div className="mb-4 p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 font-bold">
                Verification Code: <span className="tracking-widest text-sm font-black underline">{previewOtp}</span>
              </div>
            )}

            {setupError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {setupError}
              </div>
            )}
            {setupSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2">
                <FontAwesomeIcon icon={faCheckCircle} /> {setupSuccess}
              </div>
            )}

            <form onSubmit={handleConfirm2FA} className="space-y-4">
              <div>
                <input 
                  type="text"
                  maxLength={6}
                  value={setupOtp}
                  onChange={(e) => setSetupOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  className="w-48 mx-auto text-center tracking-[8px] text-2xl font-black bg-slate-50 dark:bg-slate-800 border-2 border-emerald-400 dark:border-emerald-500 rounded-xl py-3 outline-none"
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setIs2FASetupModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-bold text-sm cursor-pointer transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={setupLoading || setupOtp.length !== 6}
                  className="flex-1 bg-theme-accent hover:bg-emerald-600 text-white py-3 rounded-xl font-extrabold text-sm cursor-pointer transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {setupLoading ? <FontAwesomeIcon icon={faSpinner} spin /> : "Verify & Activate"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ============================================================ */}
      {/* MODAL 3: DISABLE 2FA */}
      {/* ============================================================ */}
      {is2FADisableModalOpen && typeof document !== 'undefined' && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            zIndex: 99999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backdropFilter: 'blur(8px)',
            padding: '20px',
            boxSizing: 'border-box'
          }}
          onClick={() => setIs2FADisableModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 relative text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIs2FADisableModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer transition"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center text-2xl mb-4">
              <FontAwesomeIcon icon={faLock} />
            </div>

            <h3 className="text-xl font-extrabold mb-1">Disable Two-Factor Auth</h3>
            <p className="text-xs text-theme-muted mb-5 leading-relaxed">
              Enter your account password to confirm removing Two-Factor Authentication protection.
            </p>

            {disableError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {disableError}
              </div>
            )}

            <form onSubmit={handleConfirmDisable2FA} className="space-y-4 text-left">
              <div>
                <label className="text-xs font-extrabold text-theme-muted uppercase tracking-wider block mb-1.5">Account Password</label>
                <input 
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setIs2FADisableModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-bold text-sm cursor-pointer transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={disableLoading || !disablePassword}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 py-3 rounded-xl font-extrabold text-sm cursor-pointer transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {disableLoading ? <FontAwesomeIcon icon={faSpinner} spin /> : "Confirm Disable"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ============================================================ */}
      {/* MODAL 4: DELETE ACCOUNT PERMANENTLY */}
      {/* ============================================================ */}
      {isDeleteModalOpen && typeof document !== 'undefined' && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            zIndex: 99999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backdropFilter: 'blur(10px)',
            padding: '20px',
            boxSizing: 'border-box'
          }}
          onClick={() => setIsDeleteModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-md border-2 border-red-500/40 relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center cursor-pointer transition"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-xl mb-4">
              <FontAwesomeIcon icon={faExclamationTriangle} />
            </div>

            <h3 className="text-xl font-extrabold text-red-600 mb-1">Delete Account Permanently</h3>
            <p className="text-xs text-theme-muted mb-4 leading-relaxed">
              This action is <strong>irreversible</strong>. Your profile, generated meal plans, custom swaps, and all history stored in Neon PostgreSQL will be permanently erased.
            </p>

            {deleteError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {deleteError}
              </div>
            )}

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div>
                <label className="text-xs font-extrabold text-theme-muted uppercase tracking-wider block mb-1.5">Enter Password to Confirm</label>
                <input 
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Your account password"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-red-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 py-3 rounded-xl font-bold text-sm cursor-pointer transition"
                >
                  Keep Account
                </button>
                <button 
                  type="submit"
                  disabled={deleteLoading || !deletePassword}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-extrabold text-sm cursor-pointer transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {deleteLoading ? <FontAwesomeIcon icon={faSpinner} spin /> : "Delete Forever"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default SettingsPage;
