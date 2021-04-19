#! /usr/bin/python3

import http.server
import cgitb
import webbrowser
import sys 

 
cgitb.enable() # Error reporting
 
PORT = 8000
server_address = ("", PORT)

server = http.server.HTTPServer
handler = http.server.CGIHTTPRequestHandler
handler.cgi_directories = ["/cgi-bin"]
print("Serveur actif sur le port :", PORT)

try:
      httpd = server(server_address, handler)
      httpd.serve_forever()
except Exception:
      httpd.shutdown()
