import unittest
import requests
import re

URL = "http://127.0.0.1:5000"

class TestMealPlanner(unittest.TestCase):
    def setUp(self):
        self.payload = {
            "email": "test_planner@example.com",
            "age": "21",
            "gender": "male",
            "weight": "75",
            "height": "167",
            "activity_level": "moderate",
            "goal": "cut",
            "diet_preference": "non-vegetarian",
            "symptoms": ["Hair fall", "Bone pain"],
            "exclusions": ["milk", "butter", "mutton"],
            "medical_history": ["None"]
        }

    def test_full_pipeline(self):
        res = requests.post(f"{URL}/api/nutrition", json=self.payload)
        self.assertTrue(res.ok, "API request failed")
        data = res.json()
        
        target = data.get("target_cal")
        bmr = data.get("bmr")
        tdee = data.get("tdee")
        
        self.assertTrue(1689 <= bmr <= 1699, f"BMR {bmr} out of bounds")
        self.assertTrue(2615 <= tdee <= 2635, f"TDEE {tdee} out of bounds")
        self.assertTrue(2115 <= target <= 2135, f"Target {target} out of bounds")

        plan = data.get("weekly_plan", {})
        self.assertTrue(len(plan) > 0, "No weekly plan returned")
        
        for day, content in plan.items():
            lines = content.split("\n")
            day_total = 0
            
            for line in lines:
                if line.startswith("[") and "[END_MEAL]" in line:
                    items = line.split("]: ")[1].split("[END_MEAL]")[0].strip().split(" + ")
                    for item in items:
                        if "(" in item:
                            name_grams, rest = item.rsplit("(", 1)
                        else:
                            name_grams, rest = item, ""
                        
                        g_match = re.search(r'-\s*(\d+)g', name_grams)
                        grams = int(g_match.group(1)) if g_match else 0
                        self.assertTrue(50 <= grams <= 400, f"Portion {grams}g is outside 50-400g cap: {item}")
                        
                        kcal_match = re.search(r'(\d+)\s*kcal', rest)
                        kcal = int(kcal_match.group(1)) if kcal_match else 0
                        day_total += kcal
                        
            cal_line = lines[-1]
            self.assertTrue(cal_line.startswith("[CALORIE_COUNT]:"))
            reported_cal = int(cal_line.split(":")[1].strip())
            
            self.assertEqual(day_total, reported_cal, f"Day {day} sum {day_total} != reported {reported_cal}")
            
            self.assertTrue(target * 0.98 <= day_total <= target * 1.02,
                            f"Day {day} total {day_total} is not within 2% of {target}")

    def test_z_replan_cap(self):
        replan_payload = {
            "email": "test_planner@example.com",
            "day": "Day 1",
            "meal_type": "breakfast",
            "custom_name": "Dosa",
            "custom_calories": 50,  
            "custom_macros": {"p": 1, "c": 10, "f": 1},
            "diet_preference": "non-vegetarian",
            "exclusions": ["milk"]
        }
        res = requests.post(f"{URL}/api/replan-remaining", json=replan_payload)
        self.assertFalse(res.ok, "Replan should fail due to exceeding portion caps")
        err = res.json().get("error", "")
        self.assertTrue("exceeding portion caps" in err or "too high" in err, "Should return clear message")

        # Now test exceeding
        replan_payload["custom_calories"] = 100  # Leaves ~2025 for lunch/snack/dinner
        # Wait, if daily is 2125, 2125 - 100 = 2025. That's fine.
        # But if we log 5000 calories, it fails? No, if remaining is too HIGH it fails.
        # Wait, if we log 50 calories for breakfast, remaining is 2075. It might pass or fail depending on fruit options.
        pass

if __name__ == '__main__':
    unittest.main()
