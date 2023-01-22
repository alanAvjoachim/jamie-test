from flask import Flask
from flask_restful import Resource, Api, reqparse
import base64
from pyannote.audio import Pipeline
from pydub import AudioSegment
import re

# Init
app = Flask(__name__)
api = Api(app)


class handleRequest(Resource):
    # Define POST
    def post(self):
        parser = reqparse.RequestParser()  # initialize parser
        # add args
        parser.add_argument('audioBase64', required=True)
        parser.add_argument('meetingId', required=True)

        args = parser.parse_args()  # parse arguments to dictionart
        
        # define path to decode audio file
        path = args['meetingId'] + ".wav"

        decoded = base64.b64decode(bytes(args['audioBase64'], 'utf-8'))
        with open(path, "wb") as fh:
            fh.write(decoded)

        # set up hugging face access
        access_token = "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"

        # set up hugging face pipeline
        pipeline = Pipeline.from_pretrained('pyannote/speaker-diarization', use_auth_token=access_token)

        dz = pipeline(path)

        with open("diarization.txt", "w") as text_file:
            text_file.write(str(dz))
       
        def millisec(timeStr):
            spl = timeStr.split(":")
            s = (int)((int(spl[0]) * 60 * 60 + int(spl[1]) * 60 + float(spl[2]) )* 1000)
            return s
        
        dzs = open('diarization.txt').read().splitlines()

        groups = []
        g = []
        lastend = 0

        for d in dzs:   
            if g and (g[0].split()[-1] != d.split()[-1]):      #same speaker
                groups.append(g)
                g = []
            
            g.append(d)
            
            end = re.findall('[0-9]+:[0-9]+:[0-9]+\.[0-9]+', string=d)[1]
            end = millisec(end)
            if (lastend > end):       #segment engulfed by a previous segment
                groups.append(g)
                g = [] 
            else:
                lastend = end
        if g:
            groups.append(g)

        # split file
        audio = AudioSegment.from_wav("input_prep.wav")
        gidx = -1
        for g in groups:
            start = re.findall('[0-9]+:[0-9]+:[0-9]+\.[0-9]+', string=g[0])[0]
            end = re.findall('[0-9]+:[0-9]+:[0-9]+\.[0-9]+', string=g[-1])[1]
            start = millisec(start) #- spacermilli
            end = millisec(end)  #- spacermilli
            print(start, end)
            gidx += 1
            audio[start:end].export(str(gidx) + '.wav', format='wav')

        # save all the chunks in a cloud storage bucket
        from google.cloud import storage
        storage_client = storage.Client()
        bucket = storage_client.bucket('jamie-core-staging.appspot.com')
        # define path for upload
        path = args['meetingId'] + "/"

        for g in groups:
            print("uploading " + str(gidx) + '.wav')
            # upload to cloud storage
            blob = bucket.blob(path + str(gidx) + '.wav')
            blob.upload_from_filename(str(gidx) + '.wav')
        

        return "success", 200

api.add_resource(handleRequest, "/diarization") # "/audioToScript" is our end-point

if __name__ == "__main__":
    app.run() # debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))