import type { Response } from 'express';
export declare class UploadsController {
    serveReceipt(filename: string, res: Response): Response<any, Record<string, any>>;
}
