"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
var view_1 = require("@nativescript/core/ui/core/view");
var color_1 = require("@nativescript/core/color");
var core_1 = require("@nativescript/core");
var utils_1 = require("@nativescript/core/utils/utils");
var Transition;
(function (Transition) {
    Transition["Fade"] = "fade";
    Transition["None"] = "none";
})(Transition = exports.Transition || (exports.Transition = {}));
var Priority;
(function (Priority) {
    Priority[Priority["Low"] = 0] = "Low";
    Priority[Priority["Normal"] = 1] = "Normal";
    Priority[Priority["High"] = 2] = "High";
})(Priority = exports.Priority || (exports.Priority = {}));
exports.progressProperty = new view_1.Property({
    name: 'progress',
    defaultValue: 0
});
exports.loadModeProperty = new view_1.Property({
    name: 'loadMode',
    defaultValue: 'async',
});
exports.imageSourceProperty = new view_1.Property({
    name: 'imageSource',
});
exports.srcProperty = new view_1.Property({
    name: 'src',
});
exports.placeHolderProperty = new view_1.Property({
    name: 'placeHolder'
});
exports.errorHolderProperty = new view_1.Property({
    name: 'errorHolder'
});
exports.stretchProperty = new view_1.Property({
    name: 'stretch',
    affectsLayout: core_1.isIOS,
});
exports.filterProperty = new view_1.CssProperty({
    name: 'filter',
    cssName: 'filter'
});
exports.transitionProperty = new view_1.Property({
    name: 'transition',
    defaultValue: Transition.None
});
exports.fallbackProperty = new view_1.Property({
    name: 'fallback',
});
exports.priorityProperty = new view_1.Property({
    name: 'priority',
    defaultValue: Priority.Normal
});
exports.tintColorProperty = new view_1.InheritedCssProperty({
    name: 'tintColor',
    cssName: 'tint-color',
    equalityComparer: color_1.Color.equals, valueConverter: function (value) { return new color_1.Color(value); }
});
exports.overlayColorProperty = new view_1.InheritedCssProperty({
    name: 'overLayColor',
    cssName: 'overlay-color',
    equalityComparer: color_1.Color.equals, valueConverter: function (value) { return new color_1.Color(value); }
});
exports.headersProperty = new view_1.Property({
    name: 'headers'
});
exports.isLoadingProperty = new view_1.Property({
    name: 'isLoading',
    defaultValue: false,
    valueConverter: view_1.booleanConverter,
});
__export(require("@nativescript/core/ui/core/view"));
var ImageCacheItBase = (function (_super) {
    __extends(ImageCacheItBase, _super);
    function ImageCacheItBase() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ImageCacheItBase_1 = ImageCacheItBase;
    Object.defineProperty(ImageCacheItBase.prototype, "tintColor", {
        get: function () {
            return this.style.tintColor;
        },
        set: function (value) {
            if (typeof value === 'string') {
                this.style.tintColor = new color_1.Color(value);
            }
            else {
                this.style.tintColor = value;
            }
        },
        enumerable: true,
        configurable: true
    });
    ImageCacheItBase.prototype._emitLoadStartEvent = function (url) {
        this.notify({
            eventName: ImageCacheItBase_1.onLoadStartEvent,
            object: this
        });
    };
    ImageCacheItBase.prototype._emitProgressEvent = function (loaded, total, progress, url) {
        this.notify({
            eventName: ImageCacheItBase_1.onProgressEvent,
            object: this,
            loaded: loaded,
            total: total,
            progress: progress,
            url: url
        });
    };
    ImageCacheItBase.prototype._emitErrorEvent = function (message, url) {
        this.notify({
            eventName: ImageCacheItBase_1.onLoadStartEvent,
            object: this,
            message: message
        });
    };
    ImageCacheItBase.prototype._emitLoadEndEvent = function (url, image) {
        this.notify({
            eventName: ImageCacheItBase_1.onLoadEndEvent,
            object: this,
            image: image
        });
    };
    ImageCacheItBase.prototype._createImageSourceFromSrc = function (value) {
        var _this = this;
        var originalValue = value;
        var sync = this.loadMode === 'sync';
        if (typeof value === 'string' || value instanceof String) {
            value = value.trim();
            this.imageSource = null;
            this['_url'] = value;
            this.isLoading = true;
            var imageLoaded = function (source) {
                var currentValue = _this.src;
                if (currentValue !== originalValue) {
                    return;
                }
                _this.imageSource = source;
                _this.isLoading = false;
            };
            if (utils_1.isFontIconURI(value)) {
                var fontIconCode = value.split('//')[1];
                if (fontIconCode !== undefined) {
                    var font = this.style.fontInternal;
                    var color = this.style.color;
                    imageLoaded(core_1.ImageSource.fromFontIconCodeSync(fontIconCode, font, color));
                }
            }
            else if (utils_1.isDataURI(value)) {
                var base64Data = value.split(',')[1];
                if (base64Data !== undefined) {
                    if (sync) {
                        imageLoaded(core_1.ImageSource.fromBase64Sync(base64Data));
                    }
                    else {
                        core_1.ImageSource.fromBase64(base64Data).then(imageLoaded);
                    }
                }
            }
            else if (utils_1.isFileOrResourcePath(value)) {
                if (value.indexOf(utils_1.RESOURCE_PREFIX) === 0) {
                    var resPath = value.substr(utils_1.RESOURCE_PREFIX.length);
                    if (sync) {
                        imageLoaded(core_1.ImageSource.fromResourceSync(resPath));
                    }
                    else {
                        this.imageSource = null;
                        core_1.ImageSource.fromResource(resPath).then(imageLoaded);
                    }
                }
                else {
                    if (sync) {
                        imageLoaded(core_1.ImageSource.fromFileSync(value));
                    }
                    else {
                        this.imageSource = null;
                        core_1.ImageSource.fromFile(value).then(imageLoaded);
                    }
                }
            }
            else {
                this.imageSource = null;
                core_1.ImageSource.fromUrl(value).then(function (r) {
                    if (_this['_url'] === value) {
                        _this.imageSource = r;
                        _this.isLoading = false;
                    }
                }, function (err) {
                    _this.isLoading = false;
                    if (core_1.Trace.isEnabled()) {
                        if (typeof err === 'object' && err.message) {
                            err = err.message;
                        }
                        core_1.Trace.write(err, core_1.Trace.categories.Debug);
                    }
                });
            }
        }
        else if (value instanceof core_1.ImageSource) {
            this.imageSource = value;
            this.isLoading = false;
        }
        else if (value instanceof core_1.ImageAsset) {
            core_1.ImageSource.fromAsset(value).then(function (result) {
                _this.imageSource = result;
                _this.isLoading = false;
            });
        }
        else {
            this.imageSource = new core_1.ImageSource(value);
            this.isLoading = false;
        }
    };
    var ImageCacheItBase_1;
    ImageCacheItBase.onLoadStartEvent = 'loadStart';
    ImageCacheItBase.onProgressEvent = 'progress';
    ImageCacheItBase.onErrorEvent = 'error';
    ImageCacheItBase.onLoadEndEvent = 'loadEnd';
    ImageCacheItBase = ImageCacheItBase_1 = __decorate([
        view_1.CSSType('ImageCacheIt')
    ], ImageCacheItBase);
    return ImageCacheItBase;
}(view_1.View));
exports.ImageCacheItBase = ImageCacheItBase;
exports.progressProperty.register(ImageCacheItBase);
exports.isLoadingProperty.register(ImageCacheItBase);
exports.loadModeProperty.register(ImageCacheItBase);
exports.imageSourceProperty.register(ImageCacheItBase);
exports.srcProperty.register(ImageCacheItBase);
exports.placeHolderProperty.register(ImageCacheItBase);
exports.errorHolderProperty.register(ImageCacheItBase);
exports.stretchProperty.register(ImageCacheItBase);
exports.filterProperty.register(view_1.Style);
exports.transitionProperty.register(ImageCacheItBase);
exports.fallbackProperty.register(ImageCacheItBase);
exports.priorityProperty.register(ImageCacheItBase);
exports.tintColorProperty.register(view_1.Style);
exports.headersProperty.register(ImageCacheItBase);
exports.overlayColorProperty.register(view_1.Style);
//# sourceMappingURL=image-cache-it.common.js.map