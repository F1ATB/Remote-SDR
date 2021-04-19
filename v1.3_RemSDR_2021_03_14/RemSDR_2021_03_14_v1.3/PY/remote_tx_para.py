#!/usr/bin/python3           # This is client.py file



import asyncio
import websockets
import json
import xmlrpc.client

# create a socket object



# get local machine name
host = 'localhost'                           

port_para_Web = 8004
adr_local = "http://localhost:9004"

Sxml = xmlrpc.client.ServerProxy(adr_local)



print("Passerelle Parametres TX du client WEB")

async def consumer_handler(websocket_p, path):
    async for message_recu in websocket_p:
        F=json.loads(message_recu)
       
        if "Fr_TX" in F :
              print("Fr_TX ",F["Fr_TX"])
              Sxml.set_Fr_TX(float(F["Fr_TX"]))              
       

        if "GRF_TX" in F :
              print("GainRF TX ",F["GRF_TX"])
              Sxml.set_GainRF_TX(float(F["GRF_TX"]))
			  
        if "GIF_TX" in F :
              print("GainIF TX ",F["GIF_TX"])
              Sxml.set_GainIF_TX(float(F["GIF_TX"]))	

        if "GBB_TX" in F :
              print("GainBB TX ",F["GBB_TX"])
              Sxml.set_GainBB_TX(float(F["GBB_TX"]))	  
			  
        if "LSB_USB" in F :
              print("LSB USB ",F["LSB_USB"])
              Sxml.set_LSB_USB(float(F["LSB_USB"]))
        await websocket_p.send("OK")			  
            
  



start_server_para = websockets.serve(consumer_handler, "", port_para_Web)

loop = asyncio.get_event_loop()

try:
    loop.run_until_complete(start_server_para)
    loop.run_forever()
except KeyboardInterrupt:
    logging.info("Process Para interrupted")
finally:
    loop.close()
    logging.info("Arret Para service.")
