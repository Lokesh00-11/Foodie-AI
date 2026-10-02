import re
import hashlib
import json

with open('app.py', 'r') as f:
    app_code = f.read()

# We need to replace `generate_weekly_plan`
# We also need to rewrite `/api/replan-remaining`
# And we need to change how `weekly_plan` is saved in `/api/nutrition`
# Actually, the easiest way is to rewrite app.py to import a new planner module and use it.

new_code = app_code.replace("pd.read_csv('dataset/final food dataset.csv')", "pd.read_csv('dataset/new_food_dataset.csv')")

# Remove the old generate_weekly_plan and replan functions entirely.
# Let's just create a new app.py

print("Done")
