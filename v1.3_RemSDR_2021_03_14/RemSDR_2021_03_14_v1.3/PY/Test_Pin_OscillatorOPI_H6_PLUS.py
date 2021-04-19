#!/usr/bin/ python3           address Python 3 environment
# -*- coding: utf-8 -*-



import os                       # To execute system command
from time import sleep          # this lets us have a time delay

numgpio=227                     # OK for Orange Pi One Plus H6

numgpio=str(numgpio)
print ("numgpio:"+numgpio)


os.system("sudo echo "+numgpio+" > /sys/class/gpio/export")
 					

os.system("sudo echo out > /sys/class/gpio/gpio"+numgpio+"/direction")       

try:
    print ("Square signal around 50Hz . Press CTRL+C to exit")
    while True:
        os.system("echo 0 > /sys/class/gpio/gpio"+numgpio+"/value")
        sleep(0.01)
        os.system("echo 1 > /sys/class/gpio/gpio"+numgpio+"/value")
        sleep(0.01)

        

except KeyboardInterrupt:
    os.system("echo 0 > /sys/class/gpio/gpio"+numgpio+"/value")   # set port/pin value to 0/LOW/False
    os.system("sudo echo "+numgpio+" > /sys/class/gpio/unexport") # Clean GPIO
    print ("Bye from F1ATB.")
