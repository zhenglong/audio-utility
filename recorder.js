
if (navigator.mediaDevices === undefined) {
    navigator.mediaDevices = {};
}

if (navigator.mediaDevices.getUserMedia == undefined) {
    let getUserMediaFunc = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    if (getUserMediaFunc) {
        navigator.mediaDevices.getUserMedia = function(constraints) {
            return new Promise(function(resolve, reject) {
                getUserMediaFunc.call(navigator, constraints, resolve, reject);
            });
        }
    }
}

const FinalAudioContext = window.AudioContext || window.webkitAudioContext;

function mergeArray(list) {
    var length = list.length * list[0].length;
    var data = new Float32Array(length),
        offset = 0;
    list.forEach((elem, i) => {
        data.set(list[i], offset);
        offset += list[i].length;
    });
    return data;
}

function interleaveBuffers(left, right) {
    var totalLength = left.length + right.length;
    var data = new Float32Array(totalLength);
    left.forEach((elem, i) => {
        var k = i * 2;
        data[k] = left[i];
        data[k + 1] = right[i];
    });
    return data;
}

function createWavFile(audioData) {
    var WAV_HEAD_SIZE = 44;
    var buffer = new ArrayBuffer(audioData.length * 2 + WAV_HEAD_SIZE),
        view = new DataView(buffer);
    // RIFF chunk descriptor/identifier
    writeUTFBytes(view, 0, 'RIFF');
    // RIFF chunk length
    view.setUint32(4, 44 + audioData.length * 2, true);
    // RIFF type
    writeUTFBytes(view, 8, 'WAVE');
    // format chunk identifier
    // FMT sub-chunk
    writeUTFBytes(view, 12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw)
    view.setUint16(20, 1, true);
    // stereo (2 channels)
    view.setUint16(22, 2, true);
    // sample rate
    view.setUint32(24, 44100, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, 44100 * 2, true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, 2 * 2, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data sub-chunk
    // data chunk identifier
    writeUTFBytes(view, 36, 'data');
    // data chunk length
    view.setUint32(40, audioData.length * 2, true);

    // 写入PCM数据
    var length = audioData.length;
    var index = 44;
    var volume = 1;
    for (var i = 0; i < length; i++) {
        view.setInt16(index, audioData[i] * (0x7FFF * volume), true);
        index += 2;
    }
    return buffer;
}

function writeUTFBytes(view, offset, string) {
    var lng = string.length;
    for (var i = 0; i < lng; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

/**
 * 
 * H5录音
 * 
 */
export default class HjRecorder {
    constructor() {
        this.state = {
            mediaStream: null,
            isRecording: false,

            mediaRecorder: null,
            chunks: null,

            audioContext: null,
            sourceNode: null,
            scriptNode: null,
            leftBuffers: null,
            rightBuffers: null
        };
        this.onStop = null;
    }

    static isH5RecordingSupported() {
        return !!((window.MediaRecorder || FinalAudioContext) && (navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
    }

    start() {
        if (this.state.isRecording) {
            return;
        }
        navigator.mediaDevices.getUserMedia({
            // audio: true
            audio: {
                sampleRate: 44100,
                channelCount: 2,
                volume: 1.0
            }
        }).then(mediaStream => {
            this.state.mediaStream = mediaStream;
            if (FinalAudioContext) {
                // version #2 使用AudioContext
                this.state.audioContext = new FinalAudioContext();
                let {
                    audioContext
                } = this.state;
                this.state.sourceNode = audioContext.createMediaStreamSource(mediaStream);

                this.state.scriptNode = null;
                var bufferSize = 4096;
                var numChannels = 2;
                if (audioContext.createJavaScriptNode) {
                    this.state.scriptNode = context.createJavaScriptNode(bufferSize, numChannels, numChannels);
                } else if (audioContext.createScriptProcessor) {
                    this.state.scriptNode = audioContext.createScriptProcessor(4096, numChannels, numChannels);
                } else {
                    alert('浏览器不支持音频API');
                    return;
                }
                this.state.isRecording = true;
                this.state.leftBuffers = [];
                this.state.rightBuffers = [];
                let {
                    scriptNode,
                    sourceNode
                } = this.state;
                sourceNode.connect(scriptNode);
                scriptNode.connect(audioContext.destination);
                scriptNode.onaudioprocess = (event) => {
                    if (!this.state.isRecording) return;
                    let inputBuffer = event.inputBuffer;
                    let left = inputBuffer.getChannelData(0);
                    let right = inputBuffer.getChannelData(1);
                    let {
                        leftBuffers,
                        rightBuffers
                    } = this.state;
                    leftBuffers.push(left.slice(0));
                    rightBuffers.push(right.slice(0));
                };
            } else if (window.MediaRecorder) {
                // version #1 使用MediaRecorder
                try {
                    this.state.mediaRecorder = new MediaRecorder(mediaStream);
                    let {
                        mediaRecorder
                    } = this.state;
                    mediaRecorder.start();
                    this.state.isRecording = true;
                    this.state.chunks = [];
                    let {
                        chunks
                    } = this.state;
                    mediaRecorder.ondataavailable = function (e) {
                        chunks.push(e.data);
                    };
                    mediaRecorder.onstop = e => {
                        var blob = new Blob(chunks, {
                            type: 'audio/ogg; codecs=opus'
                        });
                        this.onStop && this.onStop(blob);
                        this.resetState();
                    };
                } catch(ex) {
                    alert('浏览器不支持录音API');
                }
                
            } else {
                alert('浏览器不支持录音API');
            }
        }).catch(function (err) {
            alert(err.name + ':' + err.message);
        });
    }

    resetState() {
        this.state = {
            mediaStream: null,
            isRecording: false,

            mediaRecorder: null,
            chunks: null,

            audioContext: null,
            sourceNode: null,
            scriptNode: null,
            leftBuffers: null,
            rightBuffers: null
        };
    }

    stop(onStopCallback) {
        let {
            mediaRecorder,
            sourceNode,
            scriptNode,
            mediaStream,
            leftBuffers,
            rightBuffers,
            audioContext,
            isRecording
        } = this.state;
        if (!isRecording) {
            return;
        }
        if (mediaRecorder) {
            this.onStop = onStopCallback;
            mediaRecorder.stop();
        } else if (sourceNode && scriptNode) {
            mediaStream.getAudioTracks()[0].stop();
            sourceNode.disconnect(scriptNode);
            scriptNode.disconnect(audioContext.destination);
            var left = mergeArray(leftBuffers);
            var right = mergeArray(rightBuffers);
            var buffers = interleaveBuffers(left, right);
            var wavBuffer = createWavFile(buffers);
            var blob = new Blob([new Uint8Array(wavBuffer)], {
                type: 'audio/wav'
            });
            buffers = [];
            // 清空状态
            this.resetState();

            onStopCallback && onStopCallback(blob);
        }
    }
}