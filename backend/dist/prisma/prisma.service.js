"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let PrismaService = PrismaService_1 = class PrismaService extends client_1.PrismaClient {
    logger = new common_1.Logger(PrismaService_1.name);
    async onModuleInit() {
        const delays = [1000, 2000, 4000, 8000];
        for (let attempt = 0;; attempt++) {
            try {
                await this.$connect();
                if (attempt > 0)
                    this.logger.log(`Database connected after ${attempt + 1} attempt(s).`);
                return;
            }
            catch (err) {
                if (attempt >= delays.length) {
                    this.logger.warn(`Could not connect to the database after ${attempt + 1} attempts; ` +
                        'starting anyway and will connect on first query. ' +
                        `Last error: ${err instanceof Error ? err.message : String(err)}`);
                    return;
                }
                await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
            }
        }
    }
    async onModuleDestroy() {
        await this.$disconnect();
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = PrismaService_1 = __decorate([
    (0, common_1.Injectable)()
], PrismaService);
//# sourceMappingURL=prisma.service.js.map