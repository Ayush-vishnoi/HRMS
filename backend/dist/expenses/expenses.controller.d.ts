import { ExpensesService } from './expenses.service';
interface UploadedReceiptFile {
    fieldname: string;
    originalname: string;
    mimetype: string;
    size: number;
    filename: string;
    path: string;
}
export declare class ExpensesController {
    private expensesService;
    constructor(expensesService: ExpensesService);
    findAll(user: any, view?: string, employeeId?: string): Promise<{
        id: string;
        title: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        description: string;
        category: string;
        currency: string;
        paymentStatus: string;
        amount: number;
        claimNumber: string;
        expenseDate: string;
        merchantName: string;
        receiptUrl: string | null;
        managerStatus: string;
        financeStatus: string;
        approvedAmount: number | null;
        settlementDate: string | null;
        managerRejectionReason: string | null;
        hrRejectionReason: string | null;
    }[]>;
    uploadReceipt(user: any, file?: UploadedReceiptFile): {
        receiptUrl: string;
        uploadedBy: any;
    };
    create(user: any, body: any): Promise<{
        id: string;
        title: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        description: string;
        category: string;
        currency: string;
        paymentStatus: string;
        amount: number;
        claimNumber: string;
        expenseDate: string;
        merchantName: string;
        receiptUrl: string | null;
        managerStatus: string;
        financeStatus: string;
        approvedAmount: number | null;
        settlementDate: string | null;
        managerRejectionReason: string | null;
        hrRejectionReason: string | null;
    }>;
    update(body: any): Promise<{
        id: string;
        title: string;
        createdAt: Date;
        updatedAt: Date;
        employeeId: string;
        description: string;
        category: string;
        currency: string;
        paymentStatus: string;
        amount: number;
        claimNumber: string;
        expenseDate: string;
        merchantName: string;
        receiptUrl: string | null;
        managerStatus: string;
        financeStatus: string;
        approvedAmount: number | null;
        settlementDate: string | null;
        managerRejectionReason: string | null;
        hrRejectionReason: string | null;
    }>;
}
export {};
