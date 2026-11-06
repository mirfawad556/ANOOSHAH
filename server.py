import os
import json
import base64
import time
import subprocess
from http.server import SimpleHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse

PORT = 8000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HER_DIR = os.path.join(BASE_DIR, 'assets', 'gallery', 'her')
US_DIR = os.path.join(BASE_DIR, 'assets', 'gallery', 'us')
MEMORIES_FILE = os.path.join(BASE_DIR, 'memories.json')

os.makedirs(HER_DIR, exist_ok=True)
os.makedirs(US_DIR, exist_ok=True)

class VaultServerHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS so any fetch requests work smoothly
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)

        if parsed.path == '/api/upload':
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                post_data = self.rfile.read(content_len)
                data = json.loads(post_data.decode('utf-8'))

                # data: { image: base64, category: 'her'|'us', datetime: '...', caption: '...' }
                category = data.get('category', 'her')
                datetime_str = data.get('datetime', time.strftime('%Y-%m-%dT%H:%M'))
                caption = data.get('caption', 'Cherished memory 💕')
                raw_image = data.get('image', '')

                # Parse base64
                ext = 'png'
                if ',' in raw_image:
                    header, base64_data = raw_image.split(',', 1)
                    if 'jpeg' in header or 'jpg' in header:
                        ext = 'jpg'
                    elif 'webp' in header:
                        ext = 'webp'
                    elif 'gif' in header:
                        ext = 'gif'
                else:
                    base64_data = raw_image

                image_bytes = base64.b64decode(base64_data)
                filename = f"photo_{int(time.time() * 1000)}.{ext}"
                target_folder = HER_DIR if category == 'her' else US_DIR
                target_path = os.path.join(target_folder, filename)

                with open(target_path, 'wb') as f:
                    f.write(image_bytes)

                rel_path = f"assets/gallery/{category}/{filename}"

                # Update memories.json
                memories = []
                if os.path.exists(MEMORIES_FILE):
                    try:
                        with open(MEMORIES_FILE, 'r', encoding='utf-8') as f:
                            memories = json.load(f)
                    except Exception:
                        memories = []

                new_entry = {
                    "id": f"{category}-{int(time.time() * 1000)}",
                    "image": rel_path,
                    "category": category,
                    "datetime": datetime_str,
                    "caption": caption,
                    "createdAt": int(time.time() * 1000)
                }
                memories.append(new_entry)

                with open(MEMORIES_FILE, 'w', encoding='utf-8') as f:
                    json.dump(memories, f, indent=2, ensure_ascii=False)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': True, 'entry': new_entry}).encode('utf-8'))

                # Background Git sync
                try:
                    subprocess.Popen(["python", "sync_photos.py"], cwd=BASE_DIR)
                except Exception:
                    pass
                return

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
                return

        super().do_POST()

def run_server():
    os.chdir(BASE_DIR)
    httpd = HTTPServer(('0.0.0.0', PORT), VaultServerHandler)
    print(f"Server running at http://localhost:{PORT}")
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()
