import {
    lazyLoadScript
} from './util';

const hjweixinUrl = 'https://res.wx.qq.com/open/js/jweixin-1.4.0.js';

const failHandler = (methodName) => {
    return res => {
        console.log(JSON.stringify(res));
    };
    // return () => {};
};

let isWxSdkLoading = false;
let isWxSdkLoaded = false;
let callbacks = [];

export function initWxScript(accesstokenUrl, cb) {
    // 如果微信sdk已经初始化了，直接执行回调函数
    if (isWxSdkLoaded) {
        cb && cb();
        return;
    }
    callbacks.push(cb);
    // 如果正在加载微信sdk，则把回调函数放到回调列表中，等wx.ready触发时统一执行
    if (isWxSdkLoading) {
        return;
    }
    isWxSdkLoading = true;
    lazyLoadScript(hjweixinUrl, () => {
        $.getJSON(accesstokenUrl, null, data => {
            wx.config({
                debug: true,
                appId: data.appId,
                timestamp: data.timeStamp,
                nonceStr: data.nonceStr,
                signature: data.signature,
                jsApiList: ["checkJsApi", "updateAppMessageShareData", "updateTimelineShareData", "onMenuShareWeibo", "onMenuShareQZone",
                    "hideMenuItems", "showMenuItems", "hideAllNonBaseMenuItem", "showAllNonBaseMenuItem", "translateVoice", "startRecord", "stopRecord", "onRecordEnd", "playVoice", "pauseVoice", "stopVoice", "uploadVoice", "downloadVoice", "chooseImage", "previewImage", "uploadImage", "downloadImage", "getNetworkType", "openLocation", "getLocation", "hideOptionMenu", "showOptionMenu", "closeWindow", "scanQRCode", "chooseWXPay", "openProductSpecificView", "addCard", "chooseCard", "openCard"
                ]
            });
            wx.ready(() => {
                isWxSdkLoading = false;
                isWxSdkLoaded = true;
                if (callbacks.length) {
                    for (let i = 0; i < callbacks.length; i++) {
                        callbacks[i]();
                    }
                }
            });
            wx.error(failHandler('config'));
        });
    });
}
