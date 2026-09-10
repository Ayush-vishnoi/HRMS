"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_LEAVE_BALANCES = void 0;
exports.defaultLeaveBalanceRows = defaultLeaveBalanceRows;
exports.DEFAULT_LEAVE_BALANCES = [
    { leaveType: 'Casual', total: 12 },
    { leaveType: 'Sick', total: 10 },
    { leaveType: 'Earned', total: 20 },
    { leaveType: 'WFH', total: 12 },
];
function defaultLeaveBalanceRows(employeeId, year) {
    return exports.DEFAULT_LEAVE_BALANCES.map((b) => ({
        employeeId,
        year,
        leaveType: b.leaveType,
        total: b.total,
        used: 0,
        remaining: b.total,
    }));
}
//# sourceMappingURL=default-balances.js.map