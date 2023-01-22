# Prediction interface for Cog ⚙️
# https://github.com/replicate/cog/blob/main/docs/python.md

import json
from cog import BasePredictor, Input, Path, File, BaseModel
from typing import List
from pydub import AudioSegment
import torchaudio
from speechbrain.pretrained import SpeakerRecognition


class Predictor(BasePredictor):
    def setup(self):
        """Load the model into memory to make running multiple predictions efficient"""
        # self.model = torch.load("./weights.pth")
        self.spec_rec = SpeakerRecognition.from_hparams(source="speechbrain/spkrec-ecapa-voxceleb", savedir="pretrained_models/spkrec-ecapa-voxceleb")

    def predict(
        self,
        speakerIdentificationChunks: str = Input(description="Stringified JSON object containing all speaker identification chunks"),
    ) -> List[Path]:
        """Run a single prediction on the model"""

        # for every audio chunk, we are identifying speakers
        # now, across multiple chunks, we need to match the identities
        speakerIdentificationChunks = json.loads(speakerIdentificationChunks)
        # so the input must be a list
        # each object must contain a list of all speakers with respective randomly sampled files of speakers
        identifiedSpeakerLibrary = {}
        speakerMappingAcrossChunks = {}
        """
        the format of identified speaker library is this:
        {
            "speakerId": {
                tensorEmbedding: string,
                audio: string,
                name: string,
            }
        }

        the format of the speakerMappingAcrossChunks object is:

        {
            "chunkIndex": {
                "speakerId": {
                    trueSpeakerId: 1
                }
            }
        }

        the format of the speakerIdentificationChunks object is:
        {
            "chunkIndex": {
                "speakerId": {
                    url: "https://example.com/audio.wav",
                    duration: 10
                }
            }
        }
        """

        # function to check whether an existing speaker record exists
        def matchNewSpeakerToIdentifiedSpeakers(speakerAudioFile):
            # cut first 2s of speaker audio file
            # trimmed_audio = trim_audio(speakerAudioFile)
            # trimmed_audio.export(speakerAudioFile, format="wav")

            # calculate embedding for new speaker
            waveform = self.spec_rec.load_audio(speakerAudioFile)
            batch = waveform.unsqueeze(0)
            newSpeakerEmbedding = self.spec_rec.encode_batch(batch)

            # loop through all identified speakers
            for identifiedSpeakerId, identifiedSpeakerObject in identifiedSpeakerLibrary.items():
                print("looping through known speakers")
                # load speaker embedding of identified speaker
                identifiedSpeakerEmbedding = string_to_tensor(identifiedSpeakerObject["tensorEmbedding"])
                
                print("new speaker embedding:")
                print(newSpeakerEmbedding)
                print("identified speaker embedding:")
                print(identifiedSpeakerEmbedding)
                # run speaker verification
                score = self.spec_rec.similarity(identifiedSpeakerEmbedding, newSpeakerEmbedding)

                # if the score is above a threshold, then we have a match
                if score > 0.55:
                    print("threshold identified speaker id: " + str(identifiedSpeakerId))
                    # match found
                    return identifiedSpeakerId

            # if we get here, then we have a new speaker as no record matched
            # so we add the speaker to the identified speakers by adding a new key
            newSpeakerId = len(identifiedSpeakerLibrary)
            print("new speaker identified: " + str(newSpeakerId))
            identifiedSpeakerLibrary[newSpeakerId] = {
                "tensorEmbedding": tensor_to_string(newSpeakerEmbedding),
                "audio": speakerAudioFile
            }
            # identifiedSpeakerLibrary.get(newSpeakerId, {})["tensorEmbedding"] = tensor_to_string(newSpeakerEmbedding)
            print("printing identified speaker library")
            print(identifiedSpeakerLibrary)
            return newSpeakerId

        # start of the main function
        # for loop through each speakerIdentificationChunk object
        for chunkIndex, chunk in speakerIdentificationChunks.items():
            print("looping through current chunk: " + str(chunkIndex))
            print(chunk)
            # loop through all speakers identified in that chunk
            for speakerId, speakerObject in chunk.items():
                print("looping through current speaker: " + str(speakerId))
                identifiedSpeakerId = matchNewSpeakerToIdentifiedSpeakers(speakerObject["url"])
                print("got here")
                print("identified speaker id: " + str(identifiedSpeakerId))
                # we need to save the mapping from the given speakerIdentificationChunk to the identifiedSpeakerLibrary
                # for this we use the speakerMappingAcrossChunks object

                # as there could not exist a dict, we need to add proper fallbacks
                if chunkIndex in speakerMappingAcrossChunks:
                  speakerMappingAcrossChunks[chunkIndex][speakerId] = identifiedSpeakerId
                else:
                  speakerMappingAcrossChunks[chunkIndex] = {speakerId: identifiedSpeakerId}

        return {
            "identifiedSpeakerLibrary": identifiedSpeakerLibrary,
            "speakerMappingAcrossChunks": speakerMappingAcrossChunks,
            "speakerIdentificationChunks": speakerIdentificationChunks  
        }


# conversion of tensor to string and back
import torch
import ast

def tensor_to_string(tensor):
    """Convert a tensor to a string"""
    return str(tensor)

def string_to_tensor(string):
    """Convert a string to a tensor"""
    # Extract the values from the string
    values = ast.literal_eval(string.replace('tensor', ''))
    # Convert the values into a tensor
    return torch.tensor(values)

import requests

def trim_audio(audio_url, start_trim=2000, end_trim=2000, min_duration=7000):
    # Load audio file
    response = requests.get(audio_url)
    response.raise_for_status()
    sound = AudioSegment.from_file(response.content)
    # Get audio duration
    duration = len(sound)
    # Check if duration is longer than min_duration
    if duration > min_duration:
        # Trim the first and last 2 seconds of the clip
        sound = sound[start_trim:duration-end_trim]
    return sound
