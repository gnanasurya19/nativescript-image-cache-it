"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var common = require("./image-cache-it.common");
var image_cache_it_common_1 = require("./image-cache-it.common");
var fs = require("@nativescript/core/file-system");
var types = require("@nativescript/core/utils/types");
var app = require("@nativescript/core/application");
var image_source_1 = require("@nativescript/core/image-source");
var background_1 = require("@nativescript/core/ui/styling/background");
var color_1 = require("@nativescript/core/color");
var image_asset_1 = require("@nativescript/core/image-asset");
global.moduleMerge(common, exports);
var ImageLoadedListener;
function initializeImageLoadedListener() {
    if (ImageLoadedListener) {
        return;
    }
    var ImageLoadedListenerImpl = (function (_super) {
        __extends(ImageLoadedListenerImpl, _super);
        function ImageLoadedListenerImpl(owner) {
            var _this = _super.call(this) || this;
            _this.owner = owner;
            return global.__native(_this);
        }
        ImageLoadedListenerImpl.prototype.onImageLoaded = function (success) {
            var owner = this.owner;
            if (owner) {
                owner.isLoading = false;
            }
        };
        ImageLoadedListenerImpl = __decorate([
            Interfaces([org.nativescript.widgets.image.Worker.OnImageLoadedListener]),
            __metadata("design:paramtypes", [Object])
        ], ImageLoadedListenerImpl);
        return ImageLoadedListenerImpl;
    }(java.lang.Object));
    ImageLoadedListener = ImageLoadedListenerImpl;
}
var ImageCacheIt = (function (_super) {
    __extends(ImageCacheIt, _super);
    function ImageCacheIt() {
        var _this = _super.call(this) || this;
        _this.emptyBackground = new background_1.Background();
        return _this;
    }
    ImageCacheIt.prototype.createNativeView = function () {
        return new com.github.triniwiz.imagecacheit.ImageView(this._context, null);
    };
    Object.defineProperty(ImageCacheIt, "maxDiskCacheSize", {
        get: function () {
            return com.github.triniwiz.imagecacheit.MyAppGlideModule.getMaxDiskCacheSize();
        },
        set: function (size) {
            com.github.triniwiz.imagecacheit.MyAppGlideModule.setMaxDiskCacheSize(size);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ImageCacheIt, "maxMemoryCacheSize", {
        get: function () {
            return com.github.triniwiz.imagecacheit.MyAppGlideModule.getMaxMemoryCacheSize();
        },
        set: function (size) {
            com.github.triniwiz.imagecacheit.MyAppGlideModule.setMaxMemoryCacheSize(size);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ImageCacheIt, "maxDiskCacheAge", {
        get: function () {
            return com.github.triniwiz.imagecacheit.MyAppGlideModule.getMaxDiskCacheAge();
        },
        set: function (age) {
            com.github.triniwiz.imagecacheit.MyAppGlideModule.setMaxDiskCacheAge(age);
        },
        enumerable: true,
        configurable: true
    });
    ImageCacheIt.prototype.initNativeView = function () {
        initializeImageLoadedListener();
        var nativeView = this.nativeViewProtected;
        var listener = new ImageLoadedListener(this);
        nativeView.setImageLoadedListener(listener);
        nativeView.listener = listener;
        var ref = new WeakRef(this);
        this._setOverlayColor(this.overlayColor);
        this.nativeView.setProgressListener(new com.github.triniwiz.imagecacheit.ProgressListener({
            onProgress: function (loaded, total, progress, url) {
                var owner = ref.get();
                if (owner) {
                    owner._emitProgressEvent(loaded, total, progress, url);
                }
            }
        }));
        this.nativeView.setEventsListener(new com.github.triniwiz.imagecacheit.EventsListener({
            onLoadStart: function () {
                var owner = ref.get();
                if (owner) {
                    owner._emitLoadStartEvent(owner.src);
                }
            },
            onLoadError: function (message) {
                var owner = ref.get();
                if (owner) {
                    owner._emitErrorEvent(message, owner.src);
                }
            },
            onLoadedEnd: function (image) {
                var owner = ref.get();
                if (owner) {
                    owner._emitLoadEndEvent(owner.src, image);
                }
            }
        }));
        this._setHeaders(this.headers);
        if (this.placeHolder) {
            ImageCacheIt._setPlaceHolder(this._context, this.placeHolder, this.nativeView);
        }
        if (this.errorHolder) {
            ImageCacheIt._setErrorHolder(this._context, this.errorHolder, this.nativeView);
        }
        if (this.fallback) {
            ImageCacheIt._setFallback(this._context, this.fallback, this.nativeView);
        }
        if (this.filter) {
            ImageCacheIt._setFilter(this.filter, this.nativeView);
        }
        if (this.stretch) {
            this._setStretch(this.stretch);
        }
        var image = ImageCacheIt.getImage(this._context, this.src);
        var decodeWidth = 0;
        var decodeHeight = 0;
        var keepAspectRatio = this._calculateKeepAspectRatio();
        if (types.isString(image) && this.nativeView) {
            this.nativeView.setSource(android.net.Uri.parse(image), decodeWidth, decodeHeight, keepAspectRatio, false, true);
        }
        else if (types.isNumber(image) || image instanceof java.lang.Integer) {
            this.nativeView.setSource(image, decodeWidth, decodeHeight, keepAspectRatio, false, true);
        }
        else if (image instanceof java.io.File) {
            this.nativeView.setSource(android.net.Uri.parse(image.getAbsolutePath()), decodeWidth, decodeHeight, keepAspectRatio, false, true);
        }
        else {
            if (this.src instanceof image_asset_1.ImageAsset) {
                keepAspectRatio = !!this.src.options.keepAspectRatio;
            }
            this.nativeView.setSource(image, decodeWidth, decodeHeight, keepAspectRatio, false, true);
        }
    };
    ImageCacheIt.prototype._calculateKeepAspectRatio = function () {
        return this.stretch !== 'fill';
    };
    ImageCacheIt.prototype.disposeNativeView = function () {
        _super.prototype.disposeNativeView.call(this);
    };
    ImageCacheIt.prototype.resetNativeView = function () {
        _super.prototype.resetNativeView.call(this);
        this.nativeViewProtected.setImageMatrix(new android.graphics.Matrix());
    };
    ImageCacheIt.prototype[image_cache_it_common_1.filterProperty.setNative] = function (filter) {
        if (this.nativeView) {
            this.nativeView.setFilter(filter);
        }
    };
    ImageCacheIt.prototype._setOverlayColor = function (overlay) {
        if (!this.nativeViewProtected) {
            return;
        }
        if (overlay instanceof color_1.Color) {
            this.nativeViewProtected.setOverlayColor(overlay.android);
        }
        else if (typeof overlay === 'string') {
            this.nativeViewProtected.setOverlayColor(new color_1.Color(overlay).android);
        }
    };
    ImageCacheIt.prototype[image_cache_it_common_1.overlayColorProperty.setNative] = function (overlay) {
        this._setOverlayColor(overlay);
    };
    ImageCacheIt.isNumber = function (value) {
        return typeof value === 'number';
    };
    ImageCacheIt.getResourceId = function (context, res) {
        if (res === void 0) { res = ''; }
        if (!context)
            return java.lang.Integer.valueOf(0);
        if (types.isString(res) && res.startsWith('res://')) {
            var packageName = context.getPackageName();
            try {
                var className = java.lang.Class.forName(packageName + ".R$drawable");
                return java.lang.Integer.valueOf(parseInt(String(className.getDeclaredField(res.replace('res://', '')).get(null))));
            }
            catch (e) {
                return java.lang.Integer.valueOf(0);
            }
        }
        return java.lang.Integer.valueOf(0);
    };
    ImageCacheIt._setFallback = function (context, fallback, nativeView) {
        var holder = ImageCacheIt.getImage(context, fallback);
        if (nativeView) {
            if (types.isString(fallback) && fallback.startsWith('res://')) {
                nativeView.setFallbackImage(fallback);
            }
            else {
                nativeView.setFallbackImage(holder);
            }
        }
    };
    ImageCacheIt.prototype[common.fallbackProperty.setNative] = function (fallback) {
        ImageCacheIt._setFallback(this._context, fallback, this.nativeView);
    };
    ImageCacheIt._setPlaceHolder = function (context, placeHolder, nativeView) {
        var holder = ImageCacheIt.getImage(context, placeHolder);
        if (nativeView) {
            if (types.isString(placeHolder) && placeHolder.startsWith('res://')) {
                nativeView.setPlaceHolder(placeHolder);
            }
            else {
                nativeView.setPlaceHolder(holder);
            }
        }
    };
    ImageCacheIt.prototype[common.placeHolderProperty.setNative] = function (placeHolder) {
        ImageCacheIt._setPlaceHolder(this._context, placeHolder, this.nativeView);
    };
    ImageCacheIt._setErrorHolder = function (context, errorHolder, nativeView) {
        var holder = ImageCacheIt.getImage(context, errorHolder);
        if (nativeView) {
            if (types.isString(errorHolder) && errorHolder.startsWith('res://')) {
                nativeView.setErrorHolder(errorHolder);
            }
            else {
                nativeView.setErrorHolder(holder);
            }
        }
    };
    ImageCacheIt.prototype[common.errorHolderProperty.setNative] = function (errorHolder) {
        ImageCacheIt._setErrorHolder(this._context, errorHolder, this.nativeView);
    };
    ImageCacheIt.prototype[common.srcProperty.getDefault] = function () {
        return undefined;
    };
    ImageCacheIt._setSrc = function (context, src, nativeView, base) {
        var image = ImageCacheIt.getImage(context, src);
        if (nativeView) {
            var decodeWidth = 0;
            var decodeHeight = 0;
            var keepAspectRatio = base._calculateKeepAspectRatio();
            if (types.isString(image)) {
                nativeView.setSource(android.net.Uri.parse(image), decodeWidth, decodeHeight, keepAspectRatio, false, true);
            }
            else if (types.isNumber(image) || image instanceof java.lang.Integer) {
                nativeView.setSource(image, decodeWidth, decodeHeight, keepAspectRatio, false, true);
            }
            else if (image instanceof java.io.File) {
                nativeView.setSource(image, decodeWidth, decodeHeight, keepAspectRatio, false, true);
            }
            else {
                nativeView.setSource(image, decodeWidth, decodeHeight, keepAspectRatio, false, true);
            }
        }
    };
    ImageCacheIt.prototype[common.srcProperty.setNative] = function (src) {
        ImageCacheIt._setSrc(this._context, src, this.nativeView, this);
    };
    ImageCacheIt.prototype[common.priorityProperty.getDefault] = function () {
        return common.Priority.Normal;
    };
    ImageCacheIt.prototype[common.priorityProperty.setNative] = function (value) {
        if (!this.nativeView)
            return;
        switch (value) {
            case common.Priority.High:
                this.nativeView.setPriority(com.github.triniwiz.imagecacheit.ImageView.Priority.High);
                break;
            case common.Priority.Low:
                this.nativeView.setPriority(com.github.triniwiz.imagecacheit.ImageView.Priority.Low);
                break;
            default:
                this.nativeView.setPriority(com.github.triniwiz.imagecacheit.ImageView.Priority.Normal);
                break;
        }
    };
    ImageCacheIt.prototype[common.tintColorProperty.getDefault] = function () {
        return undefined;
    };
    ImageCacheIt.prototype[common.tintColorProperty.setNative] = function (value) {
        if (!value) {
            this.nativeView.clearColorFilter();
        }
        else {
            this.nativeView.setColorFilter(value.android);
        }
    };
    ImageCacheIt.prototype[common.headersProperty.getDefault] = function () {
        return new Map();
    };
    ImageCacheIt.prototype._setHeaders = function (value) {
        var headers = new java.util.HashMap();
        if (value) {
            value.forEach(function (value, key) {
                headers.put(key, value);
            });
        }
        if (this.nativeView) {
            this.nativeView.setHeaders(headers);
        }
    };
    ImageCacheIt.prototype[common.headersProperty.setNative] = function (value) {
        this._setHeaders(value);
    };
    ImageCacheIt.getImage = function (context, src) {
        var nativeImage = null;
        if (types.isNullOrUndefined(src)) {
            return null;
        }
        if (types.isString(src)) {
            if (src.substr(0, 1) === '/') {
                nativeImage = new java.io.File(src);
            }
            else if (src.startsWith('~/')) {
                nativeImage = new java.io.File(fs.path.join(fs.knownFolders.currentApp().path, src.replace('~/', '')));
            }
            else if (src.startsWith('http')) {
                nativeImage = src;
            }
            else if (src.startsWith('res://')) {
                nativeImage = this.getResourceId(context, src);
            }
        }
        else if (src instanceof image_source_1.ImageSource || src instanceof image_asset_1.ImageAsset) {
            nativeImage = src.android;
        }
        else {
            nativeImage = src;
        }
        return nativeImage;
    };
    ImageCacheIt._setFilter = function (filter, nativeView) {
        if (nativeView) {
            nativeView.setFilter(filter);
        }
    };
    ImageCacheIt.prototype[common.filterProperty.setNative] = function (filter) {
        ImageCacheIt._setFilter(filter, this.nativeView);
    };
    ImageCacheIt.prototype[common.stretchProperty.getDefault] = function () {
        return 'aspectFit';
    };
    ImageCacheIt.prototype._setStretch = function (value) {
        if (this.nativeView) {
            switch (value) {
                case 'aspectFit':
                    this.nativeView.setScaleType(android.widget.ImageView.ScaleType.FIT_CENTER);
                    break;
                case 'aspectFill':
                    this.nativeView.setScaleType(android.widget.ImageView.ScaleType.CENTER_CROP);
                    break;
                case 'fill':
                    this.nativeView.setScaleType(android.widget.ImageView.ScaleType.FIT_XY);
                    break;
                case 'none':
                default:
                    this.nativeView.setScaleType(android.widget.ImageView.ScaleType.MATRIX);
                    break;
            }
        }
    };
    ImageCacheIt.prototype[common.stretchProperty.setNative] = function (value) {
        this._setStretch(value);
    };
    ImageCacheIt.getItem = function (src) {
        com.github.triniwiz.imagecacheit.ImageCache.init(app.android.context);
        return new Promise(function (resolve, reject) {
            com.github.triniwiz.imagecacheit.ImageCache.getItem(src, null, new com.github.triniwiz.imagecacheit.ImageCache.Callback({
                onSuccess: function (value) {
                    resolve(value);
                },
                onError: function (error) {
                    reject(error.getMessage());
                }
            }));
        });
    };
    ImageCacheIt.deleteItem = function (src) {
        return new Promise(function (resolve, reject) {
            resolve();
        });
    };
    ImageCacheIt.hasItem = function (src) {
        com.github.triniwiz.imagecacheit.ImageCache.init(app.android.context);
        return new Promise(function (resolve, reject) {
            com.github.triniwiz.imagecacheit.ImageCache.hasItem(src, new com.github.triniwiz.imagecacheit.ImageCache.Callback({
                onSuccess: function (value) {
                    resolve();
                },
                onError: function (error) {
                    reject(error.getMessage());
                }
            }));
        });
    };
    ImageCacheIt.clear = function () {
        com.github.triniwiz.imagecacheit.ImageCache.init(app.android.context);
        return new Promise(function (resolve, reject) {
            com.github.triniwiz.imagecacheit.ImageCache.clear();
            resolve();
        });
    };
    ImageCacheIt.enableAutoMM = function () {
        com.github.triniwiz.imagecacheit.ImageView.enableAutoMM(app.android.nativeApp);
    };
    ImageCacheIt.disableAutoMM = function () {
        com.github.triniwiz.imagecacheit.ImageView.disableAutoMM(app.android.nativeApp);
    };
    return ImageCacheIt;
}(image_cache_it_common_1.ImageCacheItBase));
exports.ImageCacheIt = ImageCacheIt;
//# sourceMappingURL=image-cache-it.android.js.map