"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TalentModule = void 0;
const common_1 = require("@nestjs/common");
const talent_service_1 = require("./talent.service");
const talent_controller_1 = require("./talent.controller");
let TalentModule = class TalentModule {
};
exports.TalentModule = TalentModule;
exports.TalentModule = TalentModule = __decorate([
    (0, common_1.Module)({ providers: [talent_service_1.TalentService], controllers: [talent_controller_1.TalentController] })
], TalentModule);
//# sourceMappingURL=talent.module.js.map