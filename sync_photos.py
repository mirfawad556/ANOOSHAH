import os
import json
import time
import subprocess
from datetime import datetime
from PIL import Image, ExifTags

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HER_DIR = os.path.join(BASE_DIR, 'assets', 'gallery', 'her')
US_DIR = os.path.join(BASE_DIR, 'assets', 'gallery', 'us')
MEMORIES_FILE = os.path.join(BASE_DIR, 'memories.json')

VALID_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.heic')

def get_photo_datetime(filepath):
    """Extract photo capture datetime from EXIF or file timestamp."""
    try:
        with Image.open(filepath) as img:
            exif = img._getexif()
            if exif:
                for tag_id, value in exif.items():
                    tag = ExifTags.TAGS.get(tag_id, tag_id)
                    if tag in ('DateTimeOriginal', 'DateTime'):
                        # format: 'YYYY:MM:DD HH:MM:SS'
                        dt = datetime.strptime(value, '%Y:%m:%d %H:%M:%S')
                        return dt.strftime('%Y-%m-%dT%H:%M')
    except Exception:
        pass
    
    # Fallback to file modification time
    mtime = os.path.getmtime(filepath)
    dt = datetime.fromtimestamp(mtime)
    return dt.strftime('%Y-%m-%dT%H:%M')

def scan_and_sync():
    os.makedirs(HER_DIR, exist_ok=True)
    os.makedirs(US_DIR, exist_ok=True)

    # Load existing memories
    existing_memories = []
    if os.path.exists(MEMORIES_FILE):
        try:
            with open(MEMORIES_FILE, 'r', encoding='utf-8') as f:
                existing_memories = json.load(f)
        except Exception:
            existing_memories = []

    # Map existing by relative path
    existing_map = {m.get('image'): m for m in existing_memories if m.get('image')}

    # Always keep starter if present
    if not existing_memories:
        existing_memories.append({
            "id": "starter-1",
            "image": "assets/avatar.png",
            "category": "her",
            "datetime": "2007-08-17T00:00",
            "caption": "The day the universe became brighter — Happy Birthday Anooshah! 💖",
            "createdAt": int(time.time() * 1000)
        })

    categories = [('her', HER_DIR), ('us', US_DIR)]
    new_count = 0

    for category, folder in categories:
        if not os.path.exists(folder):
            continue
        for filename in sorted(os.listdir(folder)):
            if filename.lower().endswith(VALID_EXTENSIONS):
                rel_path = f"assets/gallery/{category}/{filename}"
                filepath = os.path.join(folder, filename)

                if rel_path not in existing_map:
                    dt_str = get_photo_datetime(filepath)
                    caption_title = os.path.splitext(filename)[0].replace('_', ' ').replace('-', ' ').title()
                    if caption_title.isdigit() or len(caption_title) <= 2:
                        caption_title = f"{category.upper()} Moment 💕"

                    new_entry = {
                        "id": f"{category}-{int(time.time() * 1000)}-{new_count}",
                        "image": rel_path,
                        "category": category,
                        "datetime": dt_str,
                        "caption": caption_title,
                        "createdAt": int(os.path.getmtime(filepath) * 1000)
                    }
                    existing_memories.append(new_entry)
                    existing_map[rel_path] = new_entry
                    new_count += 1

    # Save updated memories.json
    with open(MEMORIES_FILE, 'w', encoding='utf-8') as f:
        json.dump(existing_memories, f, indent=2, ensure_ascii=False)

    print(f"✅ Sync complete! Total memories: {len(existing_memories)} (Added {new_count} new)")

    # Git push
    try:
        subprocess.run(["git", "add", "."], check=True)
        status = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True)
        if status.stdout.strip():
            subprocess.run(["git", "commit", "-m", f"Sync gallery: added {new_count} photos to memories"], check=True)
            print("🚀 Pushing to GitHub...")
            subprocess.run(["git", "push", "origin", "main"], check=True)
            print("🎉 Successfully pushed to GitHub! Anooshah can see the new photos on her phone now!")
        else:
            print("No new changes to commit.")
    except Exception as e:
        print("Git push notice:", e)

if __name__ == '__main__':
    scan_and_sync()
