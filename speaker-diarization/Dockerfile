
# Use the official lightweight Python image.
# https://hub.docker.com/_/python
FROM python:3.10

# Allow statements and log messages to immediately appear in the Knative logs
ENV PYTHONUNBUFFERED True

# Copy local code to the container image.
ENV APP_HOME /app
WORKDIR $APP_HOME
COPY . ./

# Install production dependencies.
# RUN pip install Flask gunicorn
RUN pip install flask-restful && pip install --upgrade firebase-admin && pip install --no-cache-dir -r requirements.txt && apt-get install -y ffmpeg && pip install pyannote.audio && pip install pydub
# RUN pip install pandas

# Run the web service on container startup. Here we use the gunicorn
# webserver, with one worker process and 8 threads.
# For environments with multiple CPU cores, increase the number of workers
# to be equal to the cores available.
# Timeout is set to 0 to disable the timeouts of the workers to allow Cloud Run to handle instance scaling.
CMD exec gunicorn --bind :$PORT --workers 1 --threads 1 --timeout 0 main:app
