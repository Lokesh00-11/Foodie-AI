from app import app, db
from sqlalchemy import text

def add_phone_column():
    with app.app_context():
        try:
            db.session.execute(text('ALTER TABLE "user" ADD COLUMN phone VARCHAR(20);'))
            db.session.commit()
            print("Column 'phone' added successfully.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == '__main__':
    add_phone_column()
