# Prediction interface for Cog ⚙️
# https://github.com/replicate/cog/blob/main/docs/python.md

from cog import BasePredictor, Input, Path, File, BaseModel
from typing import List
from pyannote.audio import Pipeline
from pydub import AudioSegment
import re
import subprocess

class Predictor(BasePredictor):
    def setup(self):
        """Load the model into memory to make running multiple predictions efficient"""
        # self.model = torch.load("./weights.pth")
        self.pipeline = Pipeline.from_pretrained("pyannote/speaker-diarization",
                                    use_auth_token="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")

    def predict(
        self,
        # audioString: str = Input(description="Base64 Audio String"),
        audio: Path = Input(description="Audio file as a .wav file"),
        # numberSpeakers: int = Input(description="Number of speakers in the audio file"),
        audioChunkIndex: int = Input(description="Index of the audio chunk in the audio file")
    ) -> List[Path]:
        """Run a single prediction on the model"""

        # from https://colab.research.google.com/drive/12W6bR-C6NIEjAML19JubtzHPIlVxdaUq?usp=sharing#scrollTo=MaRDsBV1CWi8

        # convert webm to wav
        with open(audio, 'rb') as f:
            webm_blob = f.read()

        convert_webm_to_wav(webm_blob, 'output.wav')

        # pyannote seems to miss first 0.5 seconds, hence prepending a spacer
        print("adding spacer to start of audio file")
        spacermilli = 2000
        spacer = AudioSegment.silent(duration=spacermilli)
        audio = AudioSegment.from_wav("output.wav") #lecun1.wav
        audio = spacer.append(audio, crossfade=0)
        audio.export('adjustedAudio.wav', format='wav')

        # check if numberSpeakers was provided
        #if numberSpeakers == None:
        dz = self.pipeline("adjustedAudio.wav")
        # else:
          #  dz = self.pipeline("adjustedAudio.wav", num_speakers=numberSpeakers)
        # process file in pipeline with pyannote
        print("starting diarization of file")
        

        print("success. printing first 10 turns")
        print(*list(dz.itertracks(yield_label = True))[:10], sep="\n")

        # saving diarization to file
        with open("diarization.txt", "w") as text_file:
            text_file.write(str(dz))
        
        # preparing audio files for each diariation turn
        def millisec(timeStr):
            spl = timeStr.split(":")
            s = (int)((int(spl[0]) * 60 * 60 + int(spl[1]) * 60 + float(spl[2]) )* 1000)
            return s


        dzs = open('diarization.txt').read().splitlines()

        groups = []
        g = []
        lastend = 0

        # this groups diarization turns by speakers in sequence (=when there are >1 consecutive turns by the same speaker)
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
            print(*groups, sep='\n')

        
        # creating & saving corresponding audio parts
        audioFile = AudioSegment.from_wav("adjustedAudio.wav")
        gidx = -1
        output = []
        for g in groups:
            # get start and end time
            start = re.findall('[0-9]+:[0-9]+:[0-9]+\.[0-9]+', string=g[0])[0]
            end = re.findall('[0-9]+:[0-9]+:[0-9]+\.[0-9]+', string=g[-1])[1]
            start = millisec(start) #- spacermilli
            end = millisec(end)  #- spacermilli
            # print(start, end)

            # get duration of audio segment
            duration = end - start
            if duration < 2 * 1000:  # 2 seconds in milliseconds
                continue  # skip this iteration if duration is too short

            roundedDuration = round(duration / 1000)

            # get speaker
            match = re.search(r"SPEAKER_\d+", g[0])
            speaker = match.group()

            gidx += 1
            path = str(audioChunkIndex) + "_" + str(gidx) + "_" + str(speaker) + "_" + str(roundedDuration) +'.wav'
            audioFile[start:end].export(path, format='wav')
            output.append(Path(path))

        # returning results
        return output

import subprocess

def convert_webm_to_wav(webm_blob: bytes, wav_file: str):
    # Use ffmpeg to convert the webm blob to a wav file
    # ffmpeg_command = ['ffmpeg', '-i', '-', '-ac', '2', wav_file, '-y']
    
    # also normalise loudness:
    ffmpeg_command = ['ffmpeg', '-i', '-', '-filter:a', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-ac', '2', wav_file, '-y']
    ffmpeg_process = subprocess.Popen(ffmpeg_command, stdin=subprocess.PIPE)
    ffmpeg_process.communicate(input=webm_blob)
