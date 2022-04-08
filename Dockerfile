FROM python:3.10-buster

# Install system dependencies
RUN set -e; \
    apt-get update -y && apt-get install -y \
	supervisor \
    tini \
    lsb-release; \
    gcsFuseRepo=gcsfuse-`lsb_release -c -s`; \
    echo "deb http://packages.cloud.google.com/apt $gcsFuseRepo main" | \
    tee /etc/apt/sources.list.d/gcsfuse.list; \
    curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | \
    apt-key add -; \
    apt-get update; \
    apt-get install -y gcsfuse \
    && apt-get clean \
	pip install --upgrade pip && \
	pip install Quart gunicorn uvicorn typing gevent && \
	mkdir -p ${APP_DIR}/web && \
	rm -rf /var/cache/apk/*



# Copy local code to the container image.
ENV APP_DIR /app
WORKDIR $APP_DIR
COPY . ./
# Set fallback mount directory
ENV MNT_DIR $APP_DIR/app/web/data
# copy config files
COPY ./app ${APP_DIR}

VOLUME ["${APP_DIR}"]

# Use tini to manage zombie processes and signal forwarding
# https://github.com/krallin/tini
ENTRYPOINT ["/usr/bin/tini", "--"] 

# Pass the startup script as arguments to Tini
CMD ["/app/run.sh"]
