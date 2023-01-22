# pyannote.audio seems to miss the first 0.5 seconds of the audio, and, therefore, we prepend a spcacer.
from pydub import AudioSegment

spacermilli = 2000
spacer = AudioSegment.silent(duration=spacermilli)


# audio = AudioSegment.from_wav("input.wav") 
audio = AudioSegment.from_file("test.wav", format="wav")

audio = spacer.append(audio, crossfade=0)

audio.export('input_prep.wav', format='wav')