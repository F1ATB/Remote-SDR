# Remote-SDR
Remote-SDR remotely controls a SDR receiver and a SDR transmitter from a web browser. Pre-configured for the QO-100 Es'Hail 2 satellite transponder. Can be used for any NBFM or SSB Radio from 1MHz up to 6 GHz. It can works in full duplex with Adalm-Pluto SDR, HackRF One or RTL-SDR
Signal processing is done using gnuradio-companion and javascript. It runs on 1 or 2 Orange Pi One Plus micro processors under Armbian operating system to drivethe SDRs.

More on https://f1atb.fr

Release v2.0i Image for Orange Pi One Plus here:
https://github.com/F1ATB/Remote-SDR/releases/tag/v2.0i

Release v2.0s Surce Code here;
https://github.com/F1ATB/Remote-SDR/releases/tag/v2.0s

Release V1.3s Source Code here:
https://github.com/F1ATB/Remote-SDR/releases/download/v1.3s/v1.3_RemSDR_2021_03_14.zip

To update from v1.2 to v1.3, it is very simple:
- replace the file "remote_sdr.htm" at the root of the site (/home/sdr/Desktop/RemSDR). It will display 2 compression laws for the TX (Audio1 and Audio2)
- replace the file "remote_sdr.js" in the JS directory. It will update the version number displayed at the bottom left of the screen.
- replace the file "remote_TX.js" in the JS directory. It will intoduce 2 compression laws for the TX to increase the mean power trasnmitted without saturation. See around line 200.

Release V1.2s Source Code here:
https://github.com/F1ATB/Remote-SDR/releases/tag/v1.2s

Release v1.2 Image for Orange PI One Plus 
https://github.com/F1ATB/Remote-SDR/releases/tag/v1.2

