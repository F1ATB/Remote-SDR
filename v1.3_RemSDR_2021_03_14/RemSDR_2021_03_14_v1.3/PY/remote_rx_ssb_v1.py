#!/usr/bin/env python2
# -*- coding: utf-8 -*-
##################################################
# GNU Radio Python Flow Graph
# Title: SSB Receiver V1 - F1ATB - MAY 2020
# Author: F1ATB - BUHART
# Description: RX SSB
# Generated: Sun Jun 21 11:16:22 2020
##################################################


from gnuradio import analog
from gnuradio import blocks
from gnuradio import eng_notation
from gnuradio import filter
from gnuradio import gr
from gnuradio.eng_option import eng_option
from gnuradio.fft import logpwrfft
from gnuradio.filter import firdes
from optparse import OptionParser
import SimpleXMLRPCServer
import osmosdr
import threading
import time


class remote_rx_ssb_v1(gr.top_block):

    def __init__(self):
        gr.top_block.__init__(self, "SSB Receiver V1 - F1ATB - MAY 2020")

        ##################################################
        # Variables
        ##################################################
        self.samp_rate = samp_rate = 2400e3
        self.Largeur_filtre = Largeur_filtre = 3800
        self.xlate_filter_taps = xlate_filter_taps = firdes.low_pass(1, samp_rate, Largeur_filtre/2, 500)
        self.decim_LP = decim_LP = 16
        self.LSB_USB = LSB_USB = 0
        self.Gain_RF = Gain_RF = 0
        self.Gain_IF = Gain_IF = 20
        self.Gain_BB = Gain_BB = 20
        self.F_Hack = F_Hack = 7000000
        self.F_Fine = F_Fine = 0

        ##################################################
        # Blocks
        ##################################################
        self.xmlrpc_server_0 = SimpleXMLRPCServer.SimpleXMLRPCServer(('localhost', 9003), allow_none=True)
        self.xmlrpc_server_0.register_instance(self)
        self.xmlrpc_server_0_thread = threading.Thread(target=self.xmlrpc_server_0.serve_forever)
        self.xmlrpc_server_0_thread.daemon = True
        self.xmlrpc_server_0_thread.start()
        self.osmosdr_source_0 = osmosdr.source( args="numchan=" + str(1) + " " + '' )
        self.osmosdr_source_0.set_sample_rate(samp_rate)
        self.osmosdr_source_0.set_center_freq(F_Hack, 0)
        self.osmosdr_source_0.set_freq_corr(0, 0)
        self.osmosdr_source_0.set_dc_offset_mode(2, 0)
        self.osmosdr_source_0.set_iq_balance_mode(0, 0)
        self.osmosdr_source_0.set_gain_mode(False, 0)
        self.osmosdr_source_0.set_gain(Gain_RF, 0)
        self.osmosdr_source_0.set_if_gain(Gain_IF, 0)
        self.osmosdr_source_0.set_bb_gain(Gain_BB, 0)
        self.osmosdr_source_0.set_antenna('', 0)
        self.osmosdr_source_0.set_bandwidth(0, 0)

        self.low_pass_filter_0 = filter.fir_filter_ccf(1, firdes.low_pass(
        	1, decim_LP*samp_rate/200, 5200, 1200, firdes.WIN_HAMMING, 6.76))
        self.logpwrfft_x_0 = logpwrfft.logpwrfft_c(
        	sample_rate=samp_rate/200,
        	fft_size=1024,
        	ref_scale=0.00001,
        	frame_rate=samp_rate/200/1024,
        	avg_alpha=1.0,
        	average=False,
        )
        self.freq_xlating_fir_filter_xxx_0 = filter.freq_xlating_fir_filter_ccc(240, (xlate_filter_taps), F_Fine-Largeur_filtre/2+LSB_USB*Largeur_filtre-100+LSB_USB*200, samp_rate)
        self.fractional_resampler_xx_0 = filter.fractional_resampler_cc(0, decim_LP)
        self.dc_blocker_xx_0 = filter.dc_blocker_cc(1024, True)
        self.blocks_udp_sink_1 = blocks.udp_sink(gr.sizeof_short*1024, '127.0.0.1', 9002, 2048, True)
        self.blocks_udp_sink_0 = blocks.udp_sink(gr.sizeof_short*1, '127.0.0.1', 9001, 1000, True)
        self.blocks_multiply_xx_0_0 = blocks.multiply_vff(1)
        self.blocks_multiply_xx_0 = blocks.multiply_vff(1)
        self.blocks_multiply_const_vxx_0 = blocks.multiply_const_vff((1-2*LSB_USB, ))
        self.blocks_keep_m_in_n_0 = blocks.keep_m_in_n(gr.sizeof_gr_complex, int(1024*decim_LP), 204800, 0)
        self.blocks_float_to_short_1 = blocks.float_to_short(1024, 100)
        self.blocks_float_to_short_0 = blocks.float_to_short(1, 16000)
        self.blocks_complex_to_float_0 = blocks.complex_to_float(1)
        self.blocks_add_xx_0 = blocks.add_vff(1)
        self.analog_sig_source_x_0_0 = analog.sig_source_f(samp_rate/240, analog.GR_SIN_WAVE, Largeur_filtre/2+100, 1, 0)
        self.analog_sig_source_x_0 = analog.sig_source_f(samp_rate/240, analog.GR_COS_WAVE, Largeur_filtre/2+100, 1, 0)
        self.analog_agc2_xx_0 = analog.agc2_cc(1e-1, 1e-2, 1.0, 1.0)
        self.analog_agc2_xx_0.set_max_gain(100)



        ##################################################
        # Connections
        ##################################################
        self.connect((self.analog_agc2_xx_0, 0), (self.blocks_complex_to_float_0, 0))
        self.connect((self.analog_sig_source_x_0, 0), (self.blocks_multiply_xx_0, 0))
        self.connect((self.analog_sig_source_x_0_0, 0), (self.blocks_multiply_xx_0_0, 1))
        self.connect((self.blocks_add_xx_0, 0), (self.blocks_float_to_short_0, 0))
        self.connect((self.blocks_complex_to_float_0, 0), (self.blocks_multiply_const_vxx_0, 0))
        self.connect((self.blocks_complex_to_float_0, 1), (self.blocks_multiply_xx_0_0, 0))
        self.connect((self.blocks_float_to_short_0, 0), (self.blocks_udp_sink_0, 0))
        self.connect((self.blocks_float_to_short_1, 0), (self.blocks_udp_sink_1, 0))
        self.connect((self.blocks_keep_m_in_n_0, 0), (self.low_pass_filter_0, 0))
        self.connect((self.blocks_multiply_const_vxx_0, 0), (self.blocks_multiply_xx_0, 1))
        self.connect((self.blocks_multiply_xx_0, 0), (self.blocks_add_xx_0, 0))
        self.connect((self.blocks_multiply_xx_0_0, 0), (self.blocks_add_xx_0, 1))
        self.connect((self.dc_blocker_xx_0, 0), (self.blocks_keep_m_in_n_0, 0))
        self.connect((self.dc_blocker_xx_0, 0), (self.freq_xlating_fir_filter_xxx_0, 0))
        self.connect((self.fractional_resampler_xx_0, 0), (self.logpwrfft_x_0, 0))
        self.connect((self.freq_xlating_fir_filter_xxx_0, 0), (self.analog_agc2_xx_0, 0))
        self.connect((self.logpwrfft_x_0, 0), (self.blocks_float_to_short_1, 0))
        self.connect((self.low_pass_filter_0, 0), (self.fractional_resampler_xx_0, 0))
        self.connect((self.osmosdr_source_0, 0), (self.dc_blocker_xx_0, 0))

    def get_samp_rate(self):
        return self.samp_rate

    def set_samp_rate(self, samp_rate):
        self.samp_rate = samp_rate
        self.set_xlate_filter_taps(firdes.low_pass(1, self.samp_rate, self.Largeur_filtre/2, 500))
        self.osmosdr_source_0.set_sample_rate(self.samp_rate)
        self.low_pass_filter_0.set_taps(firdes.low_pass(1, self.decim_LP*self.samp_rate/200, 5200, 1200, firdes.WIN_HAMMING, 6.76))
        self.logpwrfft_x_0.set_sample_rate(self.samp_rate/200)
        self.analog_sig_source_x_0_0.set_sampling_freq(self.samp_rate/240)
        self.analog_sig_source_x_0.set_sampling_freq(self.samp_rate/240)

    def get_Largeur_filtre(self):
        return self.Largeur_filtre

    def set_Largeur_filtre(self, Largeur_filtre):
        self.Largeur_filtre = Largeur_filtre
        self.set_xlate_filter_taps(firdes.low_pass(1, self.samp_rate, self.Largeur_filtre/2, 500))
        self.freq_xlating_fir_filter_xxx_0.set_center_freq(self.F_Fine-self.Largeur_filtre/2+self.LSB_USB*self.Largeur_filtre-100+self.LSB_USB*200)
        self.analog_sig_source_x_0_0.set_frequency(self.Largeur_filtre/2+100)
        self.analog_sig_source_x_0.set_frequency(self.Largeur_filtre/2+100)

    def get_xlate_filter_taps(self):
        return self.xlate_filter_taps

    def set_xlate_filter_taps(self, xlate_filter_taps):
        self.xlate_filter_taps = xlate_filter_taps
        self.freq_xlating_fir_filter_xxx_0.set_taps((self.xlate_filter_taps))

    def get_decim_LP(self):
        return self.decim_LP

    def set_decim_LP(self, decim_LP):
        self.decim_LP = decim_LP
        self.low_pass_filter_0.set_taps(firdes.low_pass(1, self.decim_LP*self.samp_rate/200, 5200, 1200, firdes.WIN_HAMMING, 6.76))
        self.fractional_resampler_xx_0.set_resamp_ratio(self.decim_LP)
        self.blocks_keep_m_in_n_0.set_m(int(1024*self.decim_LP))

    def get_LSB_USB(self):
        return self.LSB_USB

    def set_LSB_USB(self, LSB_USB):
        self.LSB_USB = LSB_USB
        self.freq_xlating_fir_filter_xxx_0.set_center_freq(self.F_Fine-self.Largeur_filtre/2+self.LSB_USB*self.Largeur_filtre-100+self.LSB_USB*200)
        self.blocks_multiply_const_vxx_0.set_k((1-2*self.LSB_USB, ))

    def get_Gain_RF(self):
        return self.Gain_RF

    def set_Gain_RF(self, Gain_RF):
        self.Gain_RF = Gain_RF
        self.osmosdr_source_0.set_gain(self.Gain_RF, 0)

    def get_Gain_IF(self):
        return self.Gain_IF

    def set_Gain_IF(self, Gain_IF):
        self.Gain_IF = Gain_IF
        self.osmosdr_source_0.set_if_gain(self.Gain_IF, 0)

    def get_Gain_BB(self):
        return self.Gain_BB

    def set_Gain_BB(self, Gain_BB):
        self.Gain_BB = Gain_BB
        self.osmosdr_source_0.set_bb_gain(self.Gain_BB, 0)

    def get_F_Hack(self):
        return self.F_Hack

    def set_F_Hack(self, F_Hack):
        self.F_Hack = F_Hack
        self.osmosdr_source_0.set_center_freq(self.F_Hack, 0)

    def get_F_Fine(self):
        return self.F_Fine

    def set_F_Fine(self, F_Fine):
        self.F_Fine = F_Fine
        self.freq_xlating_fir_filter_xxx_0.set_center_freq(self.F_Fine-self.Largeur_filtre/2+self.LSB_USB*self.Largeur_filtre-100+self.LSB_USB*200)


def main(top_block_cls=remote_rx_ssb_v1, options=None):

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
