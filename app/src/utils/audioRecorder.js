// export a function that records the audio of the system
// and returns a promise that resolves to the recorded audio
// as a blob
export default async function startRecording({ deviceId }) {
    // start audio capture with specified device id
    const stream = navigator.mediaDevices.getUserMedia({
          audio: { deviceId: selectedDeviceIdInput },
          video: false
        })

    // create audio context
    const audioContext = new AudioContext()

    // create a media stream source from the audio stream
    const source = audioContext.createMediaStreamSource(stream)

    // create a recorder
    

}
    
export default async function stopRecording() {
    // 
}