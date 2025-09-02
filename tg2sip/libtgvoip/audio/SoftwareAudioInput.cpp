#include <cassert>
#include "SoftwareAudioInput.h"

using namespace tgvoip::audio;

SoftwareAudioInput::SoftwareAudioInput() {
    isActive = false;

    pj_pool = pjsua_pool_create("input%p", 2048, 512);
    media_port = PJ_POOL_ZALLOC_T(pj_pool, pjmedia_port);

    pj_status_t status;
    pj_str_t name = pj_str((char *) "input");

    status = pjmedia_port_info_init(&media_port->info,
                                    &name,
                                    PJMEDIA_SIG_CLASS_PORT_AUD('S', 'I'), // Software Input SIG
                                    48000, 1, 16, 960);
    assert(status == PJ_SUCCESS);

    media_port->port_data.pdata = this;
    media_port->put_frame = &PutFrameCallback;
    media_port->get_frame = &GetFrameCallback;

    registerMediaPort(media_port);
}

SoftwareAudioInput::~SoftwareAudioInput() {
    unregisterMediaPort();
    pjmedia_port_destroy(media_port);
    pj_pool_release(pj_pool);
}

void SoftwareAudioInput::Start() {
    isActive = true;
}

void SoftwareAudioInput::Stop() {
    isActive = false;
}

pj_status_t SoftwareAudioInput::PutFrameCallback(pjmedia_port *port, pjmedia_frame *frame) {

    // skip heartbeat frame
    if (frame->type != PJMEDIA_FRAME_TYPE_AUDIO) {
        return PJ_SUCCESS;
    }

    auto input = (SoftwareAudioInput *) port->port_data.pdata;

    if (!input->isActive) {
        return PJ_SUCCESS;
    }

    // Accept both 10 ms (960 bytes) and 20 ms (1920 bytes) mono 48k16 frames.
    // If 10 ms arrives, accumulate to 20 ms before passing into tgvoip.
    if (frame->size == 960) {
        size_t copy = PJ_MIN((size_t)960, sizeof(input->acc) - input->acc_len);
        memcpy(input->acc + input->acc_len, frame->buf, copy);
        input->acc_len += copy;
        if (input->acc_len == sizeof(input->acc)) {
            input->InvokeCallback((unsigned char *) input->acc, sizeof(input->acc));
            input->acc_len = 0;
        }
    } else if (frame->size == 960 * 2) {
        input->InvokeCallback((unsigned char *) frame->buf, frame->size);
        input->acc_len = 0; // reset accumulator on full frame
    } else {
        // Unexpected size: drop silently to avoid asserts breaking call flow
    }

    return PJ_SUCCESS;
}

pj_status_t SoftwareAudioInput::GetFrameCallback(pjmedia_port *port, pjmedia_frame *frame) {
    frame->size = 0;
    frame->type = PJMEDIA_FRAME_TYPE_NONE;
    return PJ_SUCCESS;
}