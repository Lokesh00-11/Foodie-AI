import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUserShield, faBell, faPalette, faDatabase, 
  faToggleOn, faToggleOff, faTrash, faDownload 
} from '@fortawesome/free-solid-svg-icons';

const SettingsPage = () => {
  const [toggles, setToggles] = useState({
    pushNotifications: true,
    emailSummaries: false,
    darkMode: localStorage.getItem('theme') === 'dark',
    mealReminders: true,
    dataSharing: false,
  });

  React.useEffect(() => {
    if (toggles.darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [toggles.darkMode]);

  const handleToggle = (key) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDataAction = (action) => {
    alert(`This action (${action}) is simulated for the frontend demonstration.`);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto min-h-full animate-fadeIn">
      <h2 className="text-3xl font-extrabold text-slate-800 mb-8">Settings & Preferences</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Appearance & Theme */}
        <div className="bg-theme-card rounded-3xl p-6 border border-slate-200/60 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 rounded-full bg-theme-primary-light text-theme-primary flex items-center justify-center">
               <FontAwesomeIcon icon={faPalette} />
             </div>
             <h3 className="font-extrabold text-slate-800 text-xl">Appearance</h3>
          </div>
          
          <div className="space-y-4">
             <div className="flex justify-between items-center p-4 bg-theme-bg/50 rounded-2xl border border-slate-100">
               <div>
                 <h4 className="font-bold text-slate-800 text-sm">Dark Mode</h4>
                 <p className="text-xs text-theme-muted mt-1">Switch to a dark aesthetic.</p>
               </div>
               <button onClick={() => handleToggle('darkMode')} className={`text-2xl ${toggles.darkMode ? 'text-theme-accent' : 'text-slate-300'}`}>
                 <FontAwesomeIcon icon={toggles.darkMode ? faToggleOn : faToggleOff} />
               </button>
             </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-theme-card rounded-3xl p-6 border border-slate-200/60 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center">
               <FontAwesomeIcon icon={faBell} />
             </div>
             <h3 className="font-extrabold text-slate-800 text-xl">Notifications</h3>
          </div>
          
          <div className="space-y-4">
             <div className="flex justify-between items-center p-4 bg-theme-bg/50 rounded-2xl border border-slate-100">
               <div>
                 <h4 className="font-bold text-slate-800 text-sm">Push Notifications</h4>
                 <p className="text-xs text-theme-muted mt-1">Receive daily alerts on browser.</p>
               </div>
               <button onClick={() => handleToggle('pushNotifications')} className={`text-2xl ${toggles.pushNotifications ? 'text-theme-accent' : 'text-slate-300'}`}>
                 <FontAwesomeIcon icon={toggles.pushNotifications ? faToggleOn : faToggleOff} />
               </button>
             </div>
             <div className="flex justify-between items-center p-4 bg-theme-bg/50 rounded-2xl border border-slate-100">
               <div>
                 <h4 className="font-bold text-slate-800 text-sm">Meal Logging Reminders</h4>
                 <p className="text-xs text-theme-muted mt-1">Get reminded if you miss a meal.</p>
               </div>
               <button onClick={() => handleToggle('mealReminders')} className={`text-2xl ${toggles.mealReminders ? 'text-theme-accent' : 'text-slate-300'}`}>
                 <FontAwesomeIcon icon={toggles.mealReminders ? faToggleOn : faToggleOff} />
               </button>
             </div>
          </div>
        </div>

        {/* Data & Privacy */}
        <div className="bg-theme-card rounded-3xl p-6 border border-slate-200/60 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
               <FontAwesomeIcon icon={faDatabase} />
             </div>
             <h3 className="font-extrabold text-slate-800 text-xl">Data & Privacy</h3>
          </div>
          
          <div className="space-y-4">
             <div className="flex justify-between items-center p-4 bg-theme-bg/50 rounded-2xl border border-slate-100">
               <div>
                 <h4 className="font-bold text-slate-800 text-sm">Share anonymous analytics</h4>
                 <p className="text-xs text-theme-muted mt-1">Help us improve the AI.</p>
               </div>
               <button onClick={() => handleToggle('dataSharing')} className={`text-2xl ${toggles.dataSharing ? 'text-theme-accent' : 'text-slate-300'}`}>
                 <FontAwesomeIcon icon={toggles.dataSharing ? faToggleOn : faToggleOff} />
               </button>
             </div>
             
             <div className="pt-4 border-t border-slate-100 space-y-3">
                <button onClick={() => handleDataAction('Export Data')} className="w-full bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                   <FontAwesomeIcon icon={faDownload} /> Export My Data
                </button>
                <button onClick={() => handleDataAction('Clear History')} className="w-full bg-slate-50 text-slate-500 hover:bg-slate-100 font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                   <FontAwesomeIcon icon={faTrash} /> Clear Meal History
                </button>
             </div>
          </div>
        </div>

        {/* Account Security */}
        <div className="bg-theme-card rounded-3xl p-6 border border-slate-200/60 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
               <FontAwesomeIcon icon={faUserShield} />
             </div>
             <h3 className="font-extrabold text-slate-800 text-xl">Account Security</h3>
          </div>
          
          <div className="space-y-4 flex-1 flex flex-col justify-between">
             <div className="space-y-3">
               <button onClick={() => handleDataAction('Change Password')} className="w-full bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold py-2.5 rounded-xl text-sm transition-colors">
                  Change Password
               </button>
               <button onClick={() => handleDataAction('Setup 2FA')} className="w-full bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold py-2.5 rounded-xl text-sm transition-colors">
                  Enable Two-Factor Auth
               </button>
             </div>

             <div className="pt-4 border-t border-red-100 mt-6">
                <button onClick={() => handleDataAction('Delete Account')} className="w-full bg-red-50 text-red-600 hover:bg-red-100 font-extrabold py-3 rounded-xl text-sm transition-colors">
                   Delete Account Permanently
                </button>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsPage;
