"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegacyResponseInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
let LegacyResponseInterceptor = class LegacyResponseInterceptor {
    intercept(context, next) {
        const res = context.switchToHttp().getResponse();
        if (res.headersSent) {
            return next.handle();
        }
        return next.handle().pipe((0, rxjs_1.map)((data) => {
            if (res.headersSent)
                return data;
            if (data === undefined || data === null) {
                return { success: true, data: null };
            }
            if (typeof data === 'object' &&
                !Array.isArray(data) &&
                ('success' in data || 'accessToken' in data)) {
                return data;
            }
            return { success: true, data };
        }));
    }
};
exports.LegacyResponseInterceptor = LegacyResponseInterceptor;
exports.LegacyResponseInterceptor = LegacyResponseInterceptor = __decorate([
    (0, common_1.Injectable)()
], LegacyResponseInterceptor);
//# sourceMappingURL=legacy-response.interceptor.js.map