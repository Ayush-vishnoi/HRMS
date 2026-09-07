"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegacyExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let LegacyExceptionFilter = class LegacyExceptionFilter {
    logger = new common_1.Logger('LegacyExceptionFilter');
    catch(exception, host) {
        const res = host.switchToHttp().getResponse();
        if (res.headersSent)
            return;
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const body = exception.getResponse();
            if (typeof body === 'string') {
                message = body;
            }
            else if (body && typeof body === 'object') {
                const b = body;
                if (typeof b.message === 'string') {
                    message = b.message;
                }
                else if (Array.isArray(b.message) && b.message.length > 0) {
                    message = b.message.join(', ');
                }
                else if (typeof b.error === 'string') {
                    message = b.error;
                }
            }
        }
        else {
            const code = exception?.code;
            if (code === 'P2025') {
                status = common_1.HttpStatus.NOT_FOUND;
                message = 'Record not found';
            }
            else if (code === 'P2002') {
                status = common_1.HttpStatus.CONFLICT;
                message = 'A record with these details already exists';
            }
            else {
                this.logger.error(exception instanceof Error ? exception.stack : String(exception));
            }
        }
        res.status(status).json({ success: false, error: message });
    }
};
exports.LegacyExceptionFilter = LegacyExceptionFilter;
exports.LegacyExceptionFilter = LegacyExceptionFilter = __decorate([
    (0, common_1.Catch)()
], LegacyExceptionFilter);
//# sourceMappingURL=legacy-exception.filter.js.map