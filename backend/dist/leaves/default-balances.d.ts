export declare const DEFAULT_LEAVE_BALANCES: ReadonlyArray<{
    leaveType: 'Casual' | 'Sick' | 'Earned' | 'WFH';
    total: number;
}>;
export declare function defaultLeaveBalanceRows(employeeId: string, year: number): {
    employeeId: string;
    year: number;
    leaveType: "Casual" | "Sick" | "Earned" | "WFH";
    total: number;
    used: number;
    remaining: number;
}[];
