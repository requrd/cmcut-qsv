FROM ghcr.io/tobitti0/docker-avisynthplus:5.1-ubuntu2004 as build

ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_VERSION=18
ENV EPGSTATION_VERSION=v2.9.1

RUN set -xe && \
    apt-get update && \
    apt-get install --no-install-recommends -y \
    curl git make gcc g++ cmake libboost-all-dev

# join_logo_scp_trial build
RUN cd /tmp/ && \
    git clone --recursive https://github.com/tobitti0/JoinLogoScpTrialSetLinux.git && \
    cd /tmp/JoinLogoScpTrialSetLinux && \
    git submodule foreach git pull origin master && \
    cd /tmp/JoinLogoScpTrialSetLinux/modules/chapter_exe/src && \
    make && \
    mv chapter_exe /tmp/JoinLogoScpTrialSetLinux/modules/join_logo_scp_trial/bin/ && \
    cd /tmp/JoinLogoScpTrialSetLinux/modules/logoframe/src && \
    make && \
    mv logoframe /tmp/JoinLogoScpTrialSetLinux/modules/join_logo_scp_trial/bin/ && \
    cd /tmp/JoinLogoScpTrialSetLinux/modules/join_logo_scp/src && \
    make && \
    mv join_logo_scp /tmp/JoinLogoScpTrialSetLinux/modules/join_logo_scp_trial/bin/ && \
    cd /tmp/JoinLogoScpTrialSetLinux/modules/tsdivider/ && \
    mkdir build && \
    cd build && \
    cmake -DCMAKE_BUILD_TYPE=Release .. && \
    make && \
    mv tsdivider /tmp/JoinLogoScpTrialSetLinux/modules/join_logo_scp_trial/bin/ && \
    mv /tmp/JoinLogoScpTrialSetLinux/modules/join_logo_scp_trial /join_logo_scp_trial && \
    cd /join_logo_scp_trial

# delogo
RUN set -xe && \
    git clone https://github.com/tobitti0/delogo-AviSynthPlus-Linux && \
    cd delogo-AviSynthPlus-Linux/src && \
    make && \
    cp libdelogo.so /join_logo_scp_trial

# node setup tool
RUN set -xe && \
    curl -O -sL https://deb.nodesource.com/setup_${NODE_VERSION}.x && \
    mv setup_${NODE_VERSION}.x /join_logo_scp_trial/setup_node.x

# EPGStation clone
RUN set -xe && \
    cd /tmp && \
    git clone https://github.com/l3tnun/EPGStation.git -b ${EPGSTATION_VERSION}

FROM ghcr.io/tobitti0/docker-avisynthplus:5.1-ubuntu2004 as release
ENV DEBIAN_FRONTEND=noninteractive
COPY --from=build /join_logo_scp_trial /join_logo_scp_trial
COPY --from=build /tmp/EPGStation /app

WORKDIR /join_logo_scp_trial
RUN apt update && apt install -y ca-certificates && \    
    bash setup_node.x && \
    apt install --no-install-recommends -y nodejs libboost-filesystem-dev libboost-program-options-dev libboost-system-dev && \
    node -v && \
    npm --version &&\
    mv libdelogo.so /usr/local/lib/avisynth && \
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
COPY settings /app/settings
RUN mv /app/settings/ChList.csv /join_logo_scp_trial/setting/ChList.csv &&\
    tail -n +2 /app/settings/JLparam_set2.csv >> /join_logo_scp_trial/setting/JLparam_set2.csv &&\
    sed -ie "s/LWLibavVideoSource(TSFilePath, repeat=true, dominance=1)/LWLibavVideoSource(TSFilePath, repeat=true, dominance=1, fpsnum=30000, fpsden=1001)/g" /join_logo_scp_trial/src/jlse.js &&\
    sed -ie "s/columns: \[\"recognize\", \"install\", \"short\"\]/columns: \[\"recognize\", \"install\", \"short\", \"serviceId\"\]/g" /join_logo_scp_trial/src/channel.js
ENTRYPOINT ["npm"]
CMD ["start"]