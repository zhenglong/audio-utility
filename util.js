export const getTemplate = cacheable(function (id, __cache__) {
    if (!__cache__[id]) {
        __cache__[id] = $(`#${id}`).html();
    }
    return __cache__[id];
});

export const lazyLoadScript = cacheable(function (src, cb, __cache__) {
    if (typeof cb != 'function') {
        __cache__ = cb;
        cb = null;
    }
    if (__cache__[src]) {
        cb && cb();
        return;
    }
    let scriptElem = document.createElement('script');
    scriptElem.type = 'text/javascript';
    scriptElem.src = src;
    scriptElem.onload = function () {
        __cache__[src] = true;
        cb && cb();
    };
    document.getElementsByTagName('body')[0].appendChild(scriptElem);
});