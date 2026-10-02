import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSpinner, faUndo, faArrowRight, faArrowLeft, 
  faCheck, faHeartbeat, faExclamationTriangle 
} from '@fortawesome/free-solid-svg-icons';

const InputSection = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [validationError, setValidationError] = useState("");
  const [loading, setLoading] = useState(false);

  const initialState = {
    gender: 'male', age: '', weight: '', height: '',
    goal: 'maintenance', diet_preference: 'vegetarian',
    exercises: 'moderate', medical_condition: ['None'], exclusions: [],
    symptoms: [] 
  };
  const [otherExclusion, setOtherExclusion] = useState("");
  const medicalOptions = ["None", "Diabetes", "PCOS", "Thyroid", "Hypertension", "Cholesterol"];
  const exclusionOptions = ["Milk", "Butter", "Mutton", "Peanuts", "Eggs", "Soy", "Gluten", "Seafood"];

  const [formData, setFormData] = useState(initialState);

  const symptomOptions = [
    "Hair fall", "Fatigue", "Muscle cramps", "Pale skin",
    "Weak immunity", "Bone pain", "Tingling in hands/feet", "Mood swings"
  ];

  // Dynamic live BMI Calculation
  const weightVal = parseFloat(formData.weight);
  const heightVal = parseFloat(formData.height);
  const bmi = (weightVal > 0 && heightVal > 0) ? (weightVal / ((heightVal / 100) * (heightVal / 100))).toFixed(1) : null;

  const getBmiCategory = (bmiScore) => {
    if (!bmiScore) return { label: "", color: "text-theme-muted" };
    const num = parseFloat(bmiScore);
    if (num < 18.5) return { label: "Underweight", color: "text-theme-border font-bold" };
    if (num < 25.0) return { label: "Normal weight", color: "text-theme-accent font-black" };
    if (num < 30.0) return { label: "Overweight (Pre-obese)", color: "text-slate-700 font-bold" };
    return { label: "Obese range", color: "text-slate-900 font-black" };
  };

  const bmiCat = getBmiCategory(bmi);

  const handleCheckboxChange = (symptom) => {
    setFormData(prev => ({
      ...prev,
      symptoms: prev.symptoms?.includes(symptom)
        ? prev.symptoms.filter(s => s !== symptom)
        : [...(prev.symptoms || []), symptom]
    }));
  };

  const handleMedicalChange = (condition) => {
    setFormData(prev => {
      let newMed = prev.medical_condition || [];
      if (condition === "None") {
        newMed = ["None"];
      } else {
        newMed = newMed.filter(c => c !== "None");
        if (newMed.includes(condition)) {
          newMed = newMed.filter(c => c !== condition);
        } else {
          newMed.push(condition);
        }
        if (newMed.length === 0) newMed = ["None"];
      }
      return { ...prev, medical_condition: newMed };
    });
  };

  const handleExclusionChange = (exclusion) => {
    setFormData(prev => ({
      ...prev,
      exclusions: prev.exclusions?.includes(exclusion)
        ? prev.exclusions.filter(e => e !== exclusion)
        : [...(prev.exclusions || []), exclusion]
    }));
  };

  // Step-level validator
  const validateStep = (currentStep) => {
    setValidationError("");
    if (currentStep === 1) {
      const age = parseInt(formData.age);
      if (isNaN(age) || age < 12 || age > 100) {
        setValidationError("Age must be a realistic number between 12 and 100 years.");
        return false;
      }
    }
    if (currentStep === 2) {
      const weight = parseFloat(formData.weight);
      const height = parseFloat(formData.height);
      if (isNaN(weight) || weight < 30 || weight > 250) {
        setValidationError("Weight must be a realistic weight between 30 kg and 250 kg.");
        return false;
      }
      if (isNaN(height) || height < 100 || height > 220) {
        setValidationError("Height must be a realistic height between 100 cm and 220 cm (approx. 3.3 ft to 7.2 ft).");
        return false;
      }
      const calculatedBmi = weight / ((height / 100) * (height / 100));
      if (calculatedBmi < 10 || calculatedBmi > 60) {
        setValidationError(`Calculated BMI (${calculatedBmi.toFixed(1)}) is outside human limits (10 to 60). Please check values.`);
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setValidationError("");
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(step)) return;
    
    setLoading(true);
    const userEmail = localStorage.getItem("currentUserEmail");

    try {
      const payload = {
        ...formData,
        age: parseInt(formData.age),
        weight: parseFloat(formData.weight),
        height: parseFloat(formData.height) / 100, // Convert cm to meters for backend BMR
        symptoms: formData.symptoms.join(", "), 
        medical_condition: (formData.medical_condition || []).join(", "),
        exclusions: [...(formData.exclusions || []), ...(otherExclusion ? otherExclusion.split(",").map(e=>e.trim()).filter(e=>e) : [])],
        email: userEmail || "guest@example.com" 
      };

      const res = await axios.post(`http://${window.location.hostname}:5000/api/nutrition`, payload);
      
      // Store generated plan as active
      localStorage.setItem("activePlan", JSON.stringify({
        metrics: {
          target_cal: res.data.target_cal,
          bmr: res.data.bmr,
          tdee: res.data.tdee,
          age: payload.age,
          weight: payload.weight,
          height: payload.height * 100, // store in cm
          gender: payload.gender,
          goal: payload.goal,
          diet: payload.diet_preference,
          exclusions: payload.exclusions
        },
        weekly_plan: res.data.weekly_plan,
        ai_advice: res.data.ai_advice,
        deficiency_analysis: res.data.deficiency_analysis,
        user_details: res.data.user_details
      }));

      navigate('/results', { 
        state: { 
          plan: res.data.weekly_plan, 
          ai_advice: res.data.ai_advice,
          deficiency_analysis: res.data.deficiency_analysis,
          target_cal: res.data.target_cal,
          bmr: res.data.bmr,
          tdee: res.data.tdee,
          user_details: res.data.user_details
        } 
      });
    } catch (err) {
      console.error(err);
      setValidationError("Failed to communicate with the metabolic engine. Confirm your backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const stepsDetails = [
    { num: 1, title: "Baseline" },
    { num: 2, title: "Metrics" },
    { num: 3, title: "Goals" },
    { num: 4, title: "Clinical" }
  ];

  return (
    <div className="min-h-screen w-full bg-theme-bg flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-2xl bg-theme-card border border-slate-200/60 rounded-3xl shadow-xl p-8 relative overflow-hidden">
        
        {/* Header Icon */}
        <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-theme-primary-light text-theme-accent rounded-xl flex items-center justify-center">
              <FontAwesomeIcon icon={faHeartbeat} className="text-lg" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 leading-tight">Diet Planner</h2>
              <p className="text-theme-muted text-xs font-semibold uppercase tracking-wider">AI Diagnostic Engine</p>
            </div>
          </div>
          <span className="text-xs text-theme-muted font-extrabold bg-theme-bg border border-slate-200/60 px-3 py-1.5 rounded-lg">
            Step {step} of 4
          </span>
        </div>

        {/* Wizard Step Progress Bar */}
        <div className="flex justify-between items-center mb-10 px-4 relative">
          <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-slate-100 -translate-y-1/2 z-0" />
          
          {stepsDetails.map((s, idx) => {
            const isCompleted = step > s.num;
            const isActive = step === s.num;
            return (
              <div key={s.num} className="flex flex-col items-center z-10 relative">
                <div 
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border transition-all duration-300 ${
                    isActive 
                      ? 'bg-theme-accent border-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' 
                      : isCompleted 
                        ? 'bg-theme-card border-slate-900 text-theme-accent' 
                        : 'bg-theme-card border-slate-200 text-theme-muted'
                  }`}
                >
                  {isCompleted ? <FontAwesomeIcon icon={faCheck} /> : s.num}
                </div>
                <span className={`text-[10px] uppercase tracking-wider font-extrabold mt-2 ${
                  isActive ? 'text-theme-primary' : 'text-theme-muted'
                }`}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Validation Errors */}
        {validationError && (
          <div className="mb-6 bg-theme-card/5 border-l-4 border-emerald-500 text-slate-850 p-4 rounded-xl text-xs font-semibold leading-relaxed flex items-center gap-3">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-theme-accent text-sm shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* STEP 1: BASELINE */}
          {step === 1 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-theme-muted font-extrabold uppercase tracking-wider">Biological Gender</label>
                <div className="grid grid-cols-2 gap-4">
                  {['male', 'female'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setFormData({ ...formData, gender: g })}
                      className={`py-4 rounded-2xl border text-sm font-extrabold capitalize cursor-pointer transition-all duration-200 ${
                        formData.gender === g
                          ? 'bg-theme-accent border-emerald-500 text-slate-950 shadow shadow-emerald-500/10'
                          : 'bg-theme-card border-slate-200 hover:bg-theme-bg text-slate-600'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-theme-muted font-extrabold uppercase tracking-wider">Your Age (Years)</label>
                <input 
                  type="number"
                  min="12"
                  max="100"
                  placeholder="e.g. 24"
                  className="w-full bg-theme-bg border border-slate-200 focus:border-emerald-500 rounded-2xl px-4 py-4 text-sm font-bold text-slate-800 outline-none transition"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  required
                />
              </div>
            </div>
          )}

          {/* STEP 2: BODY METRICS */}
          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-theme-muted font-extrabold uppercase tracking-wider">Weight (kg)</label>
                  <input 
                    type="number"
                    min="30"
                    max="250"
                    placeholder="e.g. 70"
                    className="w-full bg-theme-bg border border-slate-200 focus:border-emerald-500 rounded-2xl px-4 py-4 text-sm font-bold text-slate-800 outline-none transition"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-theme-muted font-extrabold uppercase tracking-wider">Height (cm)</label>
                  <input 
                    type="number"
                    min="100"
                    max="220"
                    placeholder="e.g. 175"
                    className="w-full bg-theme-bg border border-slate-200 focus:border-emerald-500 rounded-2xl px-4 py-4 text-sm font-bold text-slate-800 outline-none transition"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Dynamic Live BMI Preview Box */}
              {bmi && (
                <div className="bg-theme-bg border border-slate-200/80 rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs text-theme-muted font-extrabold uppercase tracking-wider">Calculated BMI</h4>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-black text-slate-800">{bmi}</span>
                      <span className={`text-xs ${bmiCat.color}`}>{bmiCat.label}</span>
                    </div>
                  </div>
                  <div className="w-[1px] bg-slate-200 h-10"></div>
                  <div className="text-right text-[10px] text-theme-muted font-bold max-w-[180px] leading-relaxed">
                    BMI is a general reference indicator. Customized macro outputs will adjust for your goals.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: LIFESTYLE & GOALS */}
          {step === 3 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-theme-muted font-extrabold uppercase tracking-wider">Primary Goal</label>
                <select 
                  className="w-full bg-theme-bg border border-slate-200 focus:border-emerald-500 rounded-2xl px-4 py-4 text-sm font-bold text-slate-800 outline-none transition appearance-none cursor-pointer"
                  value={formData.goal}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                >
                  <option value="maintenance">Maintenance</option>
                  <option value="fat loss">Fat Loss (Cut)</option>
                  <option value="muscle gain">Muscle Gain (Lean Bulk)</option>
                  <option value="bulking">Heavy Bulking</option>
                  <option value="cutting">Extreme Cutting</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-theme-muted font-extrabold uppercase tracking-wider">Weekly Activity</label>
                  <select 
                    className="w-full bg-theme-bg border border-slate-200 focus:border-emerald-500 rounded-2xl px-4 py-4 text-sm font-bold text-slate-800 outline-none transition appearance-none cursor-pointer"
                    value={formData.exercises}
                    onChange={(e) => setFormData({ ...formData, exercises: e.target.value })}
                  >
                    <option value="sedentary">Sedentary (No exercise)</option>
                    <option value="moderate">Moderate (3-4 days/wk)</option>
                    <option value="active">Active (5-6 days/wk)</option>
                    <option value="athlete">Athlete (Daily heavy)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-theme-muted font-extrabold uppercase tracking-wider">Dietary Preference</label>
                  <select 
                    className="w-full bg-theme-bg border border-slate-200 focus:border-emerald-500 rounded-2xl px-4 py-4 text-sm font-bold text-slate-800 outline-none transition appearance-none cursor-pointer"
                    value={formData.diet_preference}
                    onChange={(e) => setFormData({ ...formData, diet_preference: e.target.value })}
                  >
                    <option value="vegetarian">Vegetarian</option>
                    <option value="non-veg">Non-Veg (Balanced)</option>
                    <option value="vegan">Vegan</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: CLINICAL DATA */}
          {step === 4 && (
            <div className="space-y-5 animate-fadeIn">
              
              <div>
                <label className="text-xs text-theme-muted font-extrabold uppercase tracking-wider block mb-3">Symptoms / Deficiencies</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {symptomOptions.map(option => {
                    const isChecked = formData.symptoms?.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleCheckboxChange(option)}
                        className={`flex items-center gap-2 p-3.5 rounded-xl border text-xs font-extrabold cursor-pointer transition ${
                          isChecked 
                            ? 'bg-theme-primary-light border-emerald-300 text-slate-900' 
                            : 'bg-theme-card border-slate-200 text-slate-600 hover:bg-theme-bg'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                          isChecked ? 'bg-theme-accent border-emerald-500 text-slate-950' : 'border-slate-300 bg-theme-card'
                        }`}>
                          {isChecked && <FontAwesomeIcon icon={faCheck} className="text-[8px]" />}
                        </div>
                        <span>{option}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-4 mt-6">
                <div>
                  <label className="text-xs text-theme-muted font-extrabold uppercase tracking-wider block mb-2">Medical History</label>
                  <div className="flex flex-wrap gap-2">
                    {medicalOptions.map(option => {
                      const isChecked = formData.medical_condition?.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleMedicalChange(option)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            isChecked
                              ? 'bg-theme-accent text-slate-950 shadow-md'
                              : 'bg-theme-bg border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-theme-muted font-extrabold uppercase tracking-wider block mb-2">Exclusions / Allergies</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {exclusionOptions.map(option => {
                      const isChecked = formData.exclusions?.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleExclusionChange(option)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            isChecked
                              ? 'bg-theme-primary-light text-white shadow-md'
                              : 'bg-theme-bg border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  <input 
                    type="text"
                    placeholder="Other exclusions (comma separated)"
                    className="w-full bg-theme-bg border border-slate-200 focus:border-emerald-500 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 outline-none transition"
                    value={otherExclusion}
                    onChange={(e) => setOtherExclusion(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex justify-between items-center border-t border-slate-100 pt-6 mt-8">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 font-extrabold px-6 py-4 rounded-2xl text-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setFormData(initialState)}
                className="bg-slate-100 hover:bg-slate-200 text-theme-border font-extrabold px-6 py-4 rounded-2xl text-sm transition flex items-center gap-2 cursor-pointer"
              >
                <FontAwesomeIcon icon={faUndo} />
                <span>Reset</span>
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="bg-theme-card hover:bg-slate-850 active:scale-[0.98] text-theme-accent font-extrabold px-6 py-4 rounded-2xl text-sm transition flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <span>Continue</span>
                <FontAwesomeIcon icon={faArrowRight} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="bg-theme-accent hover:bg-emerald-600 active:scale-[0.98] text-slate-950 font-black px-6 py-4 rounded-2xl text-sm transition flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                {loading ? (
                  <FontAwesomeIcon icon={faSpinner} spin className="text-lg" />
                ) : (
                  <>
                    <span>Generate Plan</span>
                    <FontAwesomeIcon icon={faCheck} />
                  </>
                )}
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  );
};

export default InputSection;