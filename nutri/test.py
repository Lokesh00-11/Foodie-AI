from google import genai
import os

# Create the client
client = genai.Client(api_key='AIzaSyDESgLssJqzH01ySkfI3NO5Vk_H-JxbMdM')

try:
    # Testing with the most efficient free-tier model
    response = client.models.generate_content(
        model="gemini-2.5-flash", 
        contents="Say 'System Online!'"
    )
    
    print("✅ Success! API Response:")
    print(response.text)

except Exception as e:
    print("❌ API Key Test Failed.")
    print(f"Error Details: {e}")