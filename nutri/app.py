from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import pulp
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler
import numpy as np
from google import genai 
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import os
import random
import json
import re
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# ---------------- DATABASE CONFIGURATION ----------------
# Using local PostgreSQL connection
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:lokesh%4011@localhost:5432/foodie_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    name = db.Column(db.String(100))
    phone = db.Column(db.String(20), nullable=True)
    profile_pic = db.Column(db.Text, nullable=True)
    password_hash = db.Column(db.String(256), nullable=False)
    age = db.Column(db.Integer)
    gender = db.Column(db.String(20))
    height = db.Column(db.Float)
    weight = db.Column(db.Float)
    activity_level = db.Column(db.String(50))
    goal = db.Column(db.String(50))
    created_at = db.Column(db.String(50), default=lambda: datetime.now().strftime("%Y-%m-%d"))
    plans = db.relationship('WeeklyPlan', backref='owner', lazy=True)

OTP_STORE = {}


class WeeklyPlan(db.Model):
    plan_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    total_calories = db.Column(db.Integer)
    plan_data = db.Column(db.JSON, nullable=False) 
    created_at = db.Column(db.String(50), default=lambda: datetime.now().strftime("%Y-%m-%d %H:%M"))

with app.app_context():
    db.create_all()

# ---------------- LLM CONFIGURATION ----------------
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def extract_json(text):
    text = text.strip()
    first_brace = text.find('{')
    last_brace = text.rfind('}')
    if first_brace != -1 and last_brace != -1:
        return text[first_brace:last_brace+1]
    return text

def generate_ai_insights(user_profile, symptoms):
    if not symptoms:
        symptoms = ["General health maintenance"]
        
    syms_str = ", ".join(symptoms) if isinstance(symptoms, list) else str(symptoms)
    
    prompt = f"""
    User Profile: {user_profile['age']} years old, {user_profile['gender']}. Goal: {user_profile['goal']}.
    Current focus/symptoms: {syms_str}.

    Provide a JSON response containing exactly two keys:
    1. "recovery_strategy": An array of 3 specific food recommendations to help with the symptoms. Each object must have these exact keys: "symptom", "food", "nutrient", "qty".
    2. "ai_advice": A personalized 2-sentence expert tip based on their goal and symptoms.

    CRITICAL DIETARY RESTRICTIONS:
    - ALL food recommendations MUST be strictly authentic Indian foods or common Indian ingredients.
    - ABSOLUTELY NO beef, pork, or related products are allowed.

    CRITICAL INSTRUCTIONS: Output ONLY valid JSON. Do not include markdown formatting like ```json. 
    Every single property name MUST be enclosed in double quotes. Do not use single quotes.
    """
    try:
        response = client.models.generate_content(model='gemini-3.5-flash', contents=prompt)
        clean_text = extract_json(response.text)
        return json.loads(clean_text)
    except Exception as e:
        print(f"Gemini API JSON Error: {e}") 
        return {
            "recovery_strategy": [],
            "ai_advice": "Focus on maintaining a balanced diet, staying hydrated, and getting plenty of rest to support your body's natural recovery."
        }

# ---------------- DATA PREPARATION ----------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
dataset_path = os.path.join(BASE_DIR, "dataset", "final food dataset.csv")
df = pd.read_csv(dataset_path)
df["meal_type"] = df["meal_type"].str.lower().str.strip().replace("snacks", "snack")
df["food_type"] = df["food_type"].str.lower().str.strip()

feature_cols = ['calories_kcal', 'protein_g', 'carbs_g', 'fats_g']
scaler = MinMaxScaler()
df_scaled = scaler.fit_transform(df[feature_cols].fillna(0))

# ---------------- HELPERS ----------------
def bmr(w, h, a, g):
    return 10*float(w) + 6.25*(float(h)*100) - 5*int(a) + (5 if str(g).lower()=="male" else -161)

def calorie_target(tdee, goal):
    g = str(goal).lower()
    if any(x in g for x in ["gain", "bulking"]): return tdee + 500
    if any(x in g for x in ["loss", "fat"]): return max(1200, tdee - 500)
    return tdee

def get_ml_recommendation(pool, target_cal):
    target_values = [[target_cal, (target_cal * 0.3) / 4, (target_cal * 0.4) / 4, (target_cal * 0.3) / 9]]
    target_scaled = scaler.transform(pd.DataFrame(target_values, columns=feature_cols))
    
    pool_vectors = df_scaled[pool.index]
    similarities = cosine_similarity(target_scaled, pool_vectors)
    best_idx = pool.index[np.random.choice(similarities[0].argsort()[-15:])]
    return df.iloc[best_idx]

def optimize_meal_qty(food_item, target_cal):
    prob = pulp.LpProblem("Qty_Opt", pulp.LpMinimize)
    qty = pulp.LpVariable("qty", lowBound=0.2, upBound=8.0)
    diff = pulp.LpVariable("diff", lowBound=0)
    prob += diff
    prob += diff >= (qty * food_item['calories_kcal']) - target_cal
    prob += diff >= target_cal - (qty * food_item['calories_kcal'])
    prob.solve(pulp.PULP_CBC_CMD(msg=0))
    return round(pulp.value(qty), 2)

def format_fruit_unit(qty, unit_str):
    if qty <= 1: return unit_str
    if "slice of" in unit_str: return unit_str.replace("slice of", "slices of")
    if "cup of" in unit_str: return unit_str.replace("cup of", "cups of")
    if unit_str.endswith("s"): return unit_str
    if unit_str.endswith("ch"): return unit_str + "es" 
    return unit_str + "s"

# ---------------- PLAN GENERATOR ----------------
def generate_weekly_plan(daily_cal, exclusions, diet_pref):
    split = {"breakfast": 0.35, "lunch": 0.40, "snack": 0.15, "dinner": 0.10}
    weekly_output = {}
    pref = str(diet_pref).lower().strip()

    base_pool = df.copy()
    if pref == "vegetarian":
        base_pool = base_pool[base_pool["food_type"].isin(["vegetarian", "vegan"])]
    elif pref == "vegan":
        base_pool = base_pool[base_pool["food_type"] == "vegan"]

    clean_exclusions = []
    if exclusions:
        if isinstance(exclusions, str):
            clean_exclusions = [x.strip().lower() for x in exclusions.split(',')]
        elif isinstance(exclusions, list):
            for item in exclusions:
                clean_exclusions.extend([x.strip().lower() for x in str(item).split(',')])
        
        clean_exclusions = [x for x in clean_exclusions if x]

        for item in clean_exclusions:
            base_pool = base_pool[~base_pool["food_name"].str.contains(item, case=False, na=False)]

    for day in range(1, 8):
        day_key = f"Day {day}"
        lines = [f"DAY_MARKER_{day}"]
        total_day_cal = 0
        
        for meal, ratio in split.items():
            target = round(daily_cal * ratio)
            
            meal_pool = base_pool[base_pool["meal_type"] == meal]
            
            if "non" in pref and meal in ["lunch", "dinner"]:
                nv_pool = meal_pool[meal_pool["food_type"] == "non-vegetarian"]
                if not nv_pool.empty:
                    meal_pool = nv_pool
            
            if meal_pool.empty:
                meal_pool = base_pool 

            if meal_pool.empty:
                lines.append(f"[{meal.upper()}]: No suitable food found - 0g (0 kcal) [END_MEAL]")
                continue
            
            food = get_ml_recommendation(meal_pool, target)
            qty = optimize_meal_qty(food, target)
            meal_cal = int(qty * food['calories_kcal'])
            total_day_cal += meal_cal
            
            lines.append(f"[{meal.upper()}]: {food['food_name']} - {int(qty*100)}g ({meal_cal} kcal) [END_MEAL]")
        
        lines.append(f"[CALORIE_COUNT]: {int(total_day_cal)}")
        weekly_output[day_key] = "\n".join(lines)
        
    return weekly_output

# ---------------- MAIN API ENDPOINT ----------------
@app.route("/api/nutrition", methods=["POST"])
def api():
    try:
        data = request.get_json()
        email = str(data.get("email") or "guest@example.com")
        
        user = User.query.filter_by(email=email).first()
        if not user:
            user = User(email=email, password_hash="guest_unregistered"); db.session.add(user); db.session.commit()
        
        user.age = int(data.get("age", 0))
        user.weight = float(data.get("weight", 0))
        user.height = float(data.get("height", 0))
        user.gender = str(data.get("gender", "male"))
        user.goal = str(data.get("goal", "maintenance"))
        diet_pref = str(data.get("diet_preference") or "vegetarian")
        
        activity = str(data.get("exercises") or data.get("activity_level") or "moderate").lower().strip()
        user.activity_level = activity

        user_profile = {
            "age": user.age,
            "gender": user.gender,
            "goal": user.goal
        }
        
        ai_insights = generate_ai_insights(user_profile, data.get("symptoms", []))
        
        recovery_data = ai_insights.get("recovery_strategy", [])
        formatted_recovery = ""
        if isinstance(recovery_data, list) and len(recovery_data) > 0:
            formatted_recovery = "\n".join([
                f"{item.get('symptom', 'N/A')} | {item.get('food', 'N/A')} | {item.get('nutrient', 'N/A')} | {item.get('qty', 'N/A')}" 
                for item in recovery_data if isinstance(item, dict)
            ])

        base_bmr = bmr(user.weight, user.height, user.age, user.gender)
        
        multiplier = 1.55
        if activity == "sedentary":
            multiplier = 1.2
        elif "light" in activity:
            multiplier = 1.375
        elif activity == "moderate":
            multiplier = 1.55
        elif activity == "active":
            multiplier = 1.725
        elif activity == "athlete":
            multiplier = 1.9
            
        tdee = base_bmr * multiplier
        daily = calorie_target(round(tdee), user.goal)
        
        plan = generate_weekly_plan(daily, data.get("exclusions", []), diet_pref)

        rich_plan_data = {
            "weekly_plan": plan,
            "target_cal": int(daily),
            "bmr": int(base_bmr),
            "tdee": int(tdee),
            "user_details": {
                "age": user.age,
                "weight": user.weight,
                "height": user.height * 100 if user.height < 10 else user.height, # Store height in cm in user_details for display consistency
                "gender": user.gender,
                "goal": user.goal,
                "diet": diet_pref,
                "exclusions": data.get("exclusions", [])
            },
            "deficiency_analysis": formatted_recovery,
            "ai_advice": ai_insights.get("ai_advice", "Focus on balanced nutrition.")
        }

        new_plan = WeeklyPlan(user_id=user.id, total_calories=int(daily), plan_data=rich_plan_data)
        db.session.add(new_plan); db.session.commit()

        return jsonify({
            "success": True, 
            "weekly_plan": plan, 
            "target_cal": int(daily),
            "bmr": int(base_bmr),
            "tdee": int(tdee),
            "user_details": {
                "age": user.age,
                "weight": user.weight,
                "height": user.height * 100 if user.height < 10 else user.height,
                "gender": user.gender,
                "goal": user.goal,
                "diet": diet_pref
            },
            "deficiency_analysis": formatted_recovery, 
            "ai_advice": ai_insights.get("ai_advice", "Focus on balanced nutrition.")
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 400

# ---------------- GET ENDPOINTS (ADMIN / HISTORY) ----------------
@app.route("/api/users", methods=["GET"])
def get_all_users():
    try:
        users = User.query.all()
        all_users_data = []
        
        for user in users:
            user_plans = []
            for plan in user.plans:
                user_plans.append({
                    "plan_id": plan.plan_id,
                    "total_calories": plan.total_calories,
                    "created_at": plan.created_at,
                    "plan_data": plan.plan_data
                })
            
            all_users_data.append({
                "user_id": user.id,
                "email": user.email,
                "age": user.age,
                "gender": user.gender,
                "weight": user.weight,
                "height": user.height,
                "goal": user.goal,
                "account_created": user.created_at,
                "total_plans_generated": len(user_plans),
                "plans": user_plans
            })
            
        return jsonify({"success": True, "total_users": len(users), "data": all_users_data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/user/<email>", methods=["GET"])
def get_specific_user(email):
    try:
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"success": False, "error": f"No user found with email: {email}"}), 404
            
        user_plans = []
        latest_diet = "vegetarian"
        for plan in user.plans:
            pdata = plan.plan_data
            if pdata:
                if isinstance(pdata, str):
                    try:
                        pdata = json.loads(pdata)
                    except:
                        pdata = {}
                if isinstance(pdata, dict):
                    details = pdata.get("user_details", {})
                    if details and details.get("diet"):
                        latest_diet = details.get("diet")
            user_plans.append({
                "plan_id": plan.plan_id,
                "total_calories": plan.total_calories,
                "created_at": plan.created_at,
                "plan_data": plan.plan_data
            })
            
        # Sort plans to get the newest one first
        latest_bmr = 0
        latest_tdee = 0
        if len(user.plans) > 0:
            sorted_plans = sorted(user.plans, key=lambda p: p.plan_id, reverse=True)
            newest_plan = sorted_plans[0]
            pdata = newest_plan.plan_data
            if pdata:
                if isinstance(pdata, str):
                    try:
                        pdata = json.loads(pdata)
                    except:
                        pdata = {}
                if isinstance(pdata, dict):
                    latest_bmr = pdata.get("bmr", 0)
                    latest_tdee = pdata.get("tdee", 0)

        # Fallback calculations if not found or zero
        if not latest_bmr or not latest_tdee:
            if user.weight and user.height and user.age:
                h_m = user.height
                h_cm = h_m * 100 if h_m < 10 else h_m
                calculated_bmr = round(10 * float(user.weight) + 6.25 * float(h_cm) - 5 * int(user.age) + (5 if str(user.gender).lower() == "male" else -161))
                
                activity = str(user.activity_level or "moderate").lower().strip()
                multiplier = 1.55
                if activity == "sedentary": multiplier = 1.2
                elif "light" in activity: multiplier = 1.375
                elif activity == "moderate": multiplier = 1.55
                elif activity == "active": multiplier = 1.725
                elif activity == "athlete": multiplier = 1.9
                calculated_tdee = round(calculated_bmr * multiplier)
                
                if not latest_bmr: latest_bmr = calculated_bmr
                if not latest_tdee: latest_tdee = calculated_tdee
            
        return jsonify({
            "success": True, 
            "user_info": {
                "email": user.email,
                "phone": user.phone or "",
                "name": user.name or "User",
                "age": user.age,
                "gender": user.gender,
                "weight": user.weight,
                "height": user.height * 100 if (user.height and user.height < 10) else user.height,
                "activity_level": user.activity_level,
                "goal": user.goal,
                "diet": latest_diet,
                "bmr": latest_bmr,
                "tdee": latest_tdee,
                "account_created": user.created_at,
                "profile_pic": user.profile_pic
            },
            "history": user_plans
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/send-otp", methods=["POST"])
def send_otp():
    try:
        data = request.get_json()
        email = data.get("email")
        if not email:
            return jsonify({"success": False, "error": "Email is required"}), 400
        
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404
            
        otp_code = str(random.randint(100000, 999999))
        OTP_STORE[email] = otp_code
        
        subject = "Your Foodie AI Verification Code"
        body = f"Hello {user.name or 'User'},\n\nYour verification code to update your profile is: {otp_code}\n\nDo not share this code with anyone.\n\nThanks,\nFoodie AI Team"
        send_email_notification(email, subject, body)
        
        return jsonify({"success": True, "message": "OTP sent successfully"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/verify-otp", methods=["POST"])
def verify_otp():
    try:
        data = request.get_json()
        email = data.get("email")
        otp = data.get("otp")
        if not email or not otp:
            return jsonify({"success": False, "error": "Email and OTP required"}), 400
            
        if OTP_STORE.get(email) == str(otp).strip():
            return jsonify({"success": True, "message": "OTP verified successfully"})
        else:
            return jsonify({"success": False, "error": "Invalid or expired OTP"}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/update-profile", methods=["POST"])
def update_profile():
    try:
        data = request.get_json()
        old_email = data.get("old_email")
        new_email = data.get("new_email")
        name = data.get("name")
        phone = data.get("phone")
        
        if not old_email:
            return jsonify({"success": False, "error": "Current email is required"}), 400
            
        user = User.query.filter_by(email=old_email).first()
        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404
            
        if new_email and new_email != old_email:
            existing = User.query.filter_by(email=new_email).first()
            if existing:
                return jsonify({"success": False, "error": "Email is already taken"}), 400
            user.email = new_email
            
        if name is not None:
            user.name = name
            
        if phone is not None:
            user.phone = phone
            
        db.session.commit()
        return jsonify({"success": True, "message": "Profile updated successfully"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/plan/<int:plan_id>", methods=["DELETE"])
def delete_plan(plan_id):
    try:
        plan = WeeklyPlan.query.get(plan_id)
        if not plan:
            return jsonify({"success": False, "error": "Plan not found"}), 404
        
        db.session.delete(plan)
        db.session.commit()
        return jsonify({"success": True, "message": "Plan deleted successfully"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

# ---------------- AUTH & SECURE REGISTRATION ----------------
@app.route("/api/register", methods=["POST"])
def register():
    try:
        data = request.get_json()
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")

        if not name or not email or not password:
            return jsonify({"success": False, "error": "Name, email, and password are required"}), 400

        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({"success": False, "error": "User already exists with this email"}), 400

        hashed = generate_password_hash(password)
        new_user = User(name=name, email=email, password_hash=hashed)
        db.session.add(new_user)
        db.session.commit()

        return jsonify({"success": True, "message": "User registered successfully"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"success": False, "error": "Email and password are required"}), 400

        user = User.query.filter_by(email=email).first()
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({"success": False, "error": "Invalid email or password"}), 400

        return jsonify({
            "success": True,
            "name": user.name or "User",
            "email": user.email,
            "profile_pic": user.profile_pic
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/update-profile-pic", methods=["POST"])
def update_profile_pic():
    try:
        data = request.get_json()
        email = data.get("email")
        profile_pic = data.get("profile_pic")
        
        if not email or not profile_pic:
            return jsonify({"success": False, "error": "Email and profile_pic required"}), 400
            
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404
            
        user.profile_pic = profile_pic
        db.session.commit()
        
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

# ---------------- AI HEALTH COACH CHATBOT ----------------
@app.route("/api/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        email = data.get("email")
        message = data.get("message")

        user = User.query.filter_by(email=email).first()
        user_context = ""
        if user and user.age:
            user_context = f"User Profile: {user.age} years old, {user.gender}, weight {user.weight}kg, height {user.height}m. Goal: {user.goal}."

        prompt = f"""
        You are Antigravity, a professional AI Health & Nutrition Coach.
        Your job is to provide helpful, actionable, and encouraging health, workout, and diet advice.
        
        IMPORTANT rules:
        - Provide response in clean markdown.
        - Be concise and focus on authentic Indian and international balanced foods.
        - Avoid beef/pork recommendations.
        - Always customize advice to the user's details if available.
        
        {user_context}
        User's Question: {message}
        """

        response = client.models.generate_content(model='gemini-3.5-flash', contents=prompt)
        return jsonify({"success": True, "reply": response.text.strip()})
    except Exception as e:
        print("Chat coach error:", e)
        fallback_replies = [
            "To hit your goals, focus on tracking your macros daily, stay hydrated, and target 7-8 hours of sleep.",
            "Make sure you consume adequate protein (like lentils, paneer, tofu) to protect muscle tissues during your fat loss/muscle gain journey.",
            "Consistency is key! Try keeping a food diary and moving for at least 30 minutes every single day.",
            "For a quick healthy snack, Greek yogurt with berries or a handful of roasted almonds is perfect for maintaining stable blood sugar."
        ]
        reply = f"*(AI Advisor Offline)*\n\n{random.choice(fallback_replies)}\n\n*Feel free to ask another question!*"
        return jsonify({"success": True, "reply": reply})

# ---------------- DYNAMIC RECIPE GENERATOR ----------------
@app.route("/api/recipe", methods=["POST"])
def get_recipe():
    try:
        data = request.get_json()
        food_name = data.get("food_name")

        if not food_name:
            return jsonify({"success": False, "error": "Food name is required"}), 400

        prompt = f"""
        Provide a detailed recipe for the Indian/international food item: "{food_name}".
        
        You MUST output a valid JSON response containing EXACTLY these keys:
        1. "prep_time": A string indicating preparation and cooking time (e.g. "25 mins").
        2. "ingredients": An array of strings representing ingredients with quantities.
        3. "instructions": An array of strings representing step-by-step instructions.
        4. "macros": An object with keys "protein", "carbs", "fats", "calories" (numerical values).

        Output ONLY raw JSON. Do not wrap in markdown ```json or include any text before or after the JSON.
        """
        
        response = client.models.generate_content(model='gemini-3.5-flash', contents=prompt)
        clean_text = extract_json(response.text)
        recipe_json = json.loads(clean_text)
        return jsonify({"success": True, "recipe": recipe_json})
    except Exception as e:
        print("Recipe generation error:", e)
        return jsonify({
            "success": True, 
            "error_msg": str(e),
            "recipe": {
                "prep_time": "15 mins",
                "ingredients": ["Rice", "Vegetables", "Soy Sauce", "Spices", "Oil"],
                "instructions": ["Chop the vegetables.", "Heat oil in a pan and stir-fry the vegetables.", "Add cooked rice and soy sauce.", "Mix well and serve hot."],
                "macros": {"protein": 8, "carbs": 45, "fats": 12, "calories": 320}
            }
        }), 200

def send_email_notification(to_email, subject, body):
    # Log to terminal/console so we can verify it
    print("\n" + "="*50)
    print(f"📧 EMAIL NOTIFICATION ATTEMPT TO: {to_email}")
    print(f"Subject: {subject}")
    print(f"Body:\n{body}")
    print("="*50 + "\n")
    
    sender_email = os.getenv("SMTP_USER", "")
    sender_password = os.getenv("SMTP_PASSWORD", "")
    
    try:
        msg = MIMEMultipart()
        msg['From'] = sender_email if sender_email else 'foodieai.reminder@gmail.com'
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))
        
        if sender_email and sender_password:
            with smtplib.SMTP('smtp.gmail.com', 587) as server:
                server.starttls()
                server.login(sender_email, sender_password)
                server.sendmail(sender_email, [to_email], msg.as_string())
            print("Email successfully sent via Gmail SMTP.")
        else:
            print("WARNING: SMTP_USER or SMTP_PASSWORD not set in .env file. Email not actually sent to recipient.")
    except Exception as e:
        print(f"Error sending email: {e}")

@app.route("/api/notify-forgot-meal", methods=["POST"])
def notify_forgot_meal():
    try:
        data = request.get_json()
        email = data.get("email")
        meal_type = data.get("meal_type", "Breakfast").strip().capitalize()
        if not email:
            return jsonify({"success": False, "message": "Email is required"}), 400
            
        user = User.query.filter_by(email=email).first()
        user_name = user.name if user and user.name else "User"
        
        quotes = {
            "Breakfast": '"Take care of your body. It\'s the only place you have to live." — Jim Rohn',
            "Lunch": '"Let food be thy medicine and medicine be thy food." — Hippocrates',
            "Snack": '"Healthy eating is a way of life, so it\'s important to establish routines." — Marcus Samuelsson',
            "Dinner": '"Early to bed and early to rise makes a man healthy, wealthy, and wise." — Benjamin Franklin'
        }
        
        timings = {
            "Breakfast": "12 PM",
            "Lunch": "4 PM",
            "Snack": "7 PM",
            "Dinner": "11 PM"
        }
        
        details = {
            "Breakfast": "Eating a nutritious breakfast keeps your metabolism active and helps you reach your calorie and macro goals.",
            "Lunch": "A balanced lunch provides vital midday fuel to sustain your energy levels and mental focus throughout the afternoon.",
            "Snack": "Smart snacking helps control hunger spikes and prevents overeating during dinner.",
            "Dinner": "A light, nutritious dinner supports healthy digestion and restorative sleep overnight."
        }
        
        quote = quotes.get(meal_type, quotes["Breakfast"])
        time_limit = timings.get(meal_type, "the scheduled time")
        detail = details.get(meal_type, details["Breakfast"])
        
        subject = f"Gentle Reminder: Let's log your {meal_type}! 🌟"
        body = f"""Hi {user_name},

{quote}

We noticed that you have forgot to update your meal logger for {meal_type} today before {time_limit}. Keeping track of your meals is a wonderful step towards your wellness goals, and we are here to support you!

{detail}

Whenever you have a moment, please head over to your Dashboard and log your meals.

Warm regards,
Foodie AI Team"""

        send_email_notification(email, subject, body)
        return jsonify({"success": True, "message": f"Reminder email for {meal_type} successfully sent to {email}."})
    except Exception as e:
        print(f"Error in notify-forgot-meal: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/api/estimate-calories", methods=["POST"])
def estimate_calories():
    try:
        data = request.get_json()
        food_name = data.get("food_name", "").strip()
        quantity = float(data.get("quantity", 1))
        unit = data.get("unit", "pieces").strip()
        
        if not food_name:
            return jsonify({"success": False, "message": "Food name is required"}), 400
            
        prompt = f"""
        Analyze this food item and quantity to estimate its nutritional values:
        Food Name: {food_name}
        Quantity: {quantity}
        Unit: {unit}

        Provide a JSON response containing exactly these keys:
        - "calories": Estimated calories as an integer (kcal).
        - "protein": Protein in grams as an integer.
        - "carbs": Carbs in grams as an integer.
        - "fats": Fats in grams as an integer.

        CRITICAL INSTRUCTIONS: Output ONLY valid JSON. Do not include markdown formatting like ```json.
        """
        response = client.models.generate_content(model='gemini-3.5-flash', contents=prompt)
        clean_text = extract_json(response.text)
        result = json.loads(clean_text)
        
        return jsonify({
            "success": True,
            "calories": int(result.get("calories", 0)),
            "protein": int(result.get("protein", 0)),
            "carbs": int(result.get("carbs", 0)),
            "fats": int(result.get("fats", 0))
        })
    except Exception as e:
        print(f"Error in estimate-calories: {e}")
        # Graceful fallback so the UI never alerts "Failed to get estimation"
        base_cal = 1 if unit in ['ml', 'grams', 'g'] else 250
        base_pro = 0.05 if unit in ['ml', 'grams', 'g'] else 10
        base_carb = 0.1 if unit in ['ml', 'grams', 'g'] else 30
        base_fat = 0.02 if unit in ['ml', 'grams', 'g'] else 5
        
        return jsonify({
            "success": True,
            "calories": int(base_cal * quantity),
            "protein": int(base_pro * quantity),
            "carbs": int(base_carb * quantity),
            "fats": int(base_fat * quantity),
            "error_msg": str(e)
        })

def parse_meal_line(line, prefix):
    if not line.startswith(prefix):
        return None, 0
    content = line.replace(prefix, "").replace("[END_MEAL]", "").strip()
    match = re.search(r'\(([^)]+)\)', content)
    calories = 0
    food_name = content
    if match:
        cal_str = match.group(1)
        cal_match = re.search(r'\d+', cal_str)
        if cal_match:
            calories = int(cal_match.group())
        food_name = content[:match.start()].strip()
    return food_name, calories

@app.route("/api/replan-remaining", methods=["POST"])
def replan_remaining():
    try:
        data = request.get_json()
        email = data.get("email")
        day = data.get("day", "Day 1")
        meal_type = data.get("meal_type", "breakfast").strip().lower()
        custom_name = data.get("custom_name", "Custom Food").strip()
        custom_calories = int(data.get("custom_calories", 300))
        diet_pref = data.get("diet_preference", "vegetarian")
        exclusions = data.get("exclusions", [])
        
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"success": False, "error": "User not found"}), 404
            
        latest_plan = WeeklyPlan.query.filter_by(user_id=user.id).order_by(WeeklyPlan.plan_id.desc()).first()
        if not latest_plan:
            return jsonify({"success": False, "error": "No plan found to replan"}), 400
            
        plan_data = latest_plan.plan_data.copy() if latest_plan.plan_data else {}
        is_nested = "weekly_plan" in plan_data
        weekly_plan = plan_data["weekly_plan"] if is_nested else plan_data
        
        day_str = str(day)
        if day_str not in weekly_plan:
            return jsonify({"success": False, "error": f"Day {day} not found in active plan"}), 400
            
        day_text = weekly_plan[day_str]
        
        breakfast_name, breakfast_cal = "Oats Porridge", 300
        lunch_name, lunch_cal = "Rice and Dal", 500
        snack_name, snack_cal = "Apple", 100
        dinner_name, dinner_cal = "Roti and Sabzi", 450
        
        lines = day_text.split('\n')
        for line in lines:
            if line.startswith("[BREAKFAST]:"):
                b_name, b_c = parse_meal_line(line, "[BREAKFAST]:")
                if b_name:
                    breakfast_name, breakfast_cal = b_name, b_c
            elif line.startswith("[LUNCH]:"):
                l_name, l_c = parse_meal_line(line, "[LUNCH]:")
                if l_name:
                    lunch_name, lunch_cal = l_name, l_c
            elif line.startswith("[SNACK]:"):
                s_name, s_c = parse_meal_line(line, "[SNACK]:")
                if s_name:
                    snack_name, snack_cal = s_name, s_c
            elif line.startswith("[DINNER]:"):
                d_name, d_c = parse_meal_line(line, "[DINNER]:")
                if d_name:
                    dinner_name, dinner_cal = d_name, d_c

        if meal_type == "breakfast":
            breakfast_name = custom_name
            breakfast_cal = custom_calories
        elif meal_type == "lunch":
            lunch_name = custom_name
            lunch_cal = custom_calories
        elif meal_type == "snack":
            snack_name = custom_name
            snack_cal = custom_calories
        elif meal_type == "dinner":
            dinner_name = custom_name
            dinner_cal = custom_calories

        daily_cal = latest_plan.total_calories
        
        base_pool = df.copy()
        pref = str(diet_pref).lower().strip()
        if pref == "vegetarian":
            base_pool = base_pool[base_pool["food_type"] == "vegetarian"]
            
        clean_exclusions = []
        if exclusions:
            if isinstance(exclusions, str):
                clean_exclusions = [x.strip().lower() for x in exclusions.split(',')]
            elif isinstance(exclusions, list):
                for item in exclusions:
                    clean_exclusions.extend([x.strip().lower() for x in str(item).split(',')])
            clean_exclusions = [x for x in clean_exclusions if x]
            for item in clean_exclusions:
                base_pool = base_pool[~base_pool["food_name"].str.contains(item, case=False, na=False)]
                
        fruit_options = [
            {"name": "Apple", "cal": 95, "unit": "medium apple"},
            {"name": "Banana", "cal": 105, "unit": "medium banana"},
            {"name": "Orange", "cal": 62, "unit": "medium orange"},
            {"name": "Guava", "cal": 38, "unit": "slice of guava"},
            {"name": "Pear", "cal": 101, "unit": "medium pear"},
            {"name": "Kiwi", "cal": 42, "unit": "kiwi"},
            {"name": "Watermelon", "cal": 86, "unit": "large slice of watermelon"},
            {"name": "Papaya", "cal": 62, "unit": "cup of papaya"},
            {"name": "Grapes", "cal": 62, "unit": "cup of grapes"},
            {"name": "Plum", "cal": 30, "unit": "plum"}
        ]
        if clean_exclusions:
            fruit_options = [f for f in fruit_options if not any(ex in f["name"].lower() for ex in clean_exclusions)]

        if meal_type == "breakfast":
            remaining_cal = max(100, daily_cal - breakfast_cal)
            target_lunch = round(remaining_cal * (0.40 / 0.65))
            target_snack = round(remaining_cal * (0.15 / 0.65))
            target_dinner = round(remaining_cal * (0.10 / 0.65))
            
            lunch_pool = base_pool[base_pool["meal_type"] == "lunch"]
            if "non" in pref:
                nv_pool = lunch_pool[lunch_pool["food_type"] == "non-vegetarian"]
                if not nv_pool.empty: lunch_pool = nv_pool
            if lunch_pool.empty: lunch_pool = base_pool
            lunch_food = get_ml_recommendation(lunch_pool, target_lunch)
            lunch_qty = optimize_meal_qty(lunch_food, target_lunch)
            lunch_cal = int(lunch_qty * lunch_food['calories_kcal'])
            lunch_name = f"{lunch_food['food_name']} - {int(lunch_qty*100)}g"
            
            if fruit_options:
                day_num = int(''.join(filter(str.isdigit, day)) or 1)
                fruit = fruit_options[day_num % len(fruit_options)]
                qty_snack = max(1, round(target_snack / fruit["cal"]))
                unit_str = format_fruit_unit(qty_snack, fruit["unit"])
                snack_cal = int(qty_snack * fruit["cal"])
                snack_name = f"[{qty_snack} {unit_str}] {fruit['name']}"
            else:
                snack_pool = base_pool[base_pool["meal_type"] == "snacks"]
                if snack_pool.empty: snack_pool = base_pool
                snack_food = get_ml_recommendation(snack_pool, target_snack)
                qty_snack = optimize_meal_qty(snack_food, target_snack)
                snack_cal = int(qty_snack * snack_food['calories_kcal'])
                snack_name = f"{snack_food['food_name']} - {int(qty_snack*100)}g"
                
            dinner_pool = base_pool[base_pool["meal_type"] == "dinner"]
            if "non" in pref:
                nv_pool = dinner_pool[dinner_pool["food_type"] == "non-vegetarian"]
                if not nv_pool.empty: dinner_pool = nv_pool
            if dinner_pool.empty: dinner_pool = base_pool
            dinner_food = get_ml_recommendation(dinner_pool, target_dinner)
            dinner_qty = optimize_meal_qty(dinner_food, target_dinner)
            dinner_cal = int(dinner_qty * dinner_food['calories_kcal'])
            dinner_name = f"{dinner_food['food_name']} - {int(dinner_qty*100)}g"

        elif meal_type == "lunch":
            remaining_cal = max(100, daily_cal - breakfast_cal - lunch_cal)
            target_snack = round(remaining_cal * (0.15 / 0.25))
            target_dinner = round(remaining_cal * (0.10 / 0.25))
            
            if fruit_options:
                day_num = int(''.join(filter(str.isdigit, day)) or 1)
                fruit = fruit_options[day_num % len(fruit_options)]
                qty_snack = max(1, round(target_snack / fruit["cal"]))
                unit_str = format_fruit_unit(qty_snack, fruit["unit"])
                snack_cal = int(qty_snack * fruit["cal"])
                snack_name = f"[{qty_snack} {unit_str}] {fruit['name']}"
            else:
                snack_pool = base_pool[base_pool["meal_type"] == "snacks"]
                if snack_pool.empty: snack_pool = base_pool
                snack_food = get_ml_recommendation(snack_pool, target_snack)
                qty_snack = optimize_meal_qty(snack_food, target_snack)
                snack_cal = int(qty_snack * snack_food['calories_kcal'])
                snack_name = f"{snack_food['food_name']} - {int(qty_snack*100)}g"
                
            dinner_pool = base_pool[base_pool["meal_type"] == "dinner"]
            if "non" in pref:
                nv_pool = dinner_pool[dinner_pool["food_type"] == "non-vegetarian"]
                if not nv_pool.empty: dinner_pool = nv_pool
            if dinner_pool.empty: dinner_pool = base_pool
            dinner_food = get_ml_recommendation(dinner_pool, target_dinner)
            dinner_qty = optimize_meal_qty(dinner_food, target_dinner)
            dinner_cal = int(dinner_qty * dinner_food['calories_kcal'])
            dinner_name = f"{dinner_food['food_name']} - {int(dinner_qty*100)}g"

        elif meal_type == "snack":
            remaining_cal = max(100, daily_cal - breakfast_cal - lunch_cal - snack_cal)
            target_dinner = remaining_cal
            
            dinner_pool = base_pool[base_pool["meal_type"] == "dinner"]
            if "non" in pref:
                nv_pool = dinner_pool[dinner_pool["food_type"] == "non-vegetarian"]
                if not nv_pool.empty: dinner_pool = nv_pool
            if dinner_pool.empty: dinner_pool = base_pool
            dinner_food = get_ml_recommendation(dinner_pool, target_dinner)
            dinner_qty = optimize_meal_qty(dinner_food, target_dinner)
            dinner_cal = int(dinner_qty * dinner_food['calories_kcal'])
            dinner_name = f"{dinner_food['food_name']} - {int(dinner_qty*100)}g"

        elif meal_type == "dinner":
            pass

        total_day_cal = breakfast_cal + lunch_cal + snack_cal + dinner_cal
        
        day_lines = [
            f"DAY_MARKER_{day.split()[-1]}",
            f"[BREAKFAST]: {breakfast_name} ({breakfast_cal} kcal) [END_MEAL]",
            f"[LUNCH]: {lunch_name} ({lunch_cal} kcal) [END_MEAL]",
            f"[SNACK]: {snack_name} ({snack_cal} kcal) [END_MEAL]" if "kcal" not in snack_name else f"[SNACK]: {snack_name} [END_MEAL]",
            f"[DINNER]: {dinner_name} ({dinner_cal} kcal) [END_MEAL]",
            f"[CALORIE_COUNT]: {total_day_cal}"
        ]
        
        formatted_day_lines = []
        for line in day_lines:
            if line.startswith("[SNACK]:"):
                content = line.replace("[SNACK]:", "").replace("[END_MEAL]", "").strip()
                if "kcal" not in content:
                    content = f"{content} ({snack_cal} kcal)"
                formatted_day_lines.append(f"[SNACK]: {content} [END_MEAL]")
            elif line.startswith("[LUNCH]:"):
                content = line.replace("[LUNCH]:", "").replace("[END_MEAL]", "").strip()
                if "kcal" not in content:
                    content = f"{content} ({lunch_cal} kcal)"
                formatted_day_lines.append(f"[LUNCH]: {content} [END_MEAL]")
            elif line.startswith("[DINNER]:"):
                content = line.replace("[DINNER]:", "").replace("[END_MEAL]", "").strip()
                if "kcal" not in content:
                    content = f"{content} ({dinner_cal} kcal)"
                formatted_day_lines.append(f"[DINNER]: {content} [END_MEAL]")
            else:
                formatted_day_lines.append(line)
        
        if is_nested:
            plan_data["weekly_plan"][day] = "\n".join(formatted_day_lines)
        else:
            plan_data[day] = "\n".join(formatted_day_lines)
            
        from sqlalchemy.orm.attributes import flag_modified
        latest_plan.plan_data = plan_data
        flag_modified(latest_plan, "plan_data")
        db.session.commit()
        
        def format_label(name, cal):
            if "kcal" in name: return name
            return f"{name} ({cal} kcal)"
            
        return jsonify({
            "success": True,
            "weekly_plan": plan_data["weekly_plan"] if is_nested else plan_data,
            "day": day,
            "updated_meals": {
                "Breakfast": format_label(breakfast_name, breakfast_cal),
                "Lunch": format_label(lunch_name, lunch_cal),
                "Snack": format_label(snack_name, snack_cal),
                "Dinner": format_label(dinner_name, dinner_cal),
                "Calories": total_day_cal
            }
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error in replan-remaining: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True, port=5000)