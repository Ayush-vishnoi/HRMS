-- ============================================================================
-- HRMS POSTGRESQL INITIAL SEED DATA
-- Populates initial employees, attendance, leaves, teams, payslips, kras, etc.
-- ============================================================================

-- 1. EMPLOYEES
INSERT INTO "employees" ("id", "employee_code", "name", "email", "role_title", "user_role", "department", "phone", "avatar_url", "status", "join_date", "location", "salary", "manager_id") VALUES
('EMP-006', 'EMP-2017-003', 'Priya Sharma', 'priya.sharma@company.com', 'Head of Human Resources', 'admin', 'Human Resources', '+91 98330 67890', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', 'Active', '01 Jun 2017', 'Mumbai, Maharashtra', 3600000.00, NULL),
('EMP-002', 'EMP-2019-012', 'Arjun Mehta', 'arjun.mehta@company.com', 'Engineering Manager', 'manager', 'Engineering', '+91 98100 23456', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', 'Active', '10 Jan 2019', 'Gurugram, Haryana', 3200000.00, 'EMP-006'),
('EMP-001', 'EMP-2026-089', 'Ayush Vishnoi', 'ayush.vishnoi@company.com', 'AI/ML Intern Developer', 'employee', 'AI/ML', '+91 98765 43210', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80', 'Active', '15 Mar 2026', 'Bengaluru, Karnataka', 550000.00, 'EMP-002'),
('EMP-003', 'EMP-2020-045', 'Rahul Verma', 'rahul.verma@company.com', 'Staff Frontend Engineer', 'employee', 'Engineering', '+91 98201 34567', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', 'Active', '01 Feb 2020', 'Pune, Maharashtra', 2600000.00, 'EMP-002'),
('EMP-004', 'EMP-2021-112', 'Neha Iyer', 'neha.iyer@company.com', 'Lead HR Operations', 'employee', 'Human Resources', '+91 98450 45678', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80', 'Active', '12 Sep 2021', 'Chennai, Tamil Nadu', 1800000.00, 'EMP-006'),
('EMP-005', 'EMP-2022-156', 'Vikram Singh', 'vikram.singh@company.com', 'Senior Backend Developer', 'employee', 'Engineering', '+91 98710 56789', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80', 'Remote', '18 Nov 2022', 'Jaipur, Rajasthan', 2400000.00, 'EMP-002'),
('EMP-007', 'EMP-2022-132', 'Ananya Rao', 'ananya.rao@company.com', 'Product Marketing Manager', 'employee', 'Marketing', '+91 99000 78901', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', 'On Leave', '04 Apr 2022', 'Hyderabad, Telangana', 2000000.00, 'EMP-002'),
('EMP-008', 'EMP-2023-201', 'Siddharth Joshi', 'siddharth.joshi@company.com', 'Financial Analyst', 'employee', 'Finance', '+91 98670 89012', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', 'Active', '22 Aug 2023', 'Ahmedabad, Gujarat', 1400000.00, 'EMP-006'),
('EMP-009', 'EMP-2021-126', 'Kavya Nair', 'kavya.nair@company.com', 'AI Platform Lead', 'employee', 'AI/ML', '+91 98860 11223', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', 'Active', '08 Jul 2021', 'Bengaluru, Karnataka', 2800000.00, 'EMP-002'),
('EMP-010', 'EMP-2024-214', 'Rohit Bansal', 'rohit.bansal@company.com', 'Frontend Engineer', 'employee', 'Engineering', '+91 98711 22334', 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150&auto=format&fit=crop&q=80', 'Remote', '16 Jan 2024', 'Noida, Uttar Pradesh', 1650000.00, 'EMP-003'),
('EMP-011', 'EMP-2023-228', 'Ishita Sen', 'ishita.sen@company.com', 'Backend Engineer', 'employee', 'Engineering', '+91 98300 33445', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', 'Active', '03 Oct 2023', 'Kolkata, West Bengal', 1700000.00, 'EMP-005'),
('EMP-012', 'EMP-2024-245', 'Dev Malhotra', 'dev.malhotra@company.com', 'Machine Learning Engineer', 'employee', 'AI/ML', '+91 98180 44556', 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80', 'On Leave', '21 May 2024', 'Delhi, India', 1850000.00, 'EMP-009')
ON CONFLICT ("id") DO NOTHING;

-- 2. LEAVE BALANCES
INSERT INTO "leave_balances" ("id", "employee_id", "year", "leave_type", "total", "used", "remaining") VALUES
('LB-001', 'EMP-001', 2026, 'Casual', 12, 4, 8),
('LB-002', 'EMP-001', 2026, 'Sick', 10, 1, 9),
('LB-003', 'EMP-001', 2026, 'Earned', 20, 5, 15),
('LB-004', 'EMP-001', 2026, 'WFH', 12, 8, 4)
ON CONFLICT ("employee_id", "year", "leave_type") DO NOTHING;

-- 3. ATTENDANCE RECORDS
INSERT INTO "attendance_records" ("id", "employee_id", "date", "check_in", "check_out", "hours_worked", "status", "location") VALUES
('ATT-001', 'EMP-001', '2026-08-06', '09:02 AM', 'In Progress', '7h 20m', 'On Time', 'Bengaluru HQ'),
('ATT-002', 'EMP-001', '2026-08-05', '09:00 AM', '06:15 PM', '9h 15m', 'On Time', 'Bengaluru HQ'),
('ATT-003', 'EMP-001', '2026-08-04', '09:35 AM', '06:30 PM', '8h 55m', 'Late', 'Bengaluru HQ'),
('ATT-004', 'EMP-001', '2026-08-03', '08:55 AM', '05:45 PM', '8h 50m', 'On Time', 'Work from Home'),
('ATT-005', 'EMP-001', '2026-07-31', '09:10 AM', '06:00 PM', '8h 50m', 'On Time', 'Bengaluru HQ'),
('ATT-006', 'EMP-001', '2026-07-30', '09:05 AM', '01:30 PM', '4h 25m', 'Half Day', 'Bengaluru HQ')
ON CONFLICT ("id") DO NOTHING;

-- 4. LEAVE REQUESTS
INSERT INTO "leave_requests" ("id", "employee_id", "leave_type", "start_date", "end_date", "days", "reason", "status", "applied_on", "reviewer_id") VALUES
('LR-101', 'EMP-007', 'Earned', '2026-08-10', '2026-08-14', 5, 'Annual family visit to Kerala', 'Pending', '2026-08-04', NULL),
('LR-102', 'EMP-003', 'Sick', '2026-08-07', '2026-08-07', 1, 'Dental appointment & wisdom tooth recovery', 'Pending', '2026-08-05', NULL),
('LR-103', 'EMP-001', 'Casual', '2026-07-20', '2026-07-21', 2, 'Personal home relocation work', 'Approved', '2026-07-15', 'EMP-002'),
('LR-104', 'EMP-005', 'WFH', '2026-08-01', '2026-08-02', 2, 'Internet upgrade & maintenance at residence', 'Approved', '2026-07-28', 'EMP-002')
ON CONFLICT ("id") DO NOTHING;

-- 5. MANAGED TEAMS
INSERT INTO "managed_teams" ("id", "name", "department", "manager_id", "leader_id", "focus") VALUES
('TEAM-PLATFORM', 'Experience Platform', 'Engineering', 'EMP-002', 'EMP-003', 'Design system adoption, accessibility, and employee experience delivery'),
('TEAM-SERVICES', 'Core Services', 'Engineering', 'EMP-002', 'EMP-005', 'Reliable payroll, attendance, and people-platform services'),
('TEAM-AI', 'AI Enablement', 'AI/ML', 'EMP-002', 'EMP-009', 'Production ML capabilities and responsible workforce insights')
ON CONFLICT ("id") DO NOTHING;

-- 6. TEAM MEMBERS
INSERT INTO "team_members" ("id", "team_id", "employee_id") VALUES
('TM-001', 'TEAM-PLATFORM', 'EMP-001'),
('TM-002', 'TEAM-PLATFORM', 'EMP-010'),
('TM-003', 'TEAM-SERVICES', 'EMP-011'),
('TM-004', 'TEAM-AI', 'EMP-012')
ON CONFLICT ("team_id", "employee_id") DO NOTHING;

-- 7. TEAM MEMBER METADATA
INSERT INTO "team_member_metadata" ("id", "employee_id", "manager_id", "focus", "workload", "goal_progress", "goal_label", "next_one_to_one", "risk", "notes") VALUES
('TMM-001', 'EMP-001', 'EMP-002', 'ML model monitoring and HRMS onboarding insights', 72, 68, 'Ship onboarding analytics beta', '12 Aug 2026', 'On track', 'Pair with Rahul on the new dashboard data contract.'),
('TMM-002', 'EMP-003', 'EMP-002', 'Frontend platform and accessibility improvements', 88, 82, 'Complete design system migration', '10 Aug 2026', 'Needs attention', 'Review sprint scope after the current release candidate.'),
('TMM-003', 'EMP-005', 'EMP-002', 'Payroll services reliability and API performance', 61, 74, 'Reduce payroll API p95 latency', '14 Aug 2026', 'On track', 'Share the incident follow-up with the platform team.'),
('TMM-004', 'EMP-009', 'EMP-002', 'AI platform roadmap and responsible model delivery', 79, 71, 'Launch model governance controls', '13 Aug 2026', 'On track', 'Align the next model review with Security and People Operations.')
ON CONFLICT ("employee_id", "manager_id") DO NOTHING;

-- 8. MEETINGS & ATTENDEES
INSERT INTO "meetings" ("id", "title", "type", "description", "starts_at", "ends_at", "all_day", "location", "video_link", "organizer_id", "department", "recurrence", "reminder_minutes", "status") VALUES
('MTG-001', 'AI Platform Sprint Planning', 'TEAM', 'Align on sprint scope, model evaluation milestones, and delivery owners.', '2026-08-08 10:00:00+05:30', '2026-08-08 11:00:00+05:30', FALSE, 'Bengaluru HQ, War Room 2', 'https://meet.company.com/ai-platform-sprint', 'EMP-002', 'AI/ML', 'WEEKLY', 15, 'UPCOMING'),
('MTG-002', 'Independence Day Office Closure', 'ORG_EVENT', 'Company holiday across all India offices.', '2026-08-15 00:00:00+05:30', '2026-08-15 23:59:59+05:30', TRUE, NULL, NULL, 'EMP-006', NULL, 'NONE', 15, 'UPCOMING'),
('MTG-003', 'Product Design Critique', 'TEAM', 'Review the employee self-service calendar flows before handoff.', '2026-08-10 14:30:00+05:30', '2026-08-10 15:30:00+05:30', FALSE, 'Google Meet', 'https://meet.company.com/design-critique', 'EMP-004', 'Design', 'NONE', 15, 'UPCOMING')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "meeting_attendees" ("id", "meeting_id", "employee_id", "rsvp") VALUES
('MA-001', 'MTG-001', 'EMP-001', 'ACCEPTED'),
('MA-002', 'MTG-001', 'EMP-003', 'PENDING'),
('MA-003', 'MTG-001', 'EMP-004', 'PENDING'),
('MA-004', 'MTG-003', 'EMP-001', 'PENDING'),
('MA-005', 'MTG-003', 'EMP-005', 'PENDING')
ON CONFLICT ("meeting_id", "employee_id") DO NOTHING;

-- 9. PAYSLIPS
INSERT INTO "payslips" ("id", "employee_id", "month_year", "basic_salary", "hra", "conveyance", "special_allowance", "pf_deduction", "tax_deduction", "gross_earnings", "total_deductions", "net_payable", "payment_date", "status") VALUES
('PAY-2026-07', 'EMP-001', 'July 2026', 55000.00, 22000.00, 5000.00, 13833.00, 6600.00, 13400.00, 95833.00, 20000.00, 75833.00, '31 July 2026', 'Paid'),
('PAY-2026-06', 'EMP-001', 'June 2026', 55000.00, 22000.00, 5000.00, 13833.00, 6600.00, 13400.00, 95833.00, 20000.00, 75833.00, '30 June 2026', 'Paid'),
('PAY-2026-05', 'EMP-001', 'May 2026', 55000.00, 22000.00, 5000.00, 13833.00, 6600.00, 13400.00, 95833.00, 20000.00, 75833.00, '31 May 2026', 'Paid')
ON CONFLICT ("employee_id", "month_year") DO NOTHING;

-- 10. KRAs
INSERT INTO "performance_kras" ("id", "title", "description", "key_result", "category", "assigned_to_id", "assigned_by_id", "assigned_on", "due_date", "priority", "status", "progress", "weightage", "last_update", "deliverables") VALUES
('KRA-1042', 'Improve employee attrition prediction model', 'Enhance the existing attrition-risk model and prepare it for controlled HR analytics testing.', 'Achieve at least 88% validation accuracy while keeping false positives below 12%.', 'AI/ML Delivery', 'EMP-001', 'EMP-002', '01 Aug 2026', '20 Aug 2026', 'Critical', 'In Progress', 72, 30, 'Feature engineering completed; validating class-balanced model variants.', ARRAY['Cleaned training dataset', 'Model evaluation report', 'Inference notebook and handover notes']::TEXT[]),
('KRA-1038', 'Build resume-to-JD matching prototype', 'Create a frontend-ready scoring service prototype for the recruitment screening workflow.', 'Return an explainable match score, matched skills, missing skills, and candidate summary.', 'Product Innovation', 'EMP-001', 'EMP-006', '28 Jul 2026', '28 Aug 2026', 'High', 'In Progress', 48, 25, 'Completed skill extraction; working on weighted JD criteria.', ARRAY['Matching logic prototype', 'Sample API response schema', 'Accuracy test with 25 sample resumes']::TEXT[])
ON CONFLICT ("id") DO NOTHING;

-- 11. ASSETS
INSERT INTO "assets" ("id", "asset_tag", "category", "name", "brand", "model", "serial_number", "purchase_date", "purchase_cost", "warranty_until", "status", "assigned_to_id", "location", "condition", "last_checked", "notes") VALUES
('AST-001', 'APX-LT-1042', 'Laptop', 'MacBook Pro 14-inch', 'Apple', 'M3 Pro / 18GB / 512GB', 'C02X7A1QMD6T', '12 Jan 2026', '₹1,84,900', '11 Jan 2029', 'Assigned', 'EMP-001', 'Bengaluru Office', 'Good', '08 Aug 2026', 'Primary development machine. VPN and endpoint security enabled.'),
('AST-002', 'APX-LT-1031', 'Laptop', 'ThinkPad X1 Carbon', 'Lenovo', 'Gen 11 / 16GB / 1TB', 'PF4K8M2L', '05 Nov 2025', '₹1,32,500', '04 Nov 2028', 'Assigned', 'EMP-002', 'Bengaluru Office', 'Good', '01 Aug 2026', 'Manager device with docking station.'),
('AST-003', 'APX-MN-2088', 'Monitor', 'UltraSharp 27 Monitor', 'Dell', 'U2723QE 4K USB-C', 'CN0U2723ABC', '22 Feb 2026', '₹48,000', '21 Feb 2029', 'Available', NULL, 'IT Store - Bengaluru', 'New', '05 Aug 2026', 'Ready for the next onboarding batch.')
ON CONFLICT ("id") DO NOTHING;

-- 12. RECRUITMENT JOBS & CANDIDATES
INSERT INTO "recruitment_jobs" ("id", "title", "department", "location", "employment_type", "openings", "applicants", "status", "posted_on", "description", "requirements") VALUES
('JOB-001', 'Senior Frontend Engineer', 'Engineering', 'Bengaluru / Hybrid', 'Full-time', 2, 24, 'Open', '01 Aug 2026', 'Build accessible, high-performance experiences for the MYLOTIC GROUP HR platform.', ARRAY['React', 'TypeScript', 'Next.js', 'Testing', 'System design']::TEXT[]),
('JOB-002', 'AI/ML Engineer', 'AI/ML', 'Bengaluru / Remote', 'Full-time', 1, 18, 'Open', '28 Jul 2026', 'Develop practical ML systems that improve people operations and employee insights.', ARRAY['Python', 'Machine learning', 'SQL', 'Model deployment', 'Experimentation']::TEXT[])
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "recruitment_candidates" ("id", "job_id", "name", "email", "phone", "avatar_url", "applied_on", "stage", "score", "experience", "current_role", "location", "matched_skills", "missing_skills", "summary", "recommendation") VALUES
('CAN-001', 'JOB-001', 'Kavya Menon', 'kavya.menon@email.com', '+91 98450 12345', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', '06 Aug 2026', 'Screening', 92, '6 years', 'Senior UI Engineer at Fintech Labs', 'Bengaluru, Karnataka', ARRAY['React', 'TypeScript', 'Next.js', 'Testing']::TEXT[], ARRAY['System design evidence']::TEXT[], 'Strong product engineering background with measurable accessibility and performance improvements.', 'Strong match'),
('CAN-002', 'JOB-001', 'Aditya Kulkarni', 'aditya.k@email.com', '+91 98220 22556', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', '05 Aug 2026', 'Interview', 84, '5 years', 'Frontend Developer at Orbit Systems', 'Pune, Maharashtra', ARRAY['React', 'TypeScript', 'Testing']::TEXT[], ARRAY['Next.js depth']::TEXT[], 'Solid frontend fundamentals and delivery experience; validate architecture ownership during interview.', 'Strong match')
ON CONFLICT ("id") DO NOTHING;

-- 13. POLICIES
INSERT INTO "company_policies" ("id", "title", "summary", "category", "version", "effective_date", "updated_on", "uploaded_by_id", "mandatory", "acknowledgement_required", "file_name", "file_size") VALUES
('POL-001', 'Code of Conduct and Ethics', 'Standards for professional conduct, conflicts of interest, and responsible decision-making at MYLOTIC GROUP PVT.LTD.', 'Code of Conduct', 'v3.2', '01 Aug 2026', '01 Aug 2026', 'EMP-006', TRUE, TRUE, 'code-of-conduct-v3.2.pdf', '1.2 MB'),
('POL-002', 'Leave and Attendance Policy', 'Guidance on working hours, attendance, leave types, late arrival permissions, and attendance corrections.', 'Leave & Attendance', 'v2.4', '15 Jul 2026', '15 Jul 2026', 'EMP-006', TRUE, TRUE, 'leave-attendance-policy-v2.4.pdf', '980 KB')
ON CONFLICT ("id") DO NOTHING;

-- 14. DOCUMENTS
INSERT INTO "employee_documents" ("id", "employee_id", "name", "type", "file_url", "size", "status", "note", "uploaded_on") VALUES
('DOC-204', 'EMP-001', 'Aadhaar Card.pdf', 'Identity Proof', NULL, '1.8 MB', 'Verified', 'Identity proof verified by HR Operations.', '02 Aug 2026'),
('DOC-201', 'EMP-001', 'Internship Agreement.pdf', 'Employment Document', NULL, '920 KB', 'Under Review', 'HR is checking the signed agreement.', '15 Jul 2026')
ON CONFLICT ("id") DO NOTHING;
