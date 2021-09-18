# Remote-SDR
Remote-SDR remotely controls a SDR receiver and a SDR transmitter from a web browser. Pre-configured for the QO-100 Es'Hail 2 satellite transponder. Can be used for any NBFM or SSB Radio from 1MHz up to 6 GHz. It can works in full duplex with Adalm-Pluto SDR, HackRF One or RTL-SDR.
Signal processing is done using gnuradio-companion and javascript. It runs on 1 or 2 Orange Pi One Plus single board computers under Armbian operating system to drive the SDRs. It runs also now on an Orange Pi Zero 2 with Debian operating system from orangepi.org. It runs since version 2.4 on Raspberry 4 using Rasperry Pi OS.

Release V2.2 implements the capability to set to 0 or 1 any GPIO according the frequency of the transmitter or receiver. You can pass from release v2.0, v2.1  to v2.2 by replacing all the files in /var/www/html. Take care of  configurationRX.js and configurationTX.js if you already customize them.

Release v2.3 improves the beacons tracking of QO-100. As upper and lower beacons now are transmitting CW with an important frequency shift and no more PSK, the tracking algorithm has been updated.

Release v2.4 introduces the radio processing with a Raspberry Pi 4B.

Release 2.5 offers the processing of 2 HackRF One (TX and RX) by the Raspberry Pi 4B.

More on https://f1atb.fr

Release v2.5i_opiz2 Image for Orange Pi Zero 2
https://github.com/F1ATB/Remote-SDR/releases/tag/v2.5i_opiz2

Release v2.5s Source code here:
https://github.com/F1ATB/Remote-SDR/releases/tag/v2.5s

Release v2.5.i_rpi4 Image for Raspberry Pi 4
https://github.com/F1ATB/Remote-SDR/releases/tag/v2.5i_rpi4

Release v2.4.i_rpi4 Image for Raspberry Pi 4
https://github.com/F1ATB/Remote-SDR/releases/tag/v2.4i_rpi4

Release v2.4s Source code here:
https://github.com/F1ATB/Remote-SDR/releases/tag/v2.4s

Release v2.3i_opiz2 Image for Orange Pi Zero 2
https://github.com/F1ATB/Remote-SDR/releases/tag/v2.3i_opiz2

Release v2.3s Source code here:
https://github.com/F1ATB/Remote-SDR/releases/tag/v2.3s

Release v2.2_s Source code here:
https://github.com/F1ATB/Remote-SDR/releases/tag/v2.2s

Release v2.1_i_opioneplus Image for Orange Pi One Plus
https://github.com/F1ATB/Remote-SDR/releases/tag/v2.1i_opioneplus

Release v2.1_i_opiz2 Image for Orange Pi Zero 2
https://github.com/F1ATB/Remote-SDR/releases/tag/v2.1i_opiz2

Release v2.1_s Source code here:
https://github.com/F1ATB/Remote-SDR/releases/tag/v2.1s

Release v2.0_i Image for Orange Pi One Plus here:
https://github.com/F1ATB/Remote-SDR/releases/tag/v2.0i

Release v2.0_s Source Code here;
https://github.com/F1ATB/Remote-SDR/releases/tag/v2.0s



