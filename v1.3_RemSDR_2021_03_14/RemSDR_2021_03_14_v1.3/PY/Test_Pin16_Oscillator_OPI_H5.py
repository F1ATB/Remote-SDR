#!/usr/bin/python3           address Python 3 environment
# -*- coding: utf-8 -*-



import OPi.GPIO as GPIO
from time import sleep          # this lets us have a time delay

numgpio=23						# As defined on Rasperry Pi 40 pins Connector. OK for Orange PI PC2 H5
GPIO.setmode(GPIO.BCM)        # set up  BCM numbering
GPIO.setup(numgpio, GPIO.OUT)         # set BCM7 (pin 26) as an output (LED)

try:
    print ("Square signal 50Hz on pin 16. Press CTRL+C to exit")
    while True:
        GPIO.output(numgpio, 1)       # set port/pin value to 1/HIGH/True
        sleep(0.01)
        GPIO.output(numgpio, 0)       # set port/pin value to 0/LOW/False
        sleep(0.01)

        

except KeyboardInterrupt:
    GPIO.output(numgpio, 0)           # set port/pin value to 0/LOW/False
    GPIO.cleanup()              # Clean GPIO
    print ("Bye from F1ATB.")
