FROM ghcr.io/tobitti0/docker-avisynthplus:5.1-ubuntu2004 as build

ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_VERSION=18
ENV EPGSTATION_VERSION=v2.9.1

RUN set -xe && \
    apt-get update && \
    apt-get install --no-install-recommends -y \
    curl git make gcc g++ cmake libboost-all-dev

# build jlse libs
ADD lib /tmp/lib
RUN mkdir /dist && \
    cd /tmp/lib/chapter_exe/src && \
    make && \
    mv chapter_exe /dist && \
    cd /tmp/lib/logoframe/src && \
    make && \
    mv logoframe /dist && \
    cd /tmp/lib/join_logo_scp/src && \
    make && \
    mv join_logo_scp /dist && \
    cd /tmp/lib/tsdivider/ && \
    mkdir build && \
    cd build && \
    cmake -DCMAKE_BUILD_TYPE=Release .. && \
    make && \
    mv tsdivider /dist && \
    # delogo
    set -xe && \
    cd /tmp/lib/delogo-AviSynthPlus-Linux/src && \
    make && \
    cp libdelogo.so /dist

# node setup tool
RUN set -xe && \
    curl -O -sL https://deb.nodesource.com/setup_${NODE_VERSION}.x && \
    mv setup_${NODE_VERSION}.x /dist/setup_node.x

# EPGStation clone
RUN set -xe && \
    cd /tmp && \
    git clone https://github.com/l3tnun/EPGStation.git -b ${EPGSTATION_VERSION}

FROM ghcr.io/tobitti0/docker-avisynthplus:5.1-ubuntu2004 as release
ENV DEBIAN_FRONTEND=noninteractive
ADD join_logo_scp_trial /join_logo_scp_trial
COPY --from=build /dist/chapter_exe /join_logo_scp_trial/bin/chapter_exe
COPY --from=build /dist/logoframe /join_logo_scp_trial/bin/logoframe
COPY --from=build /dist/join_logo_scp /join_logo_scp_trial/bin/join_logo_scp
COPY --from=build /dist/tsdivider /join_logo_scp_trial/bin/tsdivider
COPY --from=build /dist/setup_node.x /join_logo_scp_trial/setup_node.x
COPY --from=build /dist/libdelogo.so /usr/local/lib/avisynth/libdelogo.so 
COPY --from=build /tmp/EPGStation /app

WORKDIR /join_logo_scp_trial
RUN apt update && apt install -y ca-certificates && \    
    bash setup_node.x && \
    apt install --no-install-recommends -y nodejs libboost-filesystem-dev libboost-program-options-dev libboost-system-dev && \
    node -v && \
    npm --version && \
    ls /usr/local/lib/avisynth && \
    npm install && \
    npm link && \
    jlse --help

# install EPGStation
RUN cd /app && \
    npm install && \
    npm install async && \
    npm run all-install && \
    npm run build

WORKDIR /app
COPY config /app/config
COPY logos /join_logo_scp_trial/logo
ENTRYPOINT ["npm"]
CMD ["start"]