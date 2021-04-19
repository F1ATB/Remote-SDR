#!/usr/bin/python3           # This is client.py file


import socket
import asyncio
import websockets
import os                       # To execute system command

# create a socket object
s_audio = socket.socket(socket.AF_INET, socket.SOCK_DGRAM) 


# get local machine name
host = '127.0.0.1'                           

port_audio_Web = 8005
port_audio_GR = 9005

numgpio=227								 # GPIO 227 corresponds to pin 26 in Orange PI One PLUS H6
numgpio=str(numgpio)                         

# Préparation port commande relais
os.system("sudo echo "+numgpio+" > /sys/class/gpio/export")              #activation
os.system("sudo echo out > /sys/class/gpio/gpio"+numgpio+"/direction")   # Output
                                      


# connection to hostname on the port.

                             
print ("Passerelle audio client Web vers TX")


# Receive   bytes audio
async def audio(websocket_a, path):
    etat=True
    while True:
# on recupere les data du micro du client

        donnee_audio = await websocket_a.recv()
   
        s_audio.sendto(donnee_audio,(host,port_audio_GR))

        # Oscillateur pour activer le relais alimentation via un condensateur et un redressement
		# Oscillator on pin 26 as watchdog
        etat=not etat     #inversion à chaque trame recue
        
        if etat:
             os.system("echo 1 > /sys/class/gpio/gpio"+numgpio+"/value")
        else:
             os.system("echo 0 > /sys/class/gpio/gpio"+numgpio+"/value")
        


start_server_audio = websockets.serve(audio, "", port_audio_Web)

asyncio.get_event_loop().run_until_complete(start_server_audio)

asyncio.get_event_loop().run_forever()
