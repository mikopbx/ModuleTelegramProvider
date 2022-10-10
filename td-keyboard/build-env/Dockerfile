FROM debian:bullseye

ENV PATH=/usr/local/go/bin/:/usr/local/go/bin/:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ENV GOROOT=/usr/local/go
ENV CGO_CFLAGS="-IC:/usr/local/include"
ENV CGO_LDFLAGS="-LC:/usr/local/lib"

WORKDIR /

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y git cmake build-essential \
	 	gperf libssl-dev zlib1g-dev \
		build-essential git \
		wget ca-certificates \
		pkg-config libopus-dev libssl-dev \
		zlib1g-dev gperf ccache && \
	# TDLib
	git clone https://github.com/tdlib/td.git && \
    cd td && \
    git checkout v1.8.0 && \
    mkdir build && \
    cd build && \
    cmake -DCMAKE_BUILD_TYPE=Release .. && \
    cmake --build . && \
    make install && \
	# Install GoLang
	wget --quiet  https://go.dev/dl/go1.19.linux-amd64.tar.gz && \
	tar -xf go1.19.linux-amd64.tar.gz && \
	rm -rf go1.19.linux-amd64* && \
	mv go /usr/local && \
	# Install PJSIP
	git clone https://github.com/pjsip/pjproject.git \
    && cd pjproject \
    && git reset --hard 2.9 \
	&& echo '#define PJMEDIA_CONF_USE_SWITCH_BOARD 	   1' > pjlib/include/pj/config_site.h \
	&& echo '#define PJMEDIA_CONF_SWITCH_BOARD_BUF_SIZE 2000' >> pjlib/include/pj/config_site.h \
	&& echo '#define PJSUA_MAX_CALLS 	128' >> pjlib/include/pj/config_site.h \ 
	&& echo '#define PJSUA_MAX_PLAYERS 	256' >> pjlib/include/pj/config_site.h \
	&& echo '#define PJ_IOQUEUE_MAX_HANDLES 	256' >> pjlib/include/pj/config_site.h \
	&& echo '#define PJMEDIA_CODEC_L16_HAS_48KHZ_MONO 1' >> pjlib/include/pj/config_site.h \
    && ./configure --disable-sound CFLAGS="-O3 -DNDEBUG" \
    && make dep && make -j $(grep -c ^processor /proc/cpuinfo) && make install \
    && cd / \
    && rm -rf pjproject && \
	# Install spdlog
	git clone -n https://github.com/gabime/spdlog.git \
    && cd spdlog \
    && git checkout tags/v0.17.0 \
    && mkdir build \
    && cd build \
    && cmake -DCMAKE_BUILD_TYPE=Release -DSPDLOG_BUILD_EXAMPLES=OFF -DSPDLOG_BUILD_TESTING=OFF .. \
    && cmake --build . --target install -j $(grep -c ^processor /proc/cpuinfo) \
    && cd / \
    && rm -rf spdlog;

ENTRYPOINT ["/bin/bash"]