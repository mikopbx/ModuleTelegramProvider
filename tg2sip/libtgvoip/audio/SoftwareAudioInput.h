#ifndef TG2SIP_SOFTWAREAUDIOINPUT_H
#define TG2SIP_SOFTWAREAUDIOINPUT_H

#include <pjsua2.hpp>
#include "AudioInput.h"
#include "../threading.h"

namespace tgvoip {
    namespace audio {
        class SoftwareAudioInput : public AudioInput, public pj::AudioMedia {
        public:
            explicit SoftwareAudioInput();

            virtual ~SoftwareAudioInput();

            void Start() override;

            void Stop() override;

        private:
            static pj_status_t PutFrameCallback(pjmedia_port *port, pjmedia_frame *frame);

            static pj_status_t GetFrameCallback(pjmedia_port *port, pjmedia_frame *frame);

            bool isActive;

            pj_pool_t *pj_pool;
            pjmedia_port *media_port;

            // Accumulator for combining two 10 ms frames into one 20 ms frame
            unsigned char acc[1920]{}; // 48kHz * 20ms * 16-bit mono
            size_t acc_len{0};
        };
    }
}

#endif //TG2SIP_SOFTWAREAUDIOINPUT_H