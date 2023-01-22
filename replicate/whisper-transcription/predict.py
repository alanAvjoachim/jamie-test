# Prediction interface for Cog ⚙️
import io
import os
from typing import List
from typing import Optional, Any
import torch
import json
import numpy as np
from cog import BasePredictor, Input, Path, BaseModel

import whisper
from whisper.model import Whisper, ModelDimensions
from whisper.tokenizer import LANGUAGES, TO_LANGUAGE_CODE
from whisper.utils import format_timestamp

class Output(BaseModel):
    transcript: str
    language: str

class Predictor(BasePredictor):
    def setup(self):
        self.model = whisper.load_model("medium", "cuda")

    def predict(
        self,
        # audioString: str = Input(description="Base64 Audio String"),
        audioChunks: str = Input(description="List of audio chunks as .wav files"),
    ) -> List[Path]:
        """Run a single prediction on the model"""

        model = self.model

        output = ""

        # language spoken
        language = "undefined"
        # convert audioChunks string into array
        parsedArray = json.loads(audioChunks)
        # loop through the list of audio chunks with index
        for i, audioUrl in enumerate(parsedArray):
            # apply whisper and add to output list
            result = model.transcribe(str(audioUrl))
            transcription = result["text"]
            language = result["language"]

            speaker = extract_speaker(audioUrl)
            # add to output
            output += speaker + ": " + transcription + "#E#"

        # returning results
        return Output(
            transcript=output,
            language=language
        )


def extract_speaker(url):
    # Split the URL by '/' and take the last element
    filename = url.split('/')[-1]

    # Split the filename by '_' and take the third and fourth elements
    speaker = filename.split('_')[2] + '_' + filename.split('_')[3]

    return speaker