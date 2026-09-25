import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, faStopwatch, faDumbbell, 
  faCheckCircle, faSpinner, faPlay, faPause, faStepForward, faUser
} from '@fortawesome/free-solid-svg-icons';

const WorkoutsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Grab Goal and Gender from the ResultPage state
  const rawGoal = location.state?.goal?.toLowerCase() || "maintenance";
  const userGender = location.state?.gender?.toLowerCase() || "male"; // "male" or "female"
  
  // 🔥 MAP STRICTLY TO YOUR 5 DROPDOWN GOALS
  let activeGoal = "maintenance";
  if (rawGoal.includes("fat loss")) activeGoal = "fat loss";
  else if (rawGoal.includes("muscle gain")) activeGoal = "muscle gain";
  else if (rawGoal.includes("bulking")) activeGoal = "bulking";
  else if (rawGoal.includes("cutting")) activeGoal = "cutting";
  else activeGoal = "maintenance";

  // 1. EXPANDED WORKOUT DATABASE
  const routines = {
    "fat loss": [
      { name: "Jumping Jacks", sets: 3, reps: "45 secs", type: "Cardio", instructions: "Stand upright with your legs together, arms at your sides. Bend your knees slightly, and jump into the air. As you jump, spread your legs to be about shoulder-width apart. Stretch your arms out and over your head." },
      { name: "Burpees", sets: 4, reps: "30 secs", type: "Full Body", instructions: "Start in a squat position with your knees bent, back straight, and your feet about shoulder-width apart. Lower your hands to the floor in front of you. Kick your feet back to a plank position. Jump your feet back in and stand." },
      { name: "Mountain Climbers", sets: 4, reps: "40 secs", type: "Core", instructions: "Get into a plank position, making sure to distribute your weight evenly between your hands and your toes. Pull your right knee into your chest as far as you can. Switch legs, pulling one knee out and bringing the other knee in." },
      { name: "High Knees", sets: 3, reps: "40 secs", type: "Cardio", instructions: "Stand with your feet hip-width apart. Lift up your left knee to your chest. Switch to lift your right knee to your chest. Continue the movement, alternating legs and moving at a sprinting or running pace." },
      { name: "Bicycle Crunches", sets: 3, reps: "30 reps", type: "Core", instructions: "Lie flat on the floor with your lower back pressed to the ground. Put your hands behind your head. Bring your knees in towards your chest and lift your shoulder blades off the ground. Straighten your right leg out to about a 45-degree angle to the ground while turning your upper body to the left, bringing your right elbow towards the left knee." }
    ],
    "muscle gain": [
      { name: "Push Ups", sets: 4, reps: "15 reps", type: "Chest/Triceps", instructions: "Get down on all fours, placing your hands slightly wider than your shoulders. Straighten your arms and legs. Lower your body until your chest nearly touches the floor. Pause, then push yourself back up." },
      { name: "Dumbbell Goblet Squats", sets: 4, reps: "12 reps", type: "Legs", instructions: "Hold a dumbbell vertically by one end against your chest. Keep your core tight and your chest up. Push your hips back and bend your knees to lower your body into a squat. Push back up to the starting position." },
      { name: "Dumbbell Rows", sets: 4, reps: "12 reps", type: "Back/Biceps", instructions: "Hold a dumbbell in one hand and place your opposite knee and hand on a bench. Keep your back flat. Pull the dumbbell up to your ribcage, squeezing your back muscles. Lower it back down." },
      { name: "Walking Lunges", sets: 3, reps: "12 reps", type: "Legs", instructions: "Stand upright, feet together. Take a large step forward with your right leg and lower your body until both knees are bent at a 90-degree angle. Push off your right foot to step forward with your left leg, moving into the next lunge." },
      { name: "Plank", sets: 3, reps: "60 secs", type: "Core", instructions: "Start in a push-up position, but rest your weight on your forearms instead of your hands. Your body should form a straight line from your shoulders to your ankles. Engage your core and hold." }
    ],
    "maintenance": [
      { name: "Bodyweight Squats", sets: 3, reps: "15 reps", type: "Legs", instructions: "1. Stand with feet slightly wider than shoulder-width. 2. Tighten your core and keep chest up. 3. Push your hips back like sitting in a chair. 4. Lower until thighs are parallel to the floor. 5. Press through heels to stand back up. Do NOT let your knees cave in." },
      { name: "Push Ups", sets: 3, reps: "12 reps", type: "Upper Body", instructions: "Place hands slightly wider than shoulders. Lower your body until your chest nearly touches the floor, keeping your elbows tucked at a 45-degree angle. Push back up." },
      { name: "Reverse Lunges", sets: 3, reps: "20 reps", type: "Legs", instructions: "Stand tall. Take a step backward with your right foot. Lower your hips so that your left thigh becomes parallel to the floor, with your left knee positioned directly over your ankle. Return to standing." },
      { name: "Plank to Downward Dog", sets: 3, reps: "10 reps", type: "Full Body", instructions: "Start in a high plank position. Push your hips up and back into a downward dog position, keeping your legs and back straight. Return to the plank position." },
      { name: "Russian Twists", sets: 3, reps: "30 reps", type: "Core", instructions: "Sit on the floor with your knees bent and feet lifted slightly off the ground. Lean back slightly, keeping your back straight. Clasp your hands together and twist your torso to the right, then to the left." }
    ],
    "cutting": [
      { name: "Jump Rope", sets: 4, reps: "60 secs", type: "Cardio", instructions: "Hold the rope handles and swing the rope over your head. Jump lightly on the balls of your feet just high enough for the rope to pass under." },
      { name: "Squat Jumps", sets: 3, reps: "45 secs", type: "Legs/Cardio", instructions: "Start in a squat position. Explosively jump up, reaching your arms overhead. Land softly back into the squat position and repeat immediately." },
      { name: "Shadow Boxing", sets: 3, reps: "60 secs", type: "Full Body", instructions: "Get into a fighting stance. Throw continuous punches (jabs, crosses, hooks, uppercuts) into the air while moving lightly on your feet." },
      { name: "Flutter Kicks", sets: 3, reps: "45 secs", type: "Core", instructions: "Lie on your back with your legs straight. Lift your heels about 6 inches off the floor. Rapidly kick your legs up and down in a small, scissor-like motion." },
      { name: "Skater Jumps", sets: 3, reps: "45 secs", type: "Cardio", instructions: "Start standing. Jump to your right, landing on your right foot and sweeping your left foot behind you. Immediately jump to your left, landing on your left foot and sweeping your right foot behind you." }
    ],
    "bulking": [
      { name: "Pike Push Ups", sets: 4, reps: "8 reps", type: "Shoulders", instructions: "Start in a downward dog position. Bend your elbows and lower the top of your head towards the floor between your hands. Push back up." },
      { name: "Bulgarian Split Squats", sets: 4, reps: "8 reps", type: "Legs", instructions: "Stand a couple of feet in front of a bench. Place the top of one foot on the bench behind you. Lower your body until your front thigh is parallel to the floor. Push back up." },
      { name: "Pull Ups", sets: 4, reps: "8 reps", type: "Back", instructions: "Grab the pull-up bar with your palms facing away from you, hands slightly wider than shoulder-width. Pull your body up until your chin is over the bar. Lower yourself back down with control." },
      { name: "Decline Push Ups", sets: 3, reps: "10 reps", type: "Chest", instructions: "Place your feet on a bench or elevated surface and your hands on the floor in a push-up position. Lower your chest to the floor and push back up." },
      { name: "Hollow Body Hold", sets: 3, reps: "45 secs", type: "Core", instructions: "Lie on your back. Press your lower back into the floor. Lift your legs a few inches off the floor and lift your shoulders off the floor, reaching your arms overhead or alongside your body. Hold this position." }
    ]
  };

  const currentRoutine = routines[activeGoal];

  // 🔥 2. DYNAMIC LOCAL VIDEO FETCHER
  const getWorkoutVideoUrl = (exerciseName) => {
    // Formats "Push Ups" into "push-ups" to match your downloaded file names
    const formattedName = exerciseName.trim().toLowerCase().replace(/\s+/g, '-');
    
    // Points to the public/assets/videos folder 
    return `/assets/videos/${userGender.trim().toLowerCase()}/${formattedName}.mp4?v=7`; 
  };

  const [loadingVideos, setLoadingVideos] = useState(
    currentRoutine.reduce((acc, _, idx) => ({ ...acc, [idx]: true }), {})
  );

  const handleVideoLoad = (index) => {
    setLoadingVideos(prev => ({ ...prev, [index]: false }));
  };

  const [completedExercises, setCompletedExercises] = useState({});
  const toggleCompleteExercise = (index) => {
    setCompletedExercises(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const [showInstructions, setShowInstructions] = useState({});
  const toggleInstructions = (index) => {
    setShowInstructions(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // 🔥 3. STOPWATCH & TIMER LOGIC
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentExIndex, setCurrentExIndex] = useState(0);
  const [timerMode, setTimerMode] = useState("work"); // 'work' or 'rest'
  const [timeLeft, setTimeLeft] = useState(0);

  // Helper to convert "15 reps" or "45 secs" into pure seconds for the timer
  const parseTimeToSeconds = (repsOrTime) => {
    if (repsOrTime.includes("sec")) {
      return parseInt(repsOrTime.replace(/\D/g, '')) || 45;
    }
    // If it's reps, we estimate 3 seconds per rep to give them time to complete it
    const reps = parseInt(repsOrTime.replace(/\D/g, '')) || 12;
    return reps * 3;
  };

  // 🗣️ AI Voice Coach Helper
  const speak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Clear any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.1; // Slightly higher pitch for motivation
      window.speechSynthesis.speak(utterance);
    }
  };

  const startWorkout = () => {
    setIsWorkoutActive(true);
    setIsPaused(false);
    setCurrentExIndex(0);
    setTimerMode("work");
    
    const time = parseTimeToSeconds(currentRoutine[0].reps);
    setTimeLeft(time);
    
    speak(`Workout started! Let's go. First exercise: ${currentRoutine[0].name} for ${time} seconds.`);

    // Auto-scroll to the first exercise
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const nextPhase = () => {
    if (timerMode === "work") {
      // Switch to 1 MINUTE REST
      setTimerMode("rest");
      setTimeLeft(60); 
      speak("Great job! Rest for 60 seconds.");
    } else {
      // Move to next exercise
      if (currentExIndex < currentRoutine.length - 1) {
        setCurrentExIndex(currentExIndex + 1);
        setTimerMode("work");
        
        const time = parseTimeToSeconds(currentRoutine[currentExIndex + 1].reps);
        setTimeLeft(time);
        
        speak(`Next exercise: ${currentRoutine[currentExIndex + 1].name} for ${time} seconds. Let's do this!`);
      } else {
        // Workout Finished
        setIsWorkoutActive(false);
        speak("Congratulations! You have successfully completed your workout. Amazing work!");
        alert("🎉 Congratulations! You completed your workout!");
      }
    }
  };

  // The actual Timer loop
  useEffect(() => {
    let interval = null;
    if (isWorkoutActive && !isPaused && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (isWorkoutActive && !isPaused && timeLeft === 0) {
      nextPhase(); // Auto-advance when timer hits 0
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWorkoutActive, isPaused, timeLeft, timerMode, currentExIndex]);

  // Format seconds to MM:SS
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="p-4 sm:p-8 md:p-10 bg-theme-bg min-h-screen font-sans relative">
      <header className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 mb-8 sm:mb-10">
        <button 
          className="self-start sm:self-auto px-4 py-2 bg-theme-card text-theme-muted border border-theme-border rounded-xl font-bold hover:bg-theme-border transition-colors flex items-center"
          onClick={() => navigate(-1)}
        >
          <FontAwesomeIcon icon={faArrowLeft} className="mr-2"/> Back
        </button>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-theme-text m-0">Your Custom Workout</h1>
          <span className="bg-theme-text text-theme-bg px-3 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold tracking-wide uppercase">{activeGoal} ROUTINE</span>
        </div>
      </header>

      {/* STATS BANNER */}
      <div className="flex flex-col sm:flex-row flex-wrap bg-theme-card p-5 sm:p-6 rounded-3xl shadow-sm mb-8 sm:mb-10 gap-5 sm:gap-10 border border-theme-border">
        <div className="flex items-center gap-4 flex-1 min-w-[200px]">
          <FontAwesomeIcon icon={faStopwatch} className="text-3xl text-theme-accent bg-theme-bg p-3.5 rounded-2xl" />
          <div>
            <div className="text-theme-muted text-xs font-extrabold uppercase mb-1">Duration</div>
            <div className="text-theme-text text-base sm:text-lg font-extrabold">45 Minutes</div>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-1 min-w-[200px]">
          <FontAwesomeIcon icon={faUser} className="text-3xl text-amber-500 bg-theme-bg p-3.5 rounded-2xl" />
          <div>
            <div className="text-theme-muted text-xs font-extrabold uppercase mb-1">Target Model</div>
            <div className="text-theme-text text-base sm:text-lg font-extrabold capitalize">{userGender} Anatomy</div>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-1 min-w-[200px]">
          <FontAwesomeIcon icon={faDumbbell} className="text-3xl text-blue-500 bg-theme-bg p-3.5 rounded-2xl" />
          <div>
            <div className="text-theme-muted text-xs font-extrabold uppercase mb-1">Rest Time</div>
            <div className="text-theme-text text-base sm:text-lg font-extrabold">60 Secs Between Sets</div>
          </div>
        </div>
      </div>

      {/* EXERCISE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {currentRoutine.map((exercise, index) => {
          // Highlight the card if it's the currently active exercise in the timer
          const isActiveCard = isWorkoutActive && index === currentExIndex;
          
          return (
            <div key={index} className={`bg-theme-card rounded-3xl overflow-hidden shadow-sm transition-transform border ${isActiveCard ? 'border-4 border-emerald-500' : 'border border-theme-border'}`}>
              <div className="w-full h-48 sm:h-56 bg-theme-bg relative">
                {loadingVideos[index] && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-theme-bg z-10">
                    <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-emerald-500" />
                    <span className="mt-2 text-xs text-slate-500 font-medium">Loading Video...</span>
                  </div>
                )}
                {/* Real HTML5 Video Tag pointing to local files */}
                <video 
                  src={getWorkoutVideoUrl(exercise.name)} 
                  autoPlay
                  loop
                  muted
                  playsInline
                  className={`w-full h-full object-cover ${loadingVideos[index] ? 'hidden' : 'block'}`}
                  onLoadedData={() => handleVideoLoad(index)}
                  onError={(e) => {
                    // Logs to console if you haven't downloaded this exercise's MP4 yet
                    console.error("Missing video file:", e.target.src);
                    
                    // Hides the broken video icon to keep the UI clean
                    e.target.style.display = 'none'; 
                    handleVideoLoad(index);
                  }}
                />
                <div className="absolute top-3 right-3 bg-slate-900/80 text-white px-3 py-1.5 rounded-lg text-xs font-bold backdrop-blur-sm z-20">{exercise.type}</div>
              </div>
              
              <div className="p-5 sm:p-6">
                <div className="flex justify-between items-center mb-4 gap-2">
                  <h3 className="text-lg sm:text-xl font-extrabold text-theme-text m-0 leading-tight">{index + 1}. {exercise.name}</h3>
                  <button 
                    onClick={() => toggleCompleteExercise(index)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold shrink-0 transition-colors ${completedExercises[index] ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}
                  >
                    <FontAwesomeIcon icon={completedExercises[index] ? faCheckCircle : faDumbbell} />
                    {completedExercises[index] ? 'Done' : 'Do it'}
                  </button>
                </div>
                
                <div className="flex justify-between bg-theme-bg p-3 sm:p-4 rounded-xl border border-theme-border">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-extrabold text-theme-muted uppercase">SETS</span>
                    <span className="text-sm sm:text-base font-extrabold text-theme-accent">{exercise.sets}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-extrabold text-theme-muted uppercase">TARGET</span>
                    <span className="text-sm sm:text-base font-extrabold text-theme-accent">{exercise.reps}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-extrabold text-theme-muted uppercase">REST</span>
                    <span className="text-sm sm:text-base font-extrabold text-theme-accent">60 secs</span>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <button 
                    onClick={() => toggleInstructions(index)}
                    className="bg-transparent border-none text-theme-muted hover:text-theme-primary text-xs font-extrabold cursor-pointer underline transition-colors"
                  >
                    {showInstructions[index] ? 'Hide Instructions' : 'View Correct Form'}
                  </button>
                </div>
                
                {showInstructions[index] && (
                  <div className="mt-4 p-4 bg-emerald-50/50 rounded-xl border border-emerald-500/20">
                    <h4 className="m-0 mb-2 text-xs text-theme-accent font-extrabold uppercase">Correct Form</h4>
                    <p className="m-0 text-xs sm:text-sm text-theme-text leading-relaxed">
                      {exercise.instructions || "No instructions provided."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* INITIAL START BUTTON */}
      {!isWorkoutActive && (
        <div className="mt-12 flex justify-center pb-12">
          <button 
            className="w-full sm:w-auto px-8 py-4 bg-theme-accent hover:bg-emerald-600 text-white rounded-2xl text-lg font-extrabold shadow-lg shadow-emerald-500/30 transition-all flex justify-center items-center gap-2"
            onClick={startWorkout}
          >
            <FontAwesomeIcon icon={faCheckCircle} /> Start Workout Now
          </button>
        </div>
      )}

      {/* 🔥 STICKY LIVE WORKOUT TIMER OVERLAY */}
      {isWorkoutActive && (
        <div className="fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 w-[95%] sm:w-[90%] max-w-4xl bg-theme-card border-2 border-theme-border rounded-3xl p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-center shadow-2xl z-50 gap-4">
          <div className="flex flex-col text-center sm:text-left">
            <span className="text-theme-muted text-[10px] sm:text-xs font-extrabold uppercase tracking-wide mb-1">
              {timerMode === "work" ? "🔥 ACTIVE EXERCISE" : "💤 RECOVERY REST"}
            </span>
            <h2 className="text-theme-text text-xl sm:text-2xl font-extrabold m-0 truncate max-w-xs">
              {timerMode === "work" 
                ? currentRoutine[currentExIndex].name 
                : "Rest & Hydrate!"}
            </h2>
          </div>

          <div className={`text-4xl sm:text-5xl font-black font-mono ${timerMode === "rest" ? 'text-blue-500' : 'text-emerald-500'}`}>
            {formatTime(timeLeft)}
          </div>

          <div className="flex gap-3 w-full sm:w-auto">
            <button 
              className="flex-1 sm:flex-none px-4 py-3 bg-theme-accent hover:bg-emerald-600 text-white rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-colors"
              onClick={() => setIsPaused(!isPaused)}
            >
              <FontAwesomeIcon icon={isPaused ? faPlay : faPause} /> 
              {isPaused ? "Resume" : "Pause"}
            </button>
            <button 
              className="flex-1 sm:flex-none px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-colors"
              onClick={nextPhase}
            >
              Skip <FontAwesomeIcon icon={faStepForward} />
            </button>
          </div>
        </div>
      )}
      
      {/* Adds padding to the bottom so the sticky timer doesn't hide cards */}
      <div className={`${isWorkoutActive ? 'h-40 sm:h-32' : 'h-0'}`}></div>
    </div>
  );
};

export default WorkoutsPage;