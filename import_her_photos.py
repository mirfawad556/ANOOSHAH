import os
import re
import shutil
import json
import time
from datetime import datetime
from PIL import Image, ExifTags

SRC_DIR = r"c:\Users\hp\OneDrive\Pictures\Screenshots\her"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEST_DIR = os.path.join(BASE_DIR, "assets", "gallery", "her")
MEMORIES_FILE = os.path.join(BASE_DIR, "memories.json")

os.makedirs(DEST_DIR, exist_ok=True)

CAPTIONS = [
    "Her Radiant Smile ✨",
    "Looking Breathtaking 💖",
    "Pure Magic 💕",
    "The Queen of My Heart 👑",
    "Unforgettable Beauty 🌸",
    "Starlight in Her Eyes 💫",
    "Every Angle, Perfection 🌹",
    "My Favorite View in the World 💖",
    "Grace and Elegance ✨",
    "Endless Sunshine ☀️",
    "Her Laugh Lights Up the Room 🌟",
    "Captivating and Sweet 💖",
    "A Sight for Sore Eyes 🌷",
    "The Loveliest Soul 💫",
    "Forever Cherished 💕"
]

def extract_datetime(filename, filepath):
    # 1. Try filename regex: IMG_20250102_235030
    match = re.search(r'(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})', filename)
    if match:
        y, m, d, H, M, S = match.groups()
        try:
            dt = datetime(int(y), int(m), int(d), int(H), int(M), int(S))
            return dt.strftime('%Y-%m-%dT%H:%M')
        except Exception:
            pass

    # 2. Try EXIF
    try:
        with Image.open(filepath) as img:
            exif = img._getexif()
            if exif:
                for tag_id, value in exif.items():
                    tag = ExifTags.TAGS.get(tag_id, tag_id)
                    if tag in ('DateTimeOriginal', 'DateTime'):
                        dt = datetime.strptime(str(value), '%Y:%m:%d %H:%M:%S')
                        return dt.strftime('%Y-%m-%dT%H:%M')
    except Exception:
        pass

    # 3. Fallback to file modified time
    mtime = os.path.getmtime(filepath)
    dt = datetime.fromtimestamp(mtime)
    return dt.strftime('%Y-%m-%dT%H:%M')

def main():
    files = sorted([f for f in os.listdir(SRC_DIR) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.bmp'))])
    print(f"Copying {len(files)} photos from {SRC_DIR}...")

    # Load existing memories
    existing = []
    if os.path.exists(MEMORIES_FILE):
        try:
            with open(MEMORIES_FILE, 'r', encoding='utf-8') as f:
                existing = json.load(f)
        except Exception:
            existing = []

    # Map existing images
    existing_paths = {m.get('image') for m in existing if m.get('image')}

    new_entries = []
    for idx, fname in enumerate(files):
        src_path = os.path.join(SRC_DIR, fname)
        
        # Clean destination filename to avoid spaces/brackets issues
        safe_name = re.sub(r'[^a-zA-Z0-9._-]', '_', fname)
        dest_path = os.path.join(DEST_DIR, safe_name)

        if not os.path.exists(dest_path):
            shutil.copy2(src_path, dest_path)

        rel_path = f"assets/gallery/her/{safe_name}"

        if rel_path not in existing_paths:
            dt_str = extract_datetime(fname, src_path)
            caption = CAPTIONS[idx % len(CAPTIONS)]

            entry = {
                "id": f"her-{int(time.time())}-{idx}",
                "image": rel_path,
                "category": "her",
                "datetime": dt_str,
                "caption": caption,
                "createdAt": int(os.path.getmtime(src_path) * 1000)
            }
            new_entries.append(entry)
            existing_paths.add(rel_path)

    all_memories = existing + new_entries

    # Sort descending by datetime (newest first)
    all_memories.sort(key=lambda x: x.get('datetime', ''), reverse=True)

    with open(MEMORIES_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_memories, f, indent=2, ensure_ascii=False)

    print(f"Successfully added {len(new_entries)} photos of Anooshah to memories.json!")
    print(f"Total memories in vault: {len(all_memories)}")

if __name__ == '__main__':
    main()
