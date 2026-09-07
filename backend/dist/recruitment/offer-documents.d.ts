export interface OfferCompensation {
    annualCtc: number;
    currency: string;
    variablePayAnnual: number;
    joiningBonus: number;
    monthlyGross: number;
    components: {
        basicMonthly: number;
        hraMonthly: number;
        conveyanceMonthly: number;
        medicalMonthly: number;
        specialAllowanceMonthly: number;
    };
    employerContributions: {
        pfEmployerMonthly: number;
        gratuityMonthly: number;
        totalEmployerMonthly: number;
        totalEmployerAnnual: number;
    };
    estimatedNetTakeHomeMonthly: number;
    totalEmployerCostAnnual: number;
}
export declare function calculateOfferCompensation(annualCtc: number, variablePayAnnual?: number, joiningBonus?: number, currency?: string): OfferCompensation;
export declare function formatIndianCurrency(amount: number, currency?: string): string;
export declare function escapeHtml(value: string): string;
export declare function assertNoXss(text: string, label?: string): void;
export declare function renderTemplate(template: string, variables: Record<string, unknown>): string;
export declare const DOC_TYPES: readonly ["Offer_Letter", "Appointment_Letter", "NDA"];
export type DocType = (typeof DOC_TYPES)[number];
export interface BuiltInTemplate {
    id: string;
    name: string;
    type: DocType;
    content: string;
}
export declare const BUILTIN_TEMPLATES: BuiltInTemplate[];
export declare function htmlToText(html: string): string;
export interface PdfLine {
    text: string;
    bold?: boolean;
    size?: number;
}
export declare function compensationTableRows(comp: OfferCompensation): string[];
export declare function generatePdf(lines: PdfLine[]): Buffer;
export declare function buildOfferLetterPdf(title: string, renderedHtml: string, comp: OfferCompensation): Buffer;
