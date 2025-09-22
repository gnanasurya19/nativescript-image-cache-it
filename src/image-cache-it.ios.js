"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
var common = require("./image-cache-it.common");
var image_cache_it_common_1 = require("./image-cache-it.common");
var view_1 = require("@nativescript/core/ui/core/view");
var file_system_1 = require("@nativescript/core/file-system");
var types_1 = require("@nativescript/core/utils/types");
var style_properties_1 = require("@nativescript/core/ui/styling/style-properties");
var app = require("@nativescript/core/application");
var platform = require("@nativescript/core/platform");
var image_source_1 = require("@nativescript/core/image-source");
var core_1 = require("@nativescript/core");
var utils_1 = require("@nativescript/core/utils/utils");
__export(require("./image-cache-it.common"));
var main_queue = dispatch_get_current_queue();
var concurrentQueue;
var ImageCacheIt = (function (_super) {
    __extends(ImageCacheIt, _super);
    function ImageCacheIt() {
        var _this = _super.call(this) || this;
        _this._imageSourceAffectsLayout = true;
        _this._priority = 0;
        _this._loadStarted = false;
        return _this;
    }
    Object.defineProperty(ImageCacheIt, "maxDiskCacheSize", {
        get: function () {
            return SDImageCache.sharedImageCache.config.maxDiskSize;
        },
        set: function (size) {
            SDImageCache.sharedImageCache.config.maxDiskSize = size;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ImageCacheIt, "maxMemoryCacheSize", {
        get: function () {
            return SDImageCache.sharedImageCache.config.maxMemoryCost;
        },
        set: function (size) {
            SDImageCache.sharedImageCache.config.maxMemoryCost = size;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ImageCacheIt, "maxDiskCacheAge", {
        get: function () {
            return SDImageCache.sharedImageCache.config.maxDiskAge;
        },
        set: function (age) {
            SDImageCache.sharedImageCache.config.maxDiskAge = age;
        },
        enumerable: true,
        configurable: true
    });
    ImageCacheIt.prototype.createNativeView = function () {
        this.uuid = NSUUID.UUID().UUIDString;
        this.filterQueue = ImageCacheItUtils.createConcurrentQueue('TNSImageOptimizeQueue');
        if (!ImageCacheIt.hasModifier) {
            SDWebImageDownloader.sharedDownloader.requestModifier = SDWebImageDownloaderRequestModifier.requestModifierWithBlock(function (request) {
                if (request && request.URL && request.URL.uuid && ImageCacheIt.cacheHeaders[request.URL.uuid]) {
                    var cachedHeader = ImageCacheIt.cacheHeaders[request.URL.uuid];
                    if (cachedHeader.url === request.URL.absoluteString) {
                        var newRequest_1 = request.mutableCopy();
                        if (cachedHeader.headers) {
                            cachedHeader.headers.forEach((function (value, key) {
                                newRequest_1.addValueForHTTPHeaderField(value, key);
                            }));
                        }
                        return newRequest_1.copy();
                    }
                }
                return request;
            });
            ImageCacheIt.hasModifier = true;
        }
        var nativeView = SDAnimatedImageView.new();
        nativeView.contentMode = 1;
        nativeView.userInteractionEnabled = true;
        nativeView.clipsToBounds = true;
        var metalDevice = MTLCreateSystemDefaultDevice() || null;
        if (metalDevice) {
            this.ctx = CIContext.contextWithMTLDevice(metalDevice);
        }
        else {
            var context = EAGLContext.alloc().initWithAPI(3);
            if (!context) {
                context = EAGLContext.alloc().initWithAPI(2);
            }
            if (context) {
                this.ctx = CIContext.contextWithEAGLContext(context);
            }
            else {
                this.ctx = new CIContext(null);
            }
        }
        return nativeView;
    };
    ImageCacheIt.prototype.initNativeView = function () {
        _super.prototype.initNativeView.call(this);
        this._setNativeClipToBounds();
    };
    ImageCacheIt.prototype._setNativeClipToBounds = function () {
        this.nativeView.clipsToBounds = true;
    };
    ImageCacheIt.prototype.onMeasure = function (widthMeasureSpec, heightMeasureSpec) {
        var width = view_1.layout.getMeasureSpecSize(widthMeasureSpec);
        var widthMode = view_1.layout.getMeasureSpecMode(widthMeasureSpec);
        var height = view_1.layout.getMeasureSpecSize(heightMeasureSpec);
        var heightMode = view_1.layout.getMeasureSpecMode(heightMeasureSpec);
        var nativeWidth = this.imageSource ? view_1.layout.toDevicePixels(this.imageSource.width) : 0;
        var nativeHeight = this.imageSource ? view_1.layout.toDevicePixels(this.imageSource.height) : 0;
        var measureWidth = Math.max(nativeWidth, this.effectiveMinWidth);
        var measureHeight = Math.max(nativeHeight, this.effectiveMinHeight);
        var finiteWidth = widthMode !== view_1.layout.UNSPECIFIED;
        var finiteHeight = heightMode !== view_1.layout.UNSPECIFIED;
        this._imageSourceAffectsLayout = widthMode !== view_1.layout.EXACTLY || heightMode !== view_1.layout.EXACTLY;
        if (nativeWidth !== 0 && nativeHeight !== 0 && (finiteWidth || finiteHeight)) {
            var scale = ImageCacheIt.computeScaleFactor(width, height, finiteWidth, finiteHeight, nativeWidth, nativeHeight, this.stretch);
            var resultW = Math.round(nativeWidth * scale.width);
            var resultH = Math.round(nativeHeight * scale.height);
            measureWidth = finiteWidth ? Math.min(resultW, width) : resultW;
            measureHeight = finiteHeight ? Math.min(resultH, height) : resultH;
            if (core_1.Trace.isEnabled()) {
                core_1.Trace.write('ImageCacheIt stretch: ' + this.stretch + ', nativeWidth: ' + nativeWidth + ', nativeHeight: ' + nativeHeight, core_1.Trace.categories.Layout);
            }
        }
        var widthAndState = ImageCacheIt.resolveSizeAndState(measureWidth, width, widthMode, 0);
        var heightAndState = ImageCacheIt.resolveSizeAndState(measureHeight, height, heightMode, 0);
        this.setMeasuredDimension(widthAndState, heightAndState);
    };
    ImageCacheIt.computeScaleFactor = function (measureWidth, measureHeight, widthIsFinite, heightIsFinite, nativeWidth, nativeHeight, imageStretch) {
        var scaleW = 1;
        var scaleH = 1;
        if ((imageStretch === 'aspectFill' || imageStretch === 'aspectFit' || imageStretch === 'fill') && (widthIsFinite || heightIsFinite)) {
            scaleW = nativeWidth > 0 ? measureWidth / nativeWidth : 0;
            scaleH = nativeHeight > 0 ? measureHeight / nativeHeight : 0;
            if (!widthIsFinite) {
                scaleW = scaleH;
            }
            else if (!heightIsFinite) {
                scaleH = scaleW;
            }
            else {
                switch (imageStretch) {
                    case 'aspectFit':
                        scaleH = scaleW < scaleH ? scaleW : scaleH;
                        scaleW = scaleH;
                        break;
                    case 'aspectFill':
                        scaleH = scaleW > scaleH ? scaleW : scaleH;
                        scaleW = scaleH;
                        break;
                }
            }
        }
        return { width: scaleW, height: scaleH };
    };
    ImageCacheIt.prototype[common.headersProperty.getDefault] = function () {
        return new Map();
    };
    ImageCacheIt.prototype[common.headersProperty.setNative] = function (value) {
        if (this.uuid) {
            var data = ImageCacheIt.cacheHeaders[this.uuid] || { url: undefined, headers: undefined };
            data.headers = value;
            ImageCacheIt.cacheHeaders[this.uuid] = data;
        }
    };
    ImageCacheIt.prototype._handlePlaceholder = function (src) {
        var placeHolder = null;
        if (typeof src === 'string') {
            try {
                if (utils_1.isFileOrResourcePath(src)) {
                    if (src.indexOf(utils_1.RESOURCE_PREFIX) === 0) {
                        var resPath = src.substr(utils_1.RESOURCE_PREFIX.length);
                        placeHolder = image_source_1.ImageSource.fromResourceSync(resPath);
                    }
                    else {
                        placeHolder = image_source_1.ImageSource.fromFileSync(src);
                    }
                }
                else if (utils_1.isDataURI(src)) {
                    var base64Data = src.split(',')[1];
                    if (base64Data !== undefined) {
                        placeHolder = image_source_1.ImageSource.fromBase64Sync(base64Data);
                    }
                }
                else if (utils_1.isFontIconURI(src)) {
                    var fontIconCode = src.split('//')[1];
                    if (fontIconCode !== undefined) {
                        var font = this.style.fontInternal;
                        var color = this.style.color;
                        placeHolder = image_source_1.ImageSource.fromFontIconCodeSync(fontIconCode, font, color);
                    }
                }
                placeHolder = placeHolder && placeHolder.ios;
            }
            catch (err) {
                this.isLoading = false;
                if (core_1.Trace.isEnabled()) {
                    if (typeof err === 'object' && err.message) {
                        err = err.message;
                    }
                    core_1.Trace.write(err, core_1.Trace.categories.Debug);
                }
            }
        }
        else if (src instanceof UIImage) {
            placeHolder = src;
        }
        else if (src instanceof image_source_1.ImageSource) {
            placeHolder = src.ios;
        }
        return placeHolder;
    };
    ImageCacheIt.prototype._loadImage = function (src) {
        return __awaiter(this, void 0, void 0, function () {
            var ref, options, context, placeHolder, url;
            var _this = this;
            return __generator(this, function (_a) {
                this._loadStarted = true;
                this.progress = 0;
                ref = new WeakRef(this);
                if (this.nativeView && this.nativeView.sd_cancelCurrentImageLoad) {
                    this.nativeView.sd_cancelCurrentImageLoad();
                }
                options = 1024 | 1 | 2048 | this._priority;
                this.isLoading = true;
                context = {};
                placeHolder = this._handlePlaceholder(this.placeHolder);
                url = NSURL.URLWithString(src);
                if (!url) {
                    this._handleFallbackImage();
                    return [2];
                }
                url.uuid = this.uuid;
                this.nativeView.sd_setImageWithURLPlaceholderImageOptionsContextProgressCompleted(url, placeHolder, options, context, function (p1, p2, p3) {
                    var owner = ref.get();
                    if (owner) {
                        var progress_1 = 0;
                        if (p2 !== 0) {
                            progress_1 = p1 / p2;
                        }
                        else {
                            progress_1 = 1;
                        }
                        progress_1 = Math.max(Math.min(progress_1, 1), 0) * 100;
                        dispatch_async(main_queue, function () {
                            if (!owner._loadStarted) {
                                owner._emitLoadStartEvent(p3.absoluteString);
                                owner._loadStarted = true;
                            }
                            owner.progress = progress_1;
                            owner._emitProgressEvent(p1, p2, progress_1, p3.absoluteString);
                        });
                    }
                }, function (p1, p2, p3, p4) {
                    var owner = ref.get();
                    if (owner) {
                        owner.isLoading = false;
                        if (p2) {
                            owner._emitErrorEvent(p2.localizedDescription, p4.absoluteString);
                            owner._emitLoadEndEvent(p4.absoluteString);
                            if (owner.errorHolder) {
                                var errorHolder = _this._handlePlaceholder(_this.errorHolder);
                                owner.imageSource = new image_source_1.ImageSource(errorHolder);
                                owner.nativeView.image = errorHolder;
                                owner.setTintColor(owner.style.tintColor);
                            }
                        }
                        else if (p3 !== SDImageCacheType.Memory && owner.transition) {
                            switch (owner.transition) {
                                case 'fade':
                                    owner.nativeView.alpha = 0;
                                    UIView.animateWithDurationAnimations(1, function () {
                                        owner.nativeView.alpha = 1;
                                    });
                                    break;
                                default:
                                    break;
                            }
                        }
                        if (p1) {
                            if (p1 instanceof SDAnimatedImage) {
                                var source = new image_source_1.ImageSource();
                                source.ios = p1;
                                _this._createImageSourceFromSrc(source);
                            }
                            else {
                                dispatch_async(_this.filterQueue, function () {
                                    if (_this.getMeasuredWidth() === 0 || _this.getMeasuredHeight() === 0) {
                                        _this._createImageSourceFromSrc(new image_source_1.ImageSource(p1));
                                    }
                                    else {
                                        var resize = 1;
                                        switch (_this.stretch) {
                                            case "none":
                                            case "aspectFit":
                                                resize = 1;
                                                break;
                                            case "aspectFill":
                                                resize = 2;
                                                break;
                                            case "fill":
                                                resize = 0;
                                                break;
                                        }
                                        ImageCacheItUtils.resizeImage(p1, _this.getMeasuredWidth() / platform.screen.mainScreen.scale, _this.getMeasuredHeight() / platform.screen.mainScreen.scale, resize, function (resizedImage) {
                                            _this._createImageSourceFromSrc(new image_source_1.ImageSource(resizedImage));
                                        });
                                    }
                                });
                            }
                        }
                    }
                });
                return [2];
            });
        });
    };
    ImageCacheIt.prototype.getFileName = function (path) {
        var fileName = typeof path === 'string' ? path.trim() : '';
        if (fileName.indexOf('~/') === 0) {
            fileName = file_system_1.path.join(file_system_1.knownFolders.currentApp().path, fileName.replace('~/', ''));
        }
        return fileName;
    };
    ImageCacheIt._getMagicBytes = function (bytes) {
        var signature = '';
        for (var i = 0; i < bytes.length; i++) {
            signature += bytes[i].toString(16);
        }
        switch (signature) {
            case '89504E47':
                return 'image/png';
            case '47494638':
                return 'image/gif';
            case '25504446':
                return 'application/pdf';
            case 'FFD8FFDB':
            case 'FFD8FFE0':
            case 'FFD8FFE1':
                return 'image/jpeg';
            case '504B0304':
                return 'application/zip';
            default:
                return 'application/octet-stream';
        }
    };
    ImageCacheIt.prototype._handleFallbackImage = function () {
        return __awaiter(this, void 0, void 0, function () {
            var fallback;
            return __generator(this, function (_a) {
                fallback = this._handlePlaceholder(this.fallback);
                this.nativeViewProtected.image = fallback;
                return [2];
            });
        });
    };
    ImageCacheIt.prototype[common.fallbackProperty.setNative] = function (src) {
    };
    ImageCacheIt.prototype[common.srcProperty.setNative] = function (src) {
        var _this = this;
        if (typeof src === 'string' && src.startsWith('http')) {
            var data = ImageCacheIt.cacheHeaders[this.uuid] || { url: undefined, headers: undefined };
            data['url'] = src;
            ImageCacheIt.cacheHeaders[this.uuid] = data;
            this._loadImage(src);
        }
        else {
            if (types_1.isNullOrUndefined(src)) {
                this._handleFallbackImage();
                return;
            }
            var sync_1 = this.loadMode === 'sync';
            try {
                if (utils_1.isFileOrResourcePath(src)) {
                    if (src.indexOf(utils_1.RESOURCE_PREFIX) === 0) {
                        var resPath_1 = src.substr(utils_1.RESOURCE_PREFIX.length);
                        var loadResImage_1 = function () {
                            var url = NSBundle.mainBundle.URLForResourceWithExtension(resPath_1, 'gif');
                            var image;
                            if (url) {
                                var data = NSData.dataWithContentsOfURL(url);
                                if (data) {
                                    image = SDAnimatedImage.alloc().initWithData(data);
                                }
                            }
                            if (!image) {
                                image = UIImage.imageNamed(resPath_1);
                            }
                            return image;
                        };
                        var setResImage_1 = function (image) {
                            var source;
                            if (image instanceof SDAnimatedImage) {
                                source = new image_source_1.ImageSource();
                                source.ios = image;
                            }
                            else {
                                source = new image_source_1.ImageSource(image);
                            }
                            _this._createImageSourceFromSrc(source);
                        };
                        if (sync_1) {
                            setResImage_1(loadResImage_1());
                        }
                        else {
                            dispatch_async(this.filterQueue, function () {
                                var image = loadResImage_1();
                                console.log(image);
                                dispatch_async(main_queue, function () {
                                    setResImage_1(image);
                                });
                            });
                        }
                    }
                    else {
                        var getImage_1 = function () {
                            var data = NSData.dataWithContentsOfURL(NSURL.fileURLWithPath(_this.getFileName(src)));
                            if (!data) {
                                return [null, ''];
                            }
                            var buffer = interop.bufferFromData(data);
                            var array = new Uint8Array(buffer);
                            var type = ImageCacheIt._getMagicBytes(array.subarray(0, 4));
                            return [data, type];
                        };
                        var setImage_1 = function (data) {
                            if (!data[0]) {
                                _this._handleFallbackImage();
                                return;
                            }
                            if (data[1].indexOf('gif') > -1) {
                                var source = new image_source_1.ImageSource();
                                source.ios = SDAnimatedImage.alloc().initWithData(data[0]);
                                _this._createImageSourceFromSrc(source);
                            }
                            else {
                                _this._createImageSourceFromSrc(new image_source_1.ImageSource(UIImage.alloc().initWithData(data[0])));
                            }
                        };
                        if (sync_1) {
                            setImage_1(getImage_1());
                        }
                        else {
                            dispatch_async(this.filterQueue, function () {
                                var data = getImage_1();
                                dispatch_async(main_queue, function () {
                                    setImage_1(data);
                                });
                            });
                        }
                    }
                }
                else {
                    this._createImageSourceFromSrc(src);
                }
            }
            catch (e) {
            }
        }
    };
    ImageCacheIt.prototype.setAspect = function (value) {
        switch (value) {
            case 'aspectFit':
                this.nativeView.contentMode = 1;
                break;
            case 'aspectFill':
                this.nativeView.contentMode = 2;
                break;
            case 'fill':
                this.nativeView.contentMode = 0;
                break;
            case 'none':
            default:
                this.nativeView.contentMode = 9;
                break;
        }
    };
    ImageCacheIt.prototype[common.stretchProperty.getDefault] = function () {
        return 'aspectFit';
    };
    ImageCacheIt.prototype[common.stretchProperty.setNative] = function (value) {
        this.setAspect(value);
    };
    ImageCacheIt.prototype[common.filterProperty.setNative] = function (filter) {
        this.filter = filter;
        if (this.nativeViewProtected.image) {
            this._setNativeImage(this.nativeViewProtected.image);
        }
    };
    ImageCacheIt.prototype[common.tintColorProperty.setNative] = function (value) {
        this.setTintColor(value);
    };
    ImageCacheIt._getFilterByName = function (value, image) {
        var filter;
        if (!ImageCacheIt.ciFilterMap[value]) {
            ImageCacheIt.ciFilterMap[value] = CIFilter.filterWithName(value);
        }
        filter = ImageCacheIt.ciFilterMap[value];
        filter.setDefaults();
        if (image && image.CIImage) {
            filter.setValueForKey(image.CIImage, kCIInputImageKey);
            filter.setValueForKey(NSNull, kCIImageColorSpace);
        }
        else {
            if (image && image.CGImage) {
                filter.setValueForKey(CIImage.imageWithCGImage(image.CGImage), kCIInputImageKey);
            }
        }
        return filter;
    };
    ImageCacheIt.prototype.setTintColor = function (value) {
        if (typeof value === 'string') {
            value = new view_1.Color(value);
        }
        if (value && this.nativeViewProtected.image && !this._templateImageWasCreated) {
            this.nativeViewProtected.image = this.nativeViewProtected.image.imageWithRenderingMode(2);
            this._templateImageWasCreated = true;
        }
        else if (!value && this.nativeViewProtected.image && this._templateImageWasCreated) {
            this._templateImageWasCreated = false;
            this.nativeViewProtected.image = this.nativeViewProtected.image.imageWithRenderingMode(0);
        }
        this.nativeViewProtected.tintColor = value ? value.ios : null;
    };
    ImageCacheIt.prototype._setOverlayColor = function (value, image) {
        if (!image) {
            return image;
        }
        if (typeof value === 'string') {
            value = new view_1.Color(value);
        }
        if (value) {
            return ImageCacheItUtils.createImageOverlay(image, this.imageSource.width, this.imageSource.height, value.r / 255, value.g / 255, value.b / 255, value.a / 255);
        }
        return image;
    };
    ImageCacheIt.prototype[common.overlayColorProperty.setNative] = function (value) {
        if (this.imageSource) {
            this._setNativeImage(this.imageSource.ios);
        }
    };
    ImageCacheIt.prototype[common.priorityProperty.setNative] = function (value) {
        switch (value) {
            case image_cache_it_common_1.Priority.High:
                this._priority = 128;
                break;
            case image_cache_it_common_1.Priority.Low:
                this._priority = 2;
                break;
            default:
                this._priority = 0;
                break;
        }
    };
    ImageCacheIt.prototype._setNativeImage = function (nativeImage) {
        var _this = this;
        var setImage = function (image) {
            _this.nativeViewProtected.image = image || nativeImage;
            _this._templateImageWasCreated = false;
            _this.isLoading = false;
            _this.setTintColor(_this.style.tintColor);
            if (_this._imageSourceAffectsLayout) {
                _this.requestLayout();
            }
        };
        var overlayColor = this.overlayColor;
        if (typeof overlayColor === 'string') {
            overlayColor = new view_1.Color(overlayColor);
        }
        if (overlayColor instanceof view_1.Color) {
            overlayColor = "rgba(" + overlayColor.r + "," + overlayColor.g + "," + overlayColor.b + "," + overlayColor.a / 255 + ")";
        }
        else {
            overlayColor = null;
        }
        if (this.filter) {
            var options = {
                filter: this.filter,
                overlayColor: overlayColor
            };
            if (!overlayColor) {
                delete options.overlayColor;
            }
            ImageCacheItUtils.applyProcessing(this.ctx, nativeImage, options, function (image) {
                setImage(image);
            });
        }
        else {
            if (NSThread.isMainThread) {
                if (this.overlayColor) {
                    ImageCacheItUtils.applyProcessing(this.ctx, nativeImage, {
                        overlayColor: overlayColor
                    }, function (image) {
                        setImage(image);
                    });
                }
                else {
                    setImage();
                }
            }
            else {
                if (this.overlayColor) {
                    ImageCacheItUtils.applyProcessing(this.ctx, nativeImage, {
                        overlayColor: overlayColor
                    }, function (image) {
                        setImage(image);
                    });
                }
                else {
                    dispatch_async(main_queue, function () {
                        setImage();
                    });
                }
            }
        }
    };
    ImageCacheIt.prototype[common.imageSourceProperty.setNative] = function (value) {
        this._setNativeImage(value ? value.ios : null);
    };
    ImageCacheIt.prototype._setupFilter = function (image) {
        var _this = this;
        if (types_1.isNullOrUndefined(image)) {
            return image;
        }
        var getValue = function (value) {
            return value.substring(value.indexOf('(') + 1, value.indexOf(')'));
        };
        var createFilterWithName = function (value) {
            return ImageCacheIt._getFilterByName(value, image);
        };
        if (this.filter) {
            if (image) {
                var filters = this.filter ? this.filter.split(' ') : [];
                filters.forEach(function (filter) {
                    var value = getValue(filter);
                    if (filter.indexOf('blur') > -1) {
                        var width = -1;
                        if (value.indexOf('%') > -1) {
                            value = style_properties_1.Length.parse(value);
                            width = image.size.width * value;
                        }
                        else if (value.indexOf('px')) {
                            width = parseInt(value.replace('px', ''), 10);
                        }
                        else if (value.indexOf('dip')) {
                            width = parseInt(value.replace('dip', ''), 10) * platform.screen.mainScreen.scale;
                        }
                        else if (typeof value === 'number') {
                            width = value;
                        }
                        if (width > 25) {
                            width = 25;
                        }
                        if (width > -1) {
                            var blurFilter = createFilterWithName('CIGaussianBlur');
                            blurFilter.setValueForKey(width, kCIInputRadiusKey);
                            var blurredImg = blurFilter.valueForKey(kCIOutputImageKey);
                            if (blurredImg && blurredImg.extent) {
                                var cgiImage = _this.ctx.createCGImageFromRect(blurredImg, blurredImg.extent);
                                image = UIImage.imageWithCGImage(cgiImage);
                            }
                        }
                    }
                    else if (filter.indexOf('contrast') > -1) {
                        if (value.indexOf('%')) {
                            var contrast = parseFloat(value.replace('%', '')) / 100;
                            var contrastFilter = createFilterWithName('CIColorControls');
                            contrastFilter.setValueForKey(contrast, kCIInputContrastKey);
                            var contrastImg = contrastFilter.valueForKey(kCIOutputImageKey);
                            if (contrastImg && contrastImg.extent) {
                                var cgiImage = _this.ctx.createCGImageFromRect(contrastImg, contrastImg.extent);
                                image = UIImage.imageWithCGImage(cgiImage);
                            }
                        }
                    }
                    else if (filter.indexOf('brightness') > -1) {
                        if (value.indexOf('%')) {
                            var brightness = parseFloat(value.replace('%', '')) / 100;
                            var brightnessFilter = createFilterWithName('CIColorControls');
                            brightnessFilter.setValueForKey(brightness, kCIInputContrastKey);
                            var contrastImg = brightnessFilter.valueForKey(kCIOutputImageKey);
                            if (contrastImg && contrastImg.extent) {
                                var cgiImage = _this.ctx.createCGImageFromRect(contrastImg, contrastImg.extent);
                                image = UIImage.imageWithCGImage(cgiImage);
                            }
                        }
                    }
                    else if (filter.indexOf('grayscale') > -1 || filter.indexOf('greyscale') > -1) {
                        var grayscale = void 0;
                        if (value.indexOf('%') > -1) {
                            grayscale = parseFloat(value.replace('%', '')) / 100;
                        }
                        else if (value.indexOf('.') > -1) {
                            grayscale = parseFloat(value);
                        }
                        else {
                            grayscale = parseInt(value, 10);
                        }
                        if (grayscale > 1) {
                            grayscale = 1;
                        }
                        grayscale = 1 - grayscale;
                        var grayscaleFilter = createFilterWithName('CIColorControls');
                        grayscaleFilter.setValueForKey(grayscale, kCIInputSaturationKey);
                        var grayscaleImg = grayscaleFilter.valueForKey(kCIOutputImageKey);
                        if (grayscaleImg && grayscaleImg.extent) {
                            var cgiImage = _this.ctx.createCGImageFromRect(grayscaleImg, grayscaleImg.extent);
                            image = UIImage.imageWithCGImage(cgiImage);
                        }
                    }
                    else if (filter.indexOf('invert') > -1) {
                        var invertFilter = createFilterWithName('CIColorInvert');
                        var invertImg = invertFilter.valueForKey(kCIOutputImageKey);
                        if (invertImg && invertImg.extent) {
                            var cgiImage = _this.ctx.createCGImageFromRect(invertImg, invertImg.extent);
                            image = UIImage.imageWithCGImage(cgiImage);
                        }
                    }
                    else if (filter.indexOf('sepia') > -1) {
                        var sepia = parseFloat(value.replace('%', '')) / 100;
                        var sepiaFilter = createFilterWithName('CISepiaTone');
                        sepiaFilter.setValueForKey(sepia, kCIInputIntensityKey);
                        var sepiaImg = sepiaFilter.valueForKey(kCIOutputImageKey);
                        if (sepiaImg && sepiaImg.extent) {
                            var cgiImage = _this.ctx.createCGImageFromRect(sepiaImg, sepiaImg.extent);
                            image = UIImage.imageWithCGImage(cgiImage);
                        }
                    }
                    else if (filter.indexOf('opacity') > -1) {
                        var alpha = void 0;
                        if (value.indexOf('%') > -1) {
                            alpha = parseInt(value.replace('%', ''), 10) / 100;
                        }
                        else if (value.indexOf('.') > -1) {
                            alpha = parseFloat(value);
                        }
                        else {
                            alpha = parseInt(value, 10);
                        }
                        UIGraphicsBeginImageContextWithOptions(image.size, false, image.scale);
                        image.drawAtPointBlendModeAlpha(CGPointZero, 0, alpha);
                        image = UIGraphicsGetImageFromCurrentImageContext();
                        UIGraphicsEndImageContext();
                    }
                    else if (filter.indexOf('hue') > -1) {
                        var hueFilter = createFilterWithName('CIHueAdjust');
                        var hue = 0;
                        if (value.indexOf('deg') > -1) {
                            hue = parseInt(value.replace('deg', ''), 10);
                        }
                        else if (value.indexOf('turn') > -1) {
                            hue = parseInt(value.replace('turn', ''), 10) * 360;
                        }
                        hueFilter.setValueForKey(hue, kCIInputAngleKey);
                        var hueImg = hueFilter.valueForKey(kCIOutputImageKey);
                        if (hueImg && hueImg.extent) {
                            var cgiImage = _this.ctx.createCGImageFromRect(hueImg, hueImg.extent);
                            image = UIImage.imageWithCGImage(cgiImage);
                        }
                    }
                    else if (filter.indexOf('saturate') > -1) {
                        var saturateFilter = createFilterWithName('CIColorControls');
                        var saturate = void 0;
                        if (value.indexOf('%') > -1) {
                            saturate = parseInt(value.replace('%', ''), 10) / 100;
                        }
                        else if (value.indexOf('.') > -1) {
                            saturate = parseFloat(value);
                        }
                        else {
                            saturate = parseInt(value, 10);
                        }
                        saturateFilter.setValueForKey(saturate, kCIInputSaturationKey);
                        var saturateImg = saturateFilter.valueForKey(kCIOutputImageKey);
                        if (saturateImg && saturateImg.extent) {
                            var cgiImage = _this.ctx.createCGImageFromRect(saturateImg, saturateImg.extent);
                            image = UIImage.imageWithCGImage(cgiImage);
                        }
                    }
                });
            }
            return image;
        }
        else {
            return image;
        }
    };
    ImageCacheIt.hasItem = function (src) {
        return new Promise(function (resolve, reject) {
            var manager = SDWebImageManager.sharedManager;
            if (manager) {
                var key = manager.cacheKeyForURL(NSURL.URLWithString(src));
                manager.imageCache.containsImageForKeyCacheTypeCompletion(key, 3, function (type) {
                    if (type > 0) {
                        resolve();
                    }
                    else {
                        reject();
                    }
                });
            }
            else {
                reject();
            }
        });
    };
    ImageCacheIt.deleteItem = function (src) {
        return new Promise(function (resolve, reject) {
            var manager = SDWebImageManager.sharedManager;
            if (manager) {
                var key = manager.cacheKeyForURL(NSURL.URLWithString(src));
                manager.imageCache.removeImageForKeyFromDiskWithCompletion(key, true, function () {
                    resolve();
                });
            }
            else {
                reject();
            }
        });
    };
    ImageCacheIt.getItem = function (src) {
        return new Promise(function (resolve, reject) {
            var manager = SDWebImageManager.sharedManager;
            if (manager) {
                if (src && src.indexOf('http') > -1) {
                    var nativeSrc = NSURL.URLWithString(src);
                    manager.loadImageWithURLOptionsProgressCompleted(nativeSrc, SDWebImageOptions.scaleDownLargeImages, function (receivedSize, expectedSize, path) {
                    }, function (image, data, error, type, finished, completedUrl) {
                        if (image === null && error !== null && data === null) {
                            reject(error.localizedDescription);
                        }
                        else if (finished && completedUrl != null) {
                            if (type === SDImageCacheType.disk) {
                                var key = manager.cacheKeyForURL(completedUrl);
                                var source = manager.imageCache.cachePathForKey(key);
                                resolve(source);
                            }
                            else {
                                var sharedCache = SDImageCache.sharedImageCache;
                                sharedCache.storeImageForKeyCompletion(image, completedUrl.absoluteString, function () {
                                    var key = manager.cacheKeyForURL(completedUrl);
                                    var source = manager.imageCache.cachePathForKey(key);
                                    resolve(source);
                                });
                            }
                        }
                    });
                }
            }
            else {
                reject();
            }
        });
    };
    ImageCacheIt.clear = function () {
        return new Promise(function (resolve, reject) {
            var manager = SDWebImageManager.sharedManager;
            if (manager) {
                manager.imageCache.clearMemory();
                manager.imageCache.clearDiskOnCompletion(function () {
                    resolve();
                });
            }
        });
    };
    ImageCacheIt.enableAutoMM = function () {
        ImageCacheIt.autoMMCallback = function (args) {
            var manager = SDWebImageManager.sharedManager;
            if (manager) {
                manager.imageCache.clearMemory();
            }
        };
        app.on(app.lowMemoryEvent, ImageCacheIt.autoMMCallback);
    };
    ImageCacheIt.disableAutoMM = function () {
        if (ImageCacheIt.autoMMCallback) {
            app.off(app.lowMemoryEvent, ImageCacheIt.autoMMCallback);
        }
    };
    ImageCacheIt.cacheHeaders = {};
    ImageCacheIt.hasModifier = false;
    ImageCacheIt.ciFilterMap = {};
    return ImageCacheIt;
}(image_cache_it_common_1.ImageCacheItBase));
exports.ImageCacheIt = ImageCacheIt;
//# sourceMappingURL=image-cache-it.ios.js.map