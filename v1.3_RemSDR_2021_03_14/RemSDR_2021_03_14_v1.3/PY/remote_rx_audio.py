#!/usr/bin/python3           # This is client.py file


#Collect of Audio data from GNU Radio and send to web client
#Recuperation des données audio  de GNU_Radio et envoi vers le client web
import socket
import asyncio
import websockets

# create a socket object
s_audio = socket.socket(socket.AF_INET, socket.SOCK_DGRAM) 


# get local machine name
host = 'localhost'                           

port_audio_Web = 8001
port_audio_GR = 9001


# connection to hostname on the port.
s_audio.bind((host, port_audio_GR))
                             
print ("Passerelle audio Web")


# Receive no more than 1024 bytes audio
async def audio(websocket_a, path):
    while True:
# on recupere les data de GNU-RADIO
        msg_audio = s_audio.recv(1024)
#       print ("audio",len(msg_audio))
# on envoi le message vers le client web distant
        await websocket_a.send(msg_audio)
		

		
		

		

start_server_audio = websockets.serve(audio, "", port_audio_Web)


asyncio.get_event_loop().run_until_complete(start_server_audio)


asyncio.get_event_loop().run_forever()