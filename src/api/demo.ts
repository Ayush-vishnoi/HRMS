import { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import type { AttendanceRecord, Employee, LeaveRequest, PayrollRecord, User, UserRole } from '../types'

export const isDemoMode = (import.meta.env.VITE_DEMO_MODE ?? 'true') === 'true'
const wait = () => new Promise((resolve) => setTimeout(resolve, 250 + Math.random() * 350))
const users: Record<string, User> = {
  'admin@hearthhr.com': { id: 'usr-1', name: 'Aarav Mehta', email: 'admin@hearthhr.com', role: 'SUPER_ADMIN', department: 'Leadership' },
  'hr@hearthhr.com': { id: 'usr-2', name: 'Priya Sharma', email: 'hr@hearthhr.com', role: 'HR_MANAGER', department: 'People Operations' },
  'employee@hearthhr.com': { id: 'usr-3', name: 'Rohan Kapoor', email: 'employee@hearthhr.com', role: 'EMPLOYEE', department: 'Engineering' },
}
const employees: Employee[] = [
  ['1','EMP-1001','Aarav','Mehta','admin@hearthhr.com','Leadership','Chief People Officer','SUPER_ADMIN','ACTIVE','2021-01-12'],
  ['2','EMP-1002','Priya','Sharma','hr@hearthhr.com','People Operations','HR Manager','HR_MANAGER','ACTIVE','2022-03-07'],
  ['3','EMP-1003','Rohan','Kapoor','employee@hearthhr.com','Engineering','Senior Developer','EMPLOYEE','ACTIVE','2023-02-15'],
  ['4','EMP-1004','Ananya','Iyer','ananya@hearthhr.com','Design','Product Designer','EMPLOYEE','ACTIVE','2023-06-19'],
  ['5','EMP-1005','Kabir','Singh','kabir@hearthhr.com','Sales','Account Executive','EMPLOYEE','ON_LEAVE','2022-11-04'],
  ['6','EMP-1006','Meera','Nair','meera@hearthhr.com','Finance','Financial Analyst','EMPLOYEE','ACTIVE','2024-01-08'],
  ['7','EMP-1007','Vikram','Rao','vikram@hearthhr.com','Engineering','QA Engineer','EMPLOYEE','ACTIVE','2023-09-12'],
  ['8','EMP-1008','Ishita','Verma','ishita@hearthhr.com','Marketing','Content Strategist','EMPLOYEE','INACTIVE','2022-07-25'],
].map(([id,employeeId,firstName,lastName,email,department,jobTitle,role,status,joiningDate]) => ({ id, employeeId, firstName, lastName, email, department, jobTitle, role: role as UserRole, status: status as Employee['status'], joiningDate }))
let leaves: LeaveRequest[] = [
  { id:'lv-1', employeeId:'3', employeeName:'Rohan Kapoor', type:'Annual Leave', startDate:'2026-08-18', endDate:'2026-08-20', days:3, reason:'Family trip', status:'PENDING', requestedAt:'2026-08-05' },
  { id:'lv-2', employeeId:'5', employeeName:'Kabir Singh', type:'Sick Leave', startDate:'2026-08-04', endDate:'2026-08-06', days:3, reason:'Medical recovery', status:'APPROVED', requestedAt:'2026-08-03' },
  { id:'lv-3', employeeId:'4', employeeName:'Ananya Iyer', type:'Casual Leave', startDate:'2026-07-25', endDate:'2026-07-25', days:1, reason:'Personal work', status:'REJECTED', requestedAt:'2026-07-20' },
]
const attendance: AttendanceRecord[] = Array.from({ length: 25 }, (_, index) => ({ id:`att-${index}`, employeeId:'3', employeeName:'Rohan Kapoor', date:`2026-08-${String(index + 1).padStart(2,'0')}`, checkIn:index % 7 > 0 ? '09:12' : undefined, checkOut:index % 7 > 0 ? '18:08' : undefined, workHours:index % 7 > 0 ? 8.9 : undefined, status:index % 7 === 0 ? 'ABSENT' : index % 6 === 0 ? 'LATE' : 'PRESENT' }))
const payroll: PayrollRecord[] = employees.slice(0,7).map((employee,index) => { const gross=65000+index*8500; const deductions=Math.round(gross*.12); return { id:`pay-${employee.id}`, employeeId:employee.employeeId, employeeName:`${employee.firstName} ${employee.lastName}`, month:'July 2026', gross, deductions, net:gross-deductions, status:index < 5 ? 'PAID':'PROCESSED' } })
const trend = ['Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'].map((month,index) => ({ month, present:82+(index%5)*3, absent:8-(index%4) }))
const parseBody = (data: unknown) => { if (typeof data !== 'string') return data as Record<string, unknown>; try { return JSON.parse(data) as Record<string, unknown> } catch { return {} } }
const response = <T>(config: InternalAxiosRequestConfig, data: T, status=200): AxiosResponse<T> => {
  const result: AxiosResponse<T> = { data, status, statusText: status < 400 ? 'OK' : 'Error', headers:{}, config }
  const isValid = config.validateStatus ? config.validateStatus(status) : status >= 200 && status < 300
  if (!isValid) throw new AxiosError(`Request failed with status code ${status}`, status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST, config, undefined, result)
  return result
}

export const demoAdapter: AxiosAdapter = async (config) => {
  await wait(); const method=(config.method ?? 'get').toLowerCase(); const url=config.url ?? ''; const body=parseBody(config.data)
  if (url === '/api/auth/login' && method === 'post') { const user=users[String(body.email).toLowerCase()]; if (!user || body.password !== 'Demo@123') return response(config,{ message:'Use a demo email and password Demo@123' },401); return response(config,{ accessToken:`demo-${user.id}`, refreshToken:`demo-refresh-${user.id}`, user }) }
  if (url === '/api/auth/me') { const stored=localStorage.getItem('hrms_user'); return stored ? response(config,JSON.parse(stored)) : response(config,{ message:'Unauthorized' },401) }
  if (url === '/api/auth/refresh' && method === 'post') { const stored=localStorage.getItem('hrms_user'); if (!stored) return response(config,{ message:'Unauthorized' },401); const user=JSON.parse(stored) as User; return response(config,{ accessToken:`demo-${user.id}`, refreshToken:`demo-refresh-${user.id}` }) }
  if (url.startsWith('/api/auth/')) return response(config,{ message:'Demo request completed successfully.' })
  if (url === '/api/reports/dashboard') return response(config,{ stats:{ totalEmployees:128, presentToday:112, onLeave:9, openPositions:7 }, attendanceTrend:trend, recentActivity:[{id:'a1',title:'New employee onboarded',description:'Ananya joined the Design team',timestamp:'2026-08-06',type:'employee'},{id:'a2',title:'Leave approved',description:'Kabir’s sick leave was approved',timestamp:'2026-08-05',type:'leave'},{id:'a3',title:'Payroll processed',description:'July payroll completed for 128 employees',timestamp:'2026-08-01',type:'payroll'}] })
  if (url === '/api/employees' && method === 'get') return response(config,{ data:employees, pagination:{ page:1,limit:100,total:employees.length,totalPages:1 } })
  if (url === '/api/employees' && method === 'post') { const item={ ...body,id:String(employees.length+1) } as unknown as Employee; employees.push(item); return response(config,item,201) }
  const employeeMatch=url.match(/^\/api\/employees\/(\w+)$/); if (employeeMatch) { const index=employees.findIndex((e)=>e.id===employeeMatch[1]); if (index < 0) return response(config,{ message:'Employee not found' },404); if (method==='get') return response(config,employees[index]); if (method==='delete') { employees.splice(index,1); return response(config,null,204) } employees[index]={...employees[index],...body}; return response(config,employees[index]) }
  if (url === '/api/attendance') return response(config,{ checkedIn:false,records:attendance })
  if (url.includes('/api/attendance/check-')) return response(config,attendance[0])
  if (url === '/api/attendance/logs') return response(config,attendance)
  if (url === '/api/leaves' && method === 'get') return response(config,{ balances:[{type:'Annual Leave',used:6,total:20},{type:'Sick Leave',used:2,total:10},{type:'Casual Leave',used:3,total:8},{type:'Comp Off',used:1,total:5}],requests:leaves })
  if (url === '/api/leaves' && method === 'post') { const item={...body,id:`lv-${Date.now()}`,employeeId:'3',employeeName:'Rohan Kapoor',days:2,status:'PENDING',requestedAt:new Date().toISOString()} as unknown as LeaveRequest; leaves=[item,...leaves]; return response(config,item,201) }
  const leaveMatch=url.match(/^\/api\/leaves\/(.+)\/status$/); if (leaveMatch) { const item=leaves.find((l)=>l.id===leaveMatch[1])!; item.status=body.status as LeaveRequest['status']; return response(config,item) }
  if (url === '/api/payroll' || (url === '/api/payroll/run' && method === 'post')) { const gross=payroll.reduce((a,b)=>a+b.gross,0), deductions=payroll.reduce((a,b)=>a+b.deductions,0); return response(config,{gross,deductions,net:gross-deductions,records:payroll}) }
  const payMatch=url.match(/^\/api\/payroll\/(.+)\/payslip$/); if (payMatch) { const item=payroll.find((p)=>p.id===payMatch[1]); if (!item) return response(config,{ message:'Payslip not found' },404); return response(config,{...item,department:'Engineering',jobTitle:'Team Member',earnings:[{label:'Basic Salary',amount:item.gross*.6},{label:'HRA',amount:item.gross*.25},{label:'Allowances',amount:item.gross*.15}],deductionItems:[{label:'Tax',amount:item.deductions*.75},{label:'Provident Fund',amount:item.deductions*.25}]}) }
  if (url === '/api/reports') return response(config,{headcountByDepartment:[{name:'Engineering',value:42},{name:'Sales',value:25},{name:'Design',value:14},{name:'Operations',value:28},{name:'Finance',value:19}],attendanceByMonth:trend,turnoverRate:4.2,rows:employees.map((e)=>({employeeId:e.employeeId,name:`${e.firstName} ${e.lastName}`,department:e.department,status:e.status}))})
  if (url === '/api/ai/chatbot') return response(config,{id:`msg-${Date.now()}`,role:'assistant',content:'In demo mode, I can help explain leave policies, payroll schedules, attendance rules, and HR best practices.',timestamp:new Date().toISOString()})
  if (url === '/api/ai/resume-parse') return response(config,{name:'Neha Kulkarni',email:'neha@example.com',skills:['React','TypeScript','Node.js','Leadership'],experienceYears:6,summary:'Experienced full-stack engineer with strong product development and team leadership skills.'})
  if (url === '/api/ai/attrition-insights') return response(config,[{riskLevel:'HIGH',summary:'Sales team engagement requires attention',factors:['Declining engagement','High workload']},{riskLevel:'MEDIUM',summary:'Engineering retention is stable but monitorable',factors:['Competitive market','Tenure milestone']},{riskLevel:'LOW',summary:'Finance team shows healthy retention signals',factors:['Strong engagement','Career progression']}])
  return response(config,{ message:`Demo endpoint not implemented: ${method.toUpperCase()} ${url}` },404)
}
