import http.server
import socketserver
import os
import sys
import threading

os.chdir(r'C:\match3-game-master')
PORT = 8080
HOST = '0.0.0.0'

Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer((HOST, PORT), Handler) as httpd:
    httpd.allow_reuse_address = True
    httpd.serve_forever()
