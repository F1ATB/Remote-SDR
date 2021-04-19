#!/bin/bash 

exec 2> /tmp/Start_servers.log
exec 1>&2
set -x
			
cd /home/sdr/Desktop/RemSDR
 
python3 server.py&
cd PY
python3 remote_rx_audio.py&
python3 remote_rx_spectre.py&
python3 remote_rx_para.py&
python3 remote_tx_audio.py&
python3 remote_tx_para.py&
# Autorisation sudo pour nobody lanceur de l'application GNU RADIO doossier cgi-bin
cp /home/sdr/Desktop/RemSDR/cgi-bin/python_web /etc/sudoers.d&










