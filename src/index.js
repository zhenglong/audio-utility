import {
    initWxScript 
} from 'init-wx';
import Recorder from './recorder';

const failHandler = (methodName) => {
    return () => {};
};

const tooShortMsg = '录音时间太短啦，请重新开始～';

const isweixin = navigator.userAgent.toLowerCase().indexOf('micromessenger') > -1;

export default class AudioUtility {
    constructor() {
        this._isBrigeReady = false;
        this._isH5AudioPlayOngoing = false;
        this._h5AudioCompleteCallback = null;
        this.audioElem = null;
    }

    isRecordingSupported() {
        return true;
    }

    startRecord() {
        this.resetH5Audio();
        if (!this._isBrigeReady) {
            return;
        }
        this.startRecord_();
    }
    stopRecord() {
        if (!this._isBrigeReady) {
            return Promise.resolve(null);
        }
        return this.stopRecord_();
    }

    resetH5Audio() {
        if (!this._isH5AudioPlayOngoing) {
            return;
        }
        this.audioElem.onended = null;
        this.audioElem.src = '';
        this._isH5AudioPlayOngoing = false;
        if (this._h5AudioCompleteCallback) {
            this._h5AudioCompleteCallback.call(null);
            this._h5AudioCompleteCallback = null;
        }
    }

    /**
     * 
     * 重新播放或继续播放
     * 
     * @param {String} url - 音频文件mp3的链接地址；如果传递此参数，则直接使用audio标签播放
     * @param {Function} onCompleteCallback - 当url有值时才生效，当音频播放完成时自动触发
     */
    playAudio(url, onCompleteCallback) {
        if (!url) {
            // 继续播放
            if (!this.audioElem) {
                return;
            }
            this.audioElem.play();
            return;
        } else {
            // 重新播放
            // 直接使用audio标签
            if (!this.audioElem) {
                this.audioElem = document.createElement('audio');
                this.audioElem.style.cssText = 'display:none';
                document.body.appendChild(this.audioElem);
            }
            this.audioElem.src = url;
            if (onCompleteCallback) {
                this._h5AudioCompleteCallback = onCompleteCallback;
                this.audioElem.onended = () => {
                    this._h5AudioCompleteCallback.call(null);
                    this.audioElem.onended = null;
                };
            }
            this.audioElem.play();
            this._isH5AudioPlayOngoing = true;
            return;
        }
        if (!this._isBrigeReady) {
            return;
        }
        this.playAudio_();
    }
    stopAudio() {
        if (this.audioElem) {
            // 直接使用audio控制音频
            this.audioElem.stop();
            return;
        }
        if (!this._isBrigeReady) {
            return;
        }
        this.stopAudio_();
    }
    pauseAudio() {
        if (this.audioElem) {
            // 直接使用audio控制音频
            this.audioElem.pause();
            return;
        }
        if (!this._isBrigeReady) {
            return;
        }
        this.pauseAudio_();
    }
    uploadAudio() {
        if (!this._isBrigeReady) {
            return;
        }
        return this.uploadAudio_();
    }

    startRecord_() {
        console.log('not implemented: startRecord');
    }
    stopRecord_() {
        console.log('not implemented: stopRecord');
    }
    playAudio_() {
        console.log('not implemented: playAudio');
    }
    stopAudio_() {
        console.log('not implemented: stopAudio');
    }
    pauseAudio_() {
        console.log('not implemented: pauseAudio');
    }
    uploadAudio_() {
        console.log('not implemented: uploadAudio');
    }
    static getInstance() {
        if (AudioUtility._instance) {
            return AudioUtility._instance;
        }
        AudioUtility._instance = (isweixin ? new WxAudioUtility() : new H5AudioUtility());
        return AudioUtility._instance;
    }
}
AudioUtility._instance = null;

class WxAudioUtility extends AudioUtility {

    constructor() {
        super();
        this._localId = null;
        initWxScript(() => {
            this._isBrigeReady = true;
        });
    }

    startRecord_() {
        wx.startRecord({
            fail: function (res) {
                alert(res.errMsg);
            }
        });
    }
    stopRecord_() {
        return new Promise((resolve, reject) => {
            wx.stopRecord({
                success: res => {
                    this._localId = res.localId;
                    resolve(res.localId);
                },
                fail: function(res) {
                    reject(res);
                }
            });
        });
    }
    playAudio_() {
        wx.playVoice({
            localId: this._localId
        });
    }
    stopAudio_() {
        wx.stopVoice({
            localId: this._localId
        });
    }
    pauseAudio_() {
        wx.pauseVoice({
            localId: this._localId
        });
    }
    uploadAudio_() {
        return new Promise((resolve, reject) => {
            wx.uploadVoice({
                localId: this._localId,
                success: function (res) {
                    resolve({
                        serverId: res.serverId
                    });
                },
                fail: function(res) {
                    reject(res);
                }
            });
        });
    }
}

class H5AudioUtility extends AudioUtility {
    constructor() {
        super();
        this.recorder = new Recorder();
        // 不依赖外部js，所以直接设置_isBridgeReady为true
        this._isBrigeReady = true;
    }

    isRecordingSupported() {
        return Recorder.isH5RecordingSupported();
    }

    startRecord_() {
        this.recorder.start();
    }

    stopRecord_() {
        return new Promise((resolve, reject) => {
            this.recorder.stop(blob => {
                resolve({blob});
            });
        });
    }
    playAudio_() {
        console.log('H5 only: playAudio');
    }
    stopAudio_() {
        console.log('H5 only: stopAudio');
    }
    pauseAudio_() {
        console.log('H5 only: pauseAudio');
    }
    uploadAudio_() {
        console.log('H5 only: nothing to do');
    }
}

window.AudioUtility = AudioUtility;