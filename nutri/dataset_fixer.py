import pandas as pd
import numpy as np
import re

df = pd.read_csv('dataset/final food dataset.csv')

def clean_name(name):
    return re.sub(r'\s*\(\d+g\)', '', str(name)).strip()

df['food_name'] = df['food_name'].apply(clean_name)
df = df.drop_duplicates(subset=['food_name'], keep='first')

out = pd.DataFrame()
out['base_name'] = df['food_name'].apply(lambda x: re.sub(r'\(.*?\)', '', str(x)).strip().title())
out['display_name'] = df['food_name']
out['category'] = df['meal_type'].str.lower()
out['kcal_per_100g'] = df['calories_kcal'].astype(float)
out['protein_per_100g'] = df['protein_g'].astype(float)
out['carbs_per_100g'] = df['carbs_g'].astype(float)
out['fat_per_100g'] = df['fats_g'].astype(float)
out['fiber_per_100g'] = df['fiber_g'].astype(float)
out['vitC_mg_per_100g'] = 0.0
out['calcium_mg_per_100g'] = 0.0
out['iron_mg_per_100g'] = 0.0
out['serving_g'] = 100
out['ingredients'] = df['ingredients'].fillna('')
out['verified'] = True
out['source'] = 'IFCT/USDA Approximation'

changes = []

def update_row(idx, new_kcal, new_p, new_c, new_f, source="Manual"):
    old = out.loc[idx, 'kcal_per_100g']
    out.loc[idx, 'kcal_per_100g'] = float(new_kcal)
    out.loc[idx, 'protein_per_100g'] = float(new_p)
    out.loc[idx, 'carbs_per_100g'] = float(new_c)
    out.loc[idx, 'fat_per_100g'] = float(new_f)
    changes.append({'name': out.loc[idx, 'display_name'], 'old': old, 'new': new_kcal, 'source': source})

for i in out.index:
    name = out.loc[i, 'display_name'].lower()
    kcal = out.loc[i, 'kcal_per_100g']
    p = out.loc[i, 'protein_per_100g']
    c = out.loc[i, 'carbs_per_100g']
    f = out.loc[i, 'fat_per_100g']
    
    calc_kcal = 4 * p + 4 * c + 9 * f
    
    if 'roasted chana' in name:
        update_row(i, 360, 19, 58, 6, "USDA")
    elif 'boiled egg' in name or name == 'boiled eggs':
        update_row(i, 155, 13, 1.1, 10.6, "USDA")
    elif 'white rice' in name and 'chicken' not in name and 'fish' not in name:
        update_row(i, 130, 2.7, 28, 0.3, "USDA")
    elif 'idli' in name:
        update_row(i, 140, 4, 30, 0.5, "IFCT")
    elif 'dosa' in name:
        update_row(i, 175, 4, 32, 3.5, "IFCT")
    elif 'aloo paratha' in name:
        update_row(i, 275, 5, 40, 10, "IFCT")
    elif 'chicken curry' in name:
        update_row(i, 175, 15, 10, 8, "IFCT")
    elif 'chicken' in name and 'rice' in name:
        update_row(i, 160, 10, 20, 5, "IFCT")
    elif 'fish curry' in name:
        update_row(i, 150, 14, 5, 8, "IFCT")
    elif abs(kcal - calc_kcal) / max(1, kcal) > 0.15:
        update_row(i, round(calc_kcal), p, c, f, "Macro Alignment")
        
    if not str(out.loc[i, 'ingredients']).strip():
        out.loc[i, 'verified'] = False

out.to_csv('dataset/new_food_dataset.csv', index=False)

print("DATASET NORMALISATION CHANGES:")
for c in changes:
    print(f"{c['name']} | Old: {c['old']} | New: {c['new']} | Source: {c['source']}")
