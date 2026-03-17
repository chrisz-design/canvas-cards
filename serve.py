import os, http.server, socketserver

os.chdir("/Users/chris/canvas-cards")
handler = http.server.SimpleHTTPRequestHandler
with socketserver.TCPServer(("", 3456), handler) as httpd:
    print("Serving on port 3456")
    httpd.serve_forever()
