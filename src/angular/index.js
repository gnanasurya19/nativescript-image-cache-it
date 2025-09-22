"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@angular/core");
var angular_1 = require("@nativescript/angular");
var image_cache_it_directive_1 = require("./image-cache-it.directive");
var __1 = require("../");
var TNSImageCacheItModule = (function () {
    function TNSImageCacheItModule() {
    }
    TNSImageCacheItModule = __decorate([
        core_1.NgModule({
            declarations: [image_cache_it_directive_1.NSIMAGECACHEIT_DIRECTIVES],
            exports: [image_cache_it_directive_1.NSIMAGECACHEIT_DIRECTIVES],
        })
    ], TNSImageCacheItModule);
    return TNSImageCacheItModule;
}());
exports.TNSImageCacheItModule = TNSImageCacheItModule;
angular_1.registerElement('ImageCacheIt', function () { return __1.ImageCacheIt; });
//# sourceMappingURL=index.js.map