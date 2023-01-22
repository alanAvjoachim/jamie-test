import os
from flask import Flask
from flask_restful import Resource, Api, reqparse
import ast
import whisper
import base64
import firebase_admin
from firebase_admin import firestore

# Init
firebase_admin.initialize_app()
db = firestore.client()
app = Flask(__name__)
api = Api(app)

# Set whisper model
model = whisper.load_model("small")

class handleRequest(Resource):
    # Define POST
    def post(self):
        parser = reqparse.RequestParser()  # initialize parser
        # add args
        parser.add_argument('audioBase64', required=True)
        parser.add_argument('meetingId', required=True)
        parser.add_argument('audioChunkId', required=True)
        parser.add_argument('supportedContentType', required=True)

        args = parser.parse_args()  # parse arguments to dictionart

        path = args['meetingId'] + args['audioChunkId'] + args['supportedContentType']

        decoded = base64.b64decode(bytes(args['audioBase64'], 'utf-8'))
        with open(path, "wb") as fh:
            fh.write(decoded)

        # Open AI - Whisper
        result = model.transcribe(path)
       
        return result, 200

api.add_resource(handleRequest, "/audioToScript") # "/audioToScript" is our end-point

class Chunk:
    def __init__(self, id, text):
        self.id = id
        self.text = text

if __name__ == "__main__":
    app.run() # debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))