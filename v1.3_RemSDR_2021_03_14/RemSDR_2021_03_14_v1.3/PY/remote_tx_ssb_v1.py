#!/usr/bin/env python2
# -*- coding: utf-8 -*-
##################################################
# GNU Radio Python Flow Graph
# Title: SSB Transmitter V1 - F1ATB - MAY 2020
# Author: F1ATB - BUHART
# Description: TX SSB
# Generated: Thu Jun 18 08:53:01 2020
##################################################


from gnuradio import blocks
from gnuradio import eng_notation
from gnuradio import filter
from gnuradio import gr
from gnuradio.eng_option import eng_option
from gnuradio.filter import firdes
from optparse import OptionParser
import SimpleXMLRPCServer
import osmosdr
import threading
import time


class remote_tx_ssb_v1(gr.top_block):

    def __init__(self):
        gr.top_block.__init__(self, "SSB Transmitter V1 - F1ATB - MAY 2020")

        ##################################################
        # Variables
        ##################################################
        self.samp_rate = samp_rate = 2400000
        self.LSB_USB = LSB_USB = 1
        self.GainRF_TX = GainRF_TX = 100
        self.GainIF_TX = GainIF_TX = 300
        self.GainBB_TX = GainBB_TX = 40
        self.Fr_TX = Fr_TX = 145100000

        ##################################################
        # Blocks
        ##################################################
        self.xmlrpc_server_0 = SimpleXMLRPCServer.SimpleXMLRPCServer(('localhost', 9004), allow_none=True)
        self.xmlrpc_server_0.register_instance(self)
        self.xmlrpc_server_0_thread = threading.Thread(target=self.xmlrpc_server_0.serve_forever)
        self.xmlrpc_server_0_thread.daemon = True
        self.xmlrpc_server_0_thread.start()
        self.rational_resampler_xxx_1 = filter.rational_resampler_ccc(
                interpolation=240,
                decimation=1,
                taps=None,
                fractional_bw=None,
        )
        self.osmosdr_sink_0 = osmosdr.sink( args="numchan=" + str(1) + " " + '0x00664765' )
        self.osmosdr_sink_0.set_sample_rate(samp_rate)
        self.osmosdr_sink_0.set_center_freq(Fr_TX, 0)
        self.osmosdr_sink_0.set_freq_corr(0, 0)
        self.osmosdr_sink_0.set_gain(GainRF_TX, 0)
        self.osmosdr_sink_0.set_if_gain(GainIF_TX, 0)
        self.osmosdr_sink_0.set_bb_gain(GainBB_TX, 0)
        self.osmosdr_sink_0.set_antenna('', 0)
        self.osmosdr_sink_0.set_bandwidth(0, 0)

        self.hilbert_fc_0 = filter.hilbert_fc(64, firdes.WIN_HAMMING, 6.76)
        (self.hilbert_fc_0).set_min_output_buffer(10)
        (self.hilbert_fc_0).set_max_output_buffer(10)
        self.blocks_udp_source_0 = blocks.udp_source(gr.sizeof_short*1, '127.0.0.1', 9005, 512, True)
        (self.blocks_udp_source_0).set_max_output_buffer(2048)
        self.blocks_short_to_float_0 = blocks.short_to_float(1, 32767)
        self.blocks_multiply_const_vxx_0 = blocks.multiply_const_vff((LSB_USB, ))
        self.blocks_float_to_complex_0 = blocks.float_to_complex(1)
        self.blocks_complex_to_float_0 = blocks.complex_to_float(1)
        self.band_pass_filter_0 = filter.fir_filter_ccc(1, firdes.complex_band_pass(
        	1, samp_rate/240, -1300+LSB_USB*1500, 1300+LSB_USB*1500, 200, firdes.WIN_HAMMING, 6.76))



        ##################################################
        # Connections
        ##################################################
        self.connect((self.band_pass_filter_0, 0), (self.rational_resampler_xxx_1, 0))
        self.connect((self.blocks_complex_to_float_0, 0), (self.blocks_float_to_complex_0, 0))
        self.connect((self.blocks_complex_to_float_0, 1), (self.blocks_multiply_const_vxx_0, 0))
        self.connect((self.blocks_float_to_complex_0, 0), (self.band_pass_filter_0, 0))
        self.connect((self.blocks_multiply_const_vxx_0, 0), (self.blocks_float_to_complex_0, 1))
        self.connect((self.blocks_short_to_float_0, 0), (self.hilbert_fc_0, 0))
        self.connect((self.blocks_udp_source_0, 0), (self.blocks_short_to_float_0, 0))
        self.connect((self.hilbert_fc_0, 0), (self.blocks_complex_to_float_0, 0))
        self.connect((self.rational_resampler_xxx_1, 0), (self.osmosdr_sink_0, 0))

    def get_samp_rate(self):
        return self.samp_rate

    def set_samp_rate(self, samp_rate):
        self.samp_rate = samp_rate
        self.osmosdr_sink_0.set_sample_rate(self.samp_rate)
        self.band_pass_filter_0.set_taps(firdes.complex_band_pass(1, self.samp_rate/240, -1300+self.LSB_USB*1500, 1300+self.LSB_USB*1500, 200, firdes.WIN_HAMMING, 6.76))

    def get_LSB_USB(self):
        return self.LSB_USB

    def set_LSB_USB(self, LSB_USB):
        self.LSB_USB = LSB_USB
        self.blocks_multiply_const_vxx_0.set_k((self.LSB_USB, ))
        self.band_pass_filter_0.set_taps(firdes.complex_band_pass(1, self.samp_rate/240, -1300+self.LSB_USB*1500, 1300+self.LSB_USB*1500, 200, firdes.WIN_HAMMING, 6.76))

    def get_GainRF_TX(self):
        return self.GainRF_TX

    def set_GainRF_TX(self, GainRF_TX):
        self.GainRF_TX = GainRF_TX
        self.osmosdr_sink_0.set_gain(self.GainRF_TX, 0)

    def get_GainIF_TX(self):
        return self.GainIF_TX

    def set_GainIF_TX(self, GainIF_TX):
        self.GainIF_TX = GainIF_TX
        self.osmosdr_sink_0.set_if_gain(self.GainIF_TX, 0)

    def get_GainBB_TX(self):
        return self.GainBB_TX

    def set_GainBB_TX(self, GainBB_TX):
        self.GainBB_TX = GainBB_TX
        self.osmosdr_sink_0.set_bb_gain(self.GainBB_TX, 0)

    def get_Fr_TX(self):
        return self.Fr_TX

    def set_Fr_TX(self, Fr_TX):
        self.Fr_TX = Fr_TX
        self.osmosdr_sink_0.set_center_freq(self.Fr_TX, 0)


def main(top_block_cls=remote_tx_ssb_v1, options=None):

    tb = top_block_cls()
    tb.start()
    try:
        raw_input('Press Enter to quit: ')
    except EOFError:
        pass
    tb.stop()
    tb.wait()


if __name__ == '__main__':
    main()
