export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  avatar: string;
  status: 'Active' | 'On Leave' | 'Remote';
  joinDate: string;
  location: string;
  salary: number;
  manager: string;
  employeeCode: string;
}

const m = (n: number) => `https://randomuser.me/api/portraits/men/${n}.jpg`;
const f = (n: number) => `https://randomuser.me/api/portraits/women/${n}.jpg`;

export const CURRENT_USER = {
  id: 'EMP-001',
  name: 'Ayush Vishnoi',
  role: 'AI/ML Intern Developer',
  department: 'AI/ML',
  email: 'ayush.vishnoi@company.com',
  phone: '+91 98765 43210',
  avatar: m(32),
  employeeCode: 'EMP-2026-089',
  joinDate: '15 March 2026',
  location: 'Bengaluru, India',
  salary: 550000,
  manager: 'Arjun Mehta',
};

export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: 'EMP-001', name: 'Ayush Vishnoi', role: 'AI/ML Intern Developer', department: 'AI/ML',
    email: 'ayush.vishnoi@company.com', phone: '+91 98765 43210', avatar: m(32),
    status: 'Active', joinDate: '15 Mar 2026', location: 'Bengaluru, Karnataka', salary: 550000, manager: 'Arjun Mehta', employeeCode: 'EMP-2026-089',
  },
  {
    id: 'EMP-002', name: 'Arjun Mehta', role: 'Engineering Manager', department: 'Engineering',
    email: 'arjun.mehta@company.com', phone: '+91 98100 23456', avatar: m(11),
    status: 'Active', joinDate: '10 Jan 2019', location: 'Gurugram, Haryana', salary: 3200000, manager: 'Rohan Kapoor', employeeCode: 'EMP-2019-012',
  },
  {
    id: 'EMP-003', name: 'Rahul Verma', role: 'Staff Frontend Engineer', department: 'Engineering',
    email: 'rahul.verma@company.com', phone: '+91 98201 34567', avatar: m(22),
    status: 'Active', joinDate: '01 Feb 2020', location: 'Pune, Maharashtra', salary: 2600000, manager: 'Arjun Mehta', employeeCode: 'EMP-2020-045',
  },
  {
    id: 'EMP-004', name: 'Neha Iyer', role: 'Lead HR Operations', department: 'Human Resources',
    email: 'neha.iyer@company.com', phone: '+91 98450 45678', avatar: f(44),
    status: 'Active', joinDate: '12 Sep 2021', location: 'Chennai, Tamil Nadu', salary: 1800000, manager: 'Priya Sharma', employeeCode: 'EMP-2021-112',
  },
  {
    id: 'EMP-005', name: 'Vikram Singh', role: 'Senior Backend Developer', department: 'Engineering',
    email: 'vikram.singh@company.com', phone: '+91 98710 56789', avatar: m(55),
    status: 'Remote', joinDate: '18 Nov 2022', location: 'Jaipur, Rajasthan', salary: 2400000, manager: 'Arjun Mehta', employeeCode: 'EMP-2022-156',
  },
  {
    id: 'EMP-006', name: 'Priya Sharma', role: 'Head of Human Resources', department: 'Human Resources',
    email: 'priya.sharma@company.com', phone: '+91 98330 67890', avatar: f(26),
    status: 'Active', joinDate: '01 Jun 2017', location: 'Mumbai, Maharashtra', salary: 3600000, manager: 'CEO Office', employeeCode: 'EMP-2017-003',
  },
  {
    id: 'EMP-007', name: 'Ananya Rao', role: 'Product Marketing Manager', department: 'Marketing',
    email: 'ananya.rao@company.com', phone: '+91 99000 78901', avatar: f(39),
    status: 'On Leave', joinDate: '04 Apr 2022', location: 'Hyderabad, Telangana', salary: 2000000, manager: 'Karan Malhotra', employeeCode: 'EMP-2022-132',
  },
  {
    id: 'EMP-008', name: 'Siddharth Joshi', role: 'Financial Analyst', department: 'Finance',
    email: 'siddharth.joshi@company.com', phone: '+91 98670 89012', avatar: m(43),
    status: 'Active', joinDate: '22 Aug 2023', location: 'Ahmedabad, Gujarat', salary: 1400000, manager: 'Meera Nair', employeeCode: 'EMP-2023-201',
  },
  {
    id: 'EMP-009', name: 'Kavya Nair', role: 'AI Platform Lead', department: 'AI/ML',
    email: 'kavya.nair@company.com', phone: '+91 98860 11223', avatar: f(17),
    status: 'Active', joinDate: '08 Jul 2021', location: 'Bengaluru, Karnataka', salary: 2800000, manager: 'Arjun Mehta', employeeCode: 'EMP-2021-126',
  },
  {
    id: 'EMP-010', name: 'Rohit Bansal', role: 'Frontend Engineer', department: 'Engineering',
    email: 'rohit.bansal@company.com', phone: '+91 98711 22334', avatar: m(67),
    status: 'Remote', joinDate: '16 Jan 2024', location: 'Noida, Uttar Pradesh', salary: 1650000, manager: 'Rahul Verma', employeeCode: 'EMP-2024-214',
  },
  {
    id: 'EMP-011', name: 'Ishita Sen', role: 'Backend Engineer', department: 'Engineering',
    email: 'ishita.sen@company.com', phone: '+91 98300 33445', avatar: f(52),
    status: 'Active', joinDate: '03 Oct 2023', location: 'Kolkata, West Bengal', salary: 1700000, manager: 'Vikram Singh', employeeCode: 'EMP-2023-228',
  },
  {
    id: 'EMP-012', name: 'Dev Malhotra', role: 'Machine Learning Engineer', department: 'AI/ML',
    email: 'dev.malhotra@company.com', phone: '+91 98180 44556', avatar: m(78),
    status: 'On Leave', joinDate: '21 May 2024', location: 'Delhi, India', salary: 1850000, manager: 'Kavya Nair', employeeCode: 'EMP-2024-245',
  },
];
