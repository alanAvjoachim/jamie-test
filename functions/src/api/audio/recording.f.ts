import { Blob } from "buffer";
import * as fs from "fs";

export async function handler(data: any, context: any) {
  try {
    // console.log("data: ", data);
    const customerUID = context.auth.uid;
    if (data.audioBase64String && data.videoBase64String) {
      const byteCharactersAudio = atob(data.audioBase64String);
      const byteNumbersAudio = new Array(byteCharactersAudio.length);
      for (let i = 0; i < byteCharactersAudio.length; i++) {
        byteNumbersAudio[i] = byteCharactersAudio.charCodeAt(i);
      }
      const byteArrayAudio = new Uint8Array(byteNumbersAudio);
      new Blob([byteArrayAudio], {
        type: "audio/webm;codecs=opus"
      });

      const byteCharactersVideo = atob(data.videoBase64String);
      const byteNumbersVideo = new Array(byteCharactersVideo.length);
      for (let i = 0; i < byteCharactersVideo.length; i++) {
        byteNumbersVideo[i] = byteCharactersVideo.charCodeAt(i);
      }
      const byteArrayVideo = new Uint8Array(byteNumbersVideo);
      new Blob([byteArrayVideo], {
        type: "audio/webm;codecs=opus"
      });

      fs.writeFileSync(
        `audio_${data.index}_${customerUID}.wav`,
        byteArrayAudio
      );
      fs.readFileSync(`audio_${data.index}_${customerUID}.wav`);

      fs.writeFileSync(
        `video_${data.index}_${customerUID}.wav`,
        byteArrayVideo
      );
      fs.readFileSync(`video_${data.index}_${customerUID}.wav`);

      const ffmpeg = require("fluent-ffmpeg");
      const command = ffmpeg();

      const promiseObj = () =>
        new Promise((resolve, reject) => {
          command
            .input(`video_${data.index}_${customerUID}.wav`)
            .input(`audio_${data.index}_${customerUID}.wav`)
            .complexFilter([{ filter: "amix", inputs: 2 }])
            .save(`merged_${data.index}_${customerUID}.wav`)
            .on("end", async () => {
              resolve("Success");
            })
            .on("error", (err: any) => {
              return reject(new Error(err));
            });
        });
      await promiseObj();
      const admin = require("firebase-admin");

      const bucket = admin.storage().bucket();

      const destination = `${data.meetingId}/${data.index}_${customerUID}.wav`;

      await bucket.upload(`merged_${data.index}_${customerUID}.wav`, {
        destination: destination,
        public: true,
        gzip: true,
        metadata: {
          cacheControl: "public, max-age=31536000"
        }
      });

      fs.unlink(`merged_${data.index}_${customerUID}.wav`, function() {
        console.log("merged audio deleted..");
      });
      fs.unlink(`audio_${data.index}_${customerUID}.wav`, function() {
        console.log("audio deleted..");
      });
      fs.unlink(`video_${data.index}_${customerUID}.wav`, function() {
        console.log("video deleted..");
      });
    } else if (data.audioBase64String && !data.videoBase64String) {
      const byteCharactersAudio = atob(data.audioBase64String);
      const byteNumbersAudio = new Array(byteCharactersAudio.length);
      for (let i = 0; i < byteCharactersAudio.length; i++) {
        byteNumbersAudio[i] = byteCharactersAudio.charCodeAt(i);
      }
      const byteArrayAudio = new Uint8Array(byteNumbersAudio);
      new Blob([byteArrayAudio], {
        type: "audio/webm;codecs=opus"
      });

      fs.writeFileSync(
        `audio_${data.index}_${customerUID}.wav`,
        byteArrayAudio
      );
      fs.readFileSync(`audio_${data.index}_${customerUID}.wav`);

      const ffmpeg = require("fluent-ffmpeg");
      const command = ffmpeg();

      const promiseObj = () =>
        new Promise((resolve, reject) => {
          command
            .input(`audio_${data.index}_${customerUID}.wav`)
            .format("wav")
            .save(`merged_${data.index}_${customerUID}.wav`)
            .on("end", async () => {
              resolve("Success");
            })
            .on("error", (err: any) => {
              return reject(new Error(err));
            });
        });
      await promiseObj();

      const admin = require("firebase-admin");

      const bucket = admin.storage().bucket();

      const destination = `${data.meetingId}/${data.index}_${customerUID}.wav`;

      await bucket.upload(`merged_${data.index}_${customerUID}.wav`, {
        destination: destination,
        public: true,
        gzip: true,
        metadata: {
          cacheControl: "public, max-age=31536000"
        }
      });

      fs.unlink(`merged_${data.index}_${customerUID}.wav`, function() {
        console.log("merged audio deleted..");
      });

      fs.unlink(`audio_${data.index}_${customerUID}.wav`, function() {
        console.log("audio deleted..");
      });
    }

    return {
      code: 200,
      message: "Success!!!!!"
    };
  } catch (error) {
    console.log(error);
    return {
      status: 400,
      message: "Error while signing up"
    };
  }
}
