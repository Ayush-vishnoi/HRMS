import type { Response } from 'express';
import { RecruitmentService } from './recruitment.service';
interface UploadedResumeFile {
    fieldname: string;
    originalname: string;
    mimetype: string;
    size: number;
    filename: string;
    path: string;
}
export declare class RecruitmentController {
    private recruitmentService;
    constructor(recruitmentService: RecruitmentService);
    getDashboard(jobId?: string, stage?: string): Promise<{
        success: boolean;
        data: {
            jobs: ({
                recruitment_job_approvals: ({
                    employees: {
                        id: string;
                        name: string;
                        employeeCode: string;
                        email: string;
                        roleTitle: string;
                        userRole: import("@prisma/client").$Enums.UserRole;
                        department: string;
                        avatarUrl: string | null;
                        status: import("@prisma/client").$Enums.EmploymentStatus;
                    };
                } & {
                    id: string;
                    status: import("@prisma/client").$Enums.ApprovalStatus;
                    note: string | null;
                    created_at: Date;
                    updated_at: Date;
                    sequence: number;
                    approver_id: string;
                    acted_at: Date | null;
                    job_id: string;
                })[];
                requisitionApproval: {
                    id: string;
                    createdAt: Date;
                    status: import("@prisma/client").$Enums.RequisitionApprovalStatus;
                    onBehalfOfId: string | null;
                    note: string | null;
                    requestedById: string;
                    currency: string;
                    jobId: string;
                    requestedOpenings: number;
                    requestedSalaryMin: import("@prisma/client/runtime/library").Decimal | null;
                    requestedSalaryMax: import("@prisma/client/runtime/library").Decimal | null;
                    approvedOpenings: number | null;
                    approvedSalaryMin: import("@prisma/client/runtime/library").Decimal | null;
                    approvedSalaryMax: import("@prisma/client/runtime/library").Decimal | null;
                    decidedById: string | null;
                    decidedAt: Date | null;
                } | null;
                candidates: {
                    id: string;
                    stage: import("@prisma/client").$Enums.CandidateStage;
                }[];
                hiringManager: {
                    id: string;
                    name: string;
                    employeeCode: string;
                    email: string;
                    roleTitle: string;
                    userRole: import("@prisma/client").$Enums.UserRole;
                    department: string;
                    avatarUrl: string | null;
                    status: import("@prisma/client").$Enums.EmploymentStatus;
                } | null;
                recruiter: {
                    id: string;
                    name: string;
                    employeeCode: string;
                    email: string;
                    roleTitle: string;
                    userRole: import("@prisma/client").$Enums.UserRole;
                    department: string;
                    avatarUrl: string | null;
                    status: import("@prisma/client").$Enums.EmploymentStatus;
                } | null;
            } & {
                id: string;
                title: string;
                createdAt: Date;
                department: string;
                status: import("@prisma/client").$Enums.JobStatus;
                location: string;
                updatedAt: Date;
                description: string;
                priority: string;
                currency: string;
                employmentType: import("@prisma/client").$Enums.JobEmploymentType;
                openings: number;
                applicants: number;
                postedOn: string;
                requirements: string[];
                responsibilities: string[];
                experience_min: number | null;
                experience_max: number | null;
                salary_min: import("@prisma/client/runtime/library").Decimal | null;
                salary_max: import("@prisma/client/runtime/library").Decimal | null;
                hiring_manager_id: string | null;
                recruiter_id: string | null;
                target_close_date: Date | null;
            })[];
            candidates: ({
                onboarding: ({
                    employee: {
                        id: string;
                        name: string;
                        employeeCode: string;
                        email: string;
                        roleTitle: string;
                        userRole: import("@prisma/client").$Enums.UserRole;
                        department: string;
                        avatarUrl: string | null;
                        status: import("@prisma/client").$Enums.EmploymentStatus;
                    } | null;
                } & {
                    id: string;
                    status: import("@prisma/client").$Enums.OnboardingStatus;
                    employeeId: string | null;
                    confirmation_date: Date | null;
                    updated_at: Date;
                    stage: import("@prisma/client").$Enums.OnboardingStage;
                    candidateId: string;
                    onboardedById: string | null;
                    onboardedAt: Date;
                    actual_joining_date: Date | null;
                    buddy_employee_id: string | null;
                    expected_joining_date: Date | null;
                    manager_employee_id: string | null;
                    offer_id: string | null;
                    probation_extended_to: Date | null;
                    probation_outcome: import("@prisma/client").$Enums.ProbationOutcome;
                    probation_review_date: Date | null;
                    probation_start_date: Date | null;
                    welcome_email_triggered_at: Date | null;
                }) | null;
                job: {
                    id: string;
                    title: string;
                    createdAt: Date;
                    department: string;
                    status: import("@prisma/client").$Enums.JobStatus;
                    location: string;
                    updatedAt: Date;
                    description: string;
                    priority: string;
                    currency: string;
                    employmentType: import("@prisma/client").$Enums.JobEmploymentType;
                    openings: number;
                    applicants: number;
                    postedOn: string;
                    requirements: string[];
                    responsibilities: string[];
                    experience_min: number | null;
                    experience_max: number | null;
                    salary_min: import("@prisma/client/runtime/library").Decimal | null;
                    salary_max: import("@prisma/client/runtime/library").Decimal | null;
                    hiring_manager_id: string | null;
                    recruiter_id: string | null;
                    target_close_date: Date | null;
                };
                assignedRecruiter: {
                    id: string;
                    name: string;
                    employeeCode: string;
                    email: string;
                    roleTitle: string;
                    userRole: import("@prisma/client").$Enums.UserRole;
                    department: string;
                    avatarUrl: string | null;
                    status: import("@prisma/client").$Enums.EmploymentStatus;
                } | null;
                matches: {
                    id: string;
                    jobId: string;
                    matchedSkills: string[];
                    missingSkills: string[];
                    candidateId: string;
                    calculatedAt: Date;
                    overallScore: number;
                    skillScore: number;
                    experienceScore: number;
                    educationScore: number;
                    locationScore: number;
                    experienceGap: string | null;
                    explanation: string;
                    engineVersion: string;
                }[];
                resumeDocument: {
                    id: string;
                    uploadedById: string | null;
                    fileName: string;
                    fileSize: number;
                    candidateId: string;
                    fileType: string;
                    storagePath: string;
                    fileHash: string;
                    uploadedAt: Date;
                    parsingStatus: string;
                    parserVersion: string;
                    parsingError: string | null;
                    rawTextSample: string | null;
                } | null;
            } & {
                id: string;
                createdAt: Date;
                name: string;
                email: string;
                phone: string;
                avatarUrl: string | null;
                location: string;
                updatedAt: Date;
                appliedOn: string;
                source: import("@prisma/client").$Enums.CandidateSource;
                jobId: string;
                stage: import("@prisma/client").$Enums.CandidateStage;
                score: number;
                experience: string;
                currentRole: string;
                matchedSkills: string[];
                missingSkills: string[];
                summary: string;
                recommendation: import("@prisma/client").$Enums.CandidateRecommendation;
                tags: string[];
                assigned_recruiter_id: string | null;
                ai_match_score: number | null;
                duplicate_key: string | null;
                parsed_resume: import("@prisma/client/runtime/library").JsonValue | null;
                referrer_id: string | null;
                resumeUrl: string | null;
                talent_pool: boolean;
            })[];
        };
    }>;
    getMyApprovals(user: any): Promise<{
        jobs: {
            id: any;
            level: any;
            title: any;
            context: any;
        }[];
        offers: {
            id: any;
            level: any;
            title: any;
            candidate: any;
            context: any;
        }[];
    }>;
    getCeoApprovalQueue(): Promise<any[]>;
    decideCeoApproval(user: any, candidateId: string, body: {
        decision: 'Approved' | 'Rejected';
        note?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        status: import("@prisma/client").$Enums.OnboardingApprovalStatus;
        onBehalfOfId: string | null;
        note: string | null;
        candidateId: string;
        decidedById: string | null;
        decidedAt: Date | null;
        offerId: string | null;
    }>;
    getJobs(): Promise<{
        jobs: ({
            recruitment_job_approvals: ({
                employees: {
                    id: string;
                    name: string;
                    employeeCode: string;
                    email: string;
                    roleTitle: string;
                    userRole: import("@prisma/client").$Enums.UserRole;
                    department: string;
                    avatarUrl: string | null;
                    status: import("@prisma/client").$Enums.EmploymentStatus;
                };
            } & {
                id: string;
                status: import("@prisma/client").$Enums.ApprovalStatus;
                note: string | null;
                created_at: Date;
                updated_at: Date;
                sequence: number;
                approver_id: string;
                acted_at: Date | null;
                job_id: string;
            })[];
            requisitionApproval: {
                id: string;
                createdAt: Date;
                status: import("@prisma/client").$Enums.RequisitionApprovalStatus;
                onBehalfOfId: string | null;
                note: string | null;
                requestedById: string;
                currency: string;
                jobId: string;
                requestedOpenings: number;
                requestedSalaryMin: import("@prisma/client/runtime/library").Decimal | null;
                requestedSalaryMax: import("@prisma/client/runtime/library").Decimal | null;
                approvedOpenings: number | null;
                approvedSalaryMin: import("@prisma/client/runtime/library").Decimal | null;
                approvedSalaryMax: import("@prisma/client/runtime/library").Decimal | null;
                decidedById: string | null;
                decidedAt: Date | null;
            } | null;
            candidates: {
                id: string;
                stage: import("@prisma/client").$Enums.CandidateStage;
            }[];
            hiringManager: {
                id: string;
                name: string;
                employeeCode: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                department: string;
                avatarUrl: string | null;
                status: import("@prisma/client").$Enums.EmploymentStatus;
            } | null;
            recruiter: {
                id: string;
                name: string;
                employeeCode: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                department: string;
                avatarUrl: string | null;
                status: import("@prisma/client").$Enums.EmploymentStatus;
            } | null;
        } & {
            id: string;
            title: string;
            createdAt: Date;
            department: string;
            status: import("@prisma/client").$Enums.JobStatus;
            location: string;
            updatedAt: Date;
            description: string;
            priority: string;
            currency: string;
            employmentType: import("@prisma/client").$Enums.JobEmploymentType;
            openings: number;
            applicants: number;
            postedOn: string;
            requirements: string[];
            responsibilities: string[];
            experience_min: number | null;
            experience_max: number | null;
            salary_min: import("@prisma/client/runtime/library").Decimal | null;
            salary_max: import("@prisma/client/runtime/library").Decimal | null;
            hiring_manager_id: string | null;
            recruiter_id: string | null;
            target_close_date: Date | null;
        })[];
        candidates: ({
            onboarding: ({
                employee: {
                    id: string;
                    name: string;
                    employeeCode: string;
                    email: string;
                    roleTitle: string;
                    userRole: import("@prisma/client").$Enums.UserRole;
                    department: string;
                    avatarUrl: string | null;
                    status: import("@prisma/client").$Enums.EmploymentStatus;
                } | null;
            } & {
                id: string;
                status: import("@prisma/client").$Enums.OnboardingStatus;
                employeeId: string | null;
                confirmation_date: Date | null;
                updated_at: Date;
                stage: import("@prisma/client").$Enums.OnboardingStage;
                candidateId: string;
                onboardedById: string | null;
                onboardedAt: Date;
                actual_joining_date: Date | null;
                buddy_employee_id: string | null;
                expected_joining_date: Date | null;
                manager_employee_id: string | null;
                offer_id: string | null;
                probation_extended_to: Date | null;
                probation_outcome: import("@prisma/client").$Enums.ProbationOutcome;
                probation_review_date: Date | null;
                probation_start_date: Date | null;
                welcome_email_triggered_at: Date | null;
            }) | null;
            job: {
                id: string;
                title: string;
                createdAt: Date;
                department: string;
                status: import("@prisma/client").$Enums.JobStatus;
                location: string;
                updatedAt: Date;
                description: string;
                priority: string;
                currency: string;
                employmentType: import("@prisma/client").$Enums.JobEmploymentType;
                openings: number;
                applicants: number;
                postedOn: string;
                requirements: string[];
                responsibilities: string[];
                experience_min: number | null;
                experience_max: number | null;
                salary_min: import("@prisma/client/runtime/library").Decimal | null;
                salary_max: import("@prisma/client/runtime/library").Decimal | null;
                hiring_manager_id: string | null;
                recruiter_id: string | null;
                target_close_date: Date | null;
            };
            assignedRecruiter: {
                id: string;
                name: string;
                employeeCode: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                department: string;
                avatarUrl: string | null;
                status: import("@prisma/client").$Enums.EmploymentStatus;
            } | null;
            matches: {
                id: string;
                jobId: string;
                matchedSkills: string[];
                missingSkills: string[];
                candidateId: string;
                calculatedAt: Date;
                overallScore: number;
                skillScore: number;
                experienceScore: number;
                educationScore: number;
                locationScore: number;
                experienceGap: string | null;
                explanation: string;
                engineVersion: string;
            }[];
            resumeDocument: {
                id: string;
                uploadedById: string | null;
                fileName: string;
                fileSize: number;
                candidateId: string;
                fileType: string;
                storagePath: string;
                fileHash: string;
                uploadedAt: Date;
                parsingStatus: string;
                parserVersion: string;
                parsingError: string | null;
                rawTextSample: string | null;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            name: string;
            email: string;
            phone: string;
            avatarUrl: string | null;
            location: string;
            updatedAt: Date;
            appliedOn: string;
            source: import("@prisma/client").$Enums.CandidateSource;
            jobId: string;
            stage: import("@prisma/client").$Enums.CandidateStage;
            score: number;
            experience: string;
            currentRole: string;
            matchedSkills: string[];
            missingSkills: string[];
            summary: string;
            recommendation: import("@prisma/client").$Enums.CandidateRecommendation;
            tags: string[];
            assigned_recruiter_id: string | null;
            ai_match_score: number | null;
            duplicate_key: string | null;
            parsed_resume: import("@prisma/client/runtime/library").JsonValue | null;
            referrer_id: string | null;
            resumeUrl: string | null;
            talent_pool: boolean;
        })[];
    }>;
    createJob(body: any, user: any): Promise<{
        success: boolean;
        data: {
            id: string;
            title: string;
            createdAt: Date;
            department: string;
            status: import("@prisma/client").$Enums.JobStatus;
            location: string;
            updatedAt: Date;
            description: string;
            priority: string;
            currency: string;
            employmentType: import("@prisma/client").$Enums.JobEmploymentType;
            openings: number;
            applicants: number;
            postedOn: string;
            requirements: string[];
            responsibilities: string[];
            experience_min: number | null;
            experience_max: number | null;
            salary_min: import("@prisma/client/runtime/library").Decimal | null;
            salary_max: import("@prisma/client/runtime/library").Decimal | null;
            hiring_manager_id: string | null;
            recruiter_id: string | null;
            target_close_date: Date | null;
        };
    }>;
    getRequisitionApprovalQueue(): Promise<{
        id: string;
        jobId: string;
        title: string;
        department: string;
        location: string;
        employmentType: import("@prisma/client").$Enums.JobEmploymentType;
        priority: string;
        requirements: string[];
        experienceMin: number | null;
        experienceMax: number | null;
        hiringManager: {
            id: string;
            name: string;
            employeeCode: string;
            email: string;
            roleTitle: string;
            userRole: import("@prisma/client").$Enums.UserRole;
            department: string;
            avatarUrl: string | null;
            status: import("@prisma/client").$Enums.EmploymentStatus;
        } | null;
        requestedBy: string;
        requestedOpenings: number;
        requestedSalaryMin: number | null;
        requestedSalaryMax: number | null;
        currency: string;
        createdAt: Date;
    }[]>;
    decideRequisitionApproval(user: any, jobId: string, body: {
        decision: 'Approved' | 'Rejected';
        note?: string;
        approvedOpenings?: number;
        approvedSalaryMin?: number | null;
        approvedSalaryMax?: number | null;
    }): Promise<{
        jobId: string;
        status: string;
        approvedOpenings: number;
        approvedSalaryMin: number | null;
        approvedSalaryMax: number | null;
    } | {
        jobId: string;
        status: string;
        approvedOpenings?: undefined;
        approvedSalaryMin?: undefined;
        approvedSalaryMax?: undefined;
    }>;
    updateJob(id: string, body: any): Promise<any>;
    deleteJob(id: string): Promise<{
        success: boolean;
    }>;
    jobApprovalAction(id: string, body: any, user: any): Promise<any>;
    rediscover(id: string, minScore?: string): Promise<{
        rediscoveredCandidates: any[];
        success: boolean;
    }>;
    getCandidates(jobId?: string, stage?: string): Promise<({
        onboarding: ({
            employee: {
                id: string;
                name: string;
                employeeCode: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                department: string;
                avatarUrl: string | null;
                status: import("@prisma/client").$Enums.EmploymentStatus;
            } | null;
        } & {
            id: string;
            status: import("@prisma/client").$Enums.OnboardingStatus;
            employeeId: string | null;
            confirmation_date: Date | null;
            updated_at: Date;
            stage: import("@prisma/client").$Enums.OnboardingStage;
            candidateId: string;
            onboardedById: string | null;
            onboardedAt: Date;
            actual_joining_date: Date | null;
            buddy_employee_id: string | null;
            expected_joining_date: Date | null;
            manager_employee_id: string | null;
            offer_id: string | null;
            probation_extended_to: Date | null;
            probation_outcome: import("@prisma/client").$Enums.ProbationOutcome;
            probation_review_date: Date | null;
            probation_start_date: Date | null;
            welcome_email_triggered_at: Date | null;
        }) | null;
        job: {
            id: string;
            title: string;
            createdAt: Date;
            department: string;
            status: import("@prisma/client").$Enums.JobStatus;
            location: string;
            updatedAt: Date;
            description: string;
            priority: string;
            currency: string;
            employmentType: import("@prisma/client").$Enums.JobEmploymentType;
            openings: number;
            applicants: number;
            postedOn: string;
            requirements: string[];
            responsibilities: string[];
            experience_min: number | null;
            experience_max: number | null;
            salary_min: import("@prisma/client/runtime/library").Decimal | null;
            salary_max: import("@prisma/client/runtime/library").Decimal | null;
            hiring_manager_id: string | null;
            recruiter_id: string | null;
            target_close_date: Date | null;
        };
        assignedRecruiter: {
            id: string;
            name: string;
            employeeCode: string;
            email: string;
            roleTitle: string;
            userRole: import("@prisma/client").$Enums.UserRole;
            department: string;
            avatarUrl: string | null;
            status: import("@prisma/client").$Enums.EmploymentStatus;
        } | null;
        matches: {
            id: string;
            jobId: string;
            matchedSkills: string[];
            missingSkills: string[];
            candidateId: string;
            calculatedAt: Date;
            overallScore: number;
            skillScore: number;
            experienceScore: number;
            educationScore: number;
            locationScore: number;
            experienceGap: string | null;
            explanation: string;
            engineVersion: string;
        }[];
        resumeDocument: {
            id: string;
            uploadedById: string | null;
            fileName: string;
            fileSize: number;
            candidateId: string;
            fileType: string;
            storagePath: string;
            fileHash: string;
            uploadedAt: Date;
            parsingStatus: string;
            parserVersion: string;
            parsingError: string | null;
            rawTextSample: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        name: string;
        email: string;
        phone: string;
        avatarUrl: string | null;
        location: string;
        updatedAt: Date;
        appliedOn: string;
        source: import("@prisma/client").$Enums.CandidateSource;
        jobId: string;
        stage: import("@prisma/client").$Enums.CandidateStage;
        score: number;
        experience: string;
        currentRole: string;
        matchedSkills: string[];
        missingSkills: string[];
        summary: string;
        recommendation: import("@prisma/client").$Enums.CandidateRecommendation;
        tags: string[];
        assigned_recruiter_id: string | null;
        ai_match_score: number | null;
        duplicate_key: string | null;
        parsed_resume: import("@prisma/client/runtime/library").JsonValue | null;
        referrer_id: string | null;
        resumeUrl: string | null;
        talent_pool: boolean;
    })[]>;
    createCandidate(body: any, user: any): Promise<{
        job: {
            id: string;
            title: string;
            createdAt: Date;
            department: string;
            status: import("@prisma/client").$Enums.JobStatus;
            location: string;
            updatedAt: Date;
            description: string;
            priority: string;
            currency: string;
            employmentType: import("@prisma/client").$Enums.JobEmploymentType;
            openings: number;
            applicants: number;
            postedOn: string;
            requirements: string[];
            responsibilities: string[];
            experience_min: number | null;
            experience_max: number | null;
            salary_min: import("@prisma/client/runtime/library").Decimal | null;
            salary_max: import("@prisma/client/runtime/library").Decimal | null;
            hiring_manager_id: string | null;
            recruiter_id: string | null;
            target_close_date: Date | null;
        };
    } & {
        id: string;
        createdAt: Date;
        name: string;
        email: string;
        phone: string;
        avatarUrl: string | null;
        location: string;
        updatedAt: Date;
        appliedOn: string;
        source: import("@prisma/client").$Enums.CandidateSource;
        jobId: string;
        stage: import("@prisma/client").$Enums.CandidateStage;
        score: number;
        experience: string;
        currentRole: string;
        matchedSkills: string[];
        missingSkills: string[];
        summary: string;
        recommendation: import("@prisma/client").$Enums.CandidateRecommendation;
        tags: string[];
        assigned_recruiter_id: string | null;
        ai_match_score: number | null;
        duplicate_key: string | null;
        parsed_resume: import("@prisma/client/runtime/library").JsonValue | null;
        referrer_id: string | null;
        resumeUrl: string | null;
        talent_pool: boolean;
    }>;
    getCandidate(id: string): Promise<{
        onboarding: ({
            employee: {
                id: string;
                name: string;
                employeeCode: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                department: string;
                avatarUrl: string | null;
                status: import("@prisma/client").$Enums.EmploymentStatus;
            } | null;
        } & {
            id: string;
            status: import("@prisma/client").$Enums.OnboardingStatus;
            employeeId: string | null;
            confirmation_date: Date | null;
            updated_at: Date;
            stage: import("@prisma/client").$Enums.OnboardingStage;
            candidateId: string;
            onboardedById: string | null;
            onboardedAt: Date;
            actual_joining_date: Date | null;
            buddy_employee_id: string | null;
            expected_joining_date: Date | null;
            manager_employee_id: string | null;
            offer_id: string | null;
            probation_extended_to: Date | null;
            probation_outcome: import("@prisma/client").$Enums.ProbationOutcome;
            probation_review_date: Date | null;
            probation_start_date: Date | null;
            welcome_email_triggered_at: Date | null;
        }) | null;
        job: {
            id: string;
            title: string;
            createdAt: Date;
            department: string;
            status: import("@prisma/client").$Enums.JobStatus;
            location: string;
            updatedAt: Date;
            description: string;
            priority: string;
            currency: string;
            employmentType: import("@prisma/client").$Enums.JobEmploymentType;
            openings: number;
            applicants: number;
            postedOn: string;
            requirements: string[];
            responsibilities: string[];
            experience_min: number | null;
            experience_max: number | null;
            salary_min: import("@prisma/client/runtime/library").Decimal | null;
            salary_max: import("@prisma/client/runtime/library").Decimal | null;
            hiring_manager_id: string | null;
            recruiter_id: string | null;
            target_close_date: Date | null;
        };
        assignedRecruiter: {
            id: string;
            name: string;
            employeeCode: string;
            email: string;
            roleTitle: string;
            userRole: import("@prisma/client").$Enums.UserRole;
            department: string;
            avatarUrl: string | null;
            status: import("@prisma/client").$Enums.EmploymentStatus;
        } | null;
        matches: {
            id: string;
            jobId: string;
            matchedSkills: string[];
            missingSkills: string[];
            candidateId: string;
            calculatedAt: Date;
            overallScore: number;
            skillScore: number;
            experienceScore: number;
            educationScore: number;
            locationScore: number;
            experienceGap: string | null;
            explanation: string;
            engineVersion: string;
        }[];
        resumeDocument: {
            id: string;
            uploadedById: string | null;
            fileName: string;
            fileSize: number;
            candidateId: string;
            fileType: string;
            storagePath: string;
            fileHash: string;
            uploadedAt: Date;
            parsingStatus: string;
            parserVersion: string;
            parsingError: string | null;
            rawTextSample: string | null;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        name: string;
        email: string;
        phone: string;
        avatarUrl: string | null;
        location: string;
        updatedAt: Date;
        appliedOn: string;
        source: import("@prisma/client").$Enums.CandidateSource;
        jobId: string;
        stage: import("@prisma/client").$Enums.CandidateStage;
        score: number;
        experience: string;
        currentRole: string;
        matchedSkills: string[];
        missingSkills: string[];
        summary: string;
        recommendation: import("@prisma/client").$Enums.CandidateRecommendation;
        tags: string[];
        assigned_recruiter_id: string | null;
        ai_match_score: number | null;
        duplicate_key: string | null;
        parsed_resume: import("@prisma/client/runtime/library").JsonValue | null;
        referrer_id: string | null;
        resumeUrl: string | null;
        talent_pool: boolean;
    }>;
    updateCandidate(id: string, body: any): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        email: string;
        phone: string;
        avatarUrl: string | null;
        location: string;
        updatedAt: Date;
        appliedOn: string;
        source: import("@prisma/client").$Enums.CandidateSource;
        jobId: string;
        stage: import("@prisma/client").$Enums.CandidateStage;
        score: number;
        experience: string;
        currentRole: string;
        matchedSkills: string[];
        missingSkills: string[];
        summary: string;
        recommendation: import("@prisma/client").$Enums.CandidateRecommendation;
        tags: string[];
        assigned_recruiter_id: string | null;
        ai_match_score: number | null;
        duplicate_key: string | null;
        parsed_resume: import("@prisma/client/runtime/library").JsonValue | null;
        referrer_id: string | null;
        resumeUrl: string | null;
        talent_pool: boolean;
    }>;
    updateStage(id: string, body: any, user: any): Promise<any>;
    selectionDecision(id: string, body: any, user: any): Promise<any>;
    uploadResume(id: string, file?: UploadedResumeFile, user?: any): Promise<{
        candidateId: string;
        fileName: string;
        matchResult: import("./resume-parser").MatchResult;
        success: boolean;
    }>;
    downloadResume(id: string, res: Response): Promise<void>;
    reparseResume(id: string): Promise<{
        candidateId: string;
        match: import("./resume-parser").MatchResult;
        success: boolean;
    }>;
    addToJob(id: string, body: any): Promise<{
        job: {
            id: string;
            title: string;
            createdAt: Date;
            department: string;
            status: import("@prisma/client").$Enums.JobStatus;
            location: string;
            updatedAt: Date;
            description: string;
            priority: string;
            currency: string;
            employmentType: import("@prisma/client").$Enums.JobEmploymentType;
            openings: number;
            applicants: number;
            postedOn: string;
            requirements: string[];
            responsibilities: string[];
            experience_min: number | null;
            experience_max: number | null;
            salary_min: import("@prisma/client/runtime/library").Decimal | null;
            salary_max: import("@prisma/client/runtime/library").Decimal | null;
            hiring_manager_id: string | null;
            recruiter_id: string | null;
            target_close_date: Date | null;
        };
    } & {
        id: string;
        createdAt: Date;
        name: string;
        email: string;
        phone: string;
        avatarUrl: string | null;
        location: string;
        updatedAt: Date;
        appliedOn: string;
        source: import("@prisma/client").$Enums.CandidateSource;
        jobId: string;
        stage: import("@prisma/client").$Enums.CandidateStage;
        score: number;
        experience: string;
        currentRole: string;
        matchedSkills: string[];
        missingSkills: string[];
        summary: string;
        recommendation: import("@prisma/client").$Enums.CandidateRecommendation;
        tags: string[];
        assigned_recruiter_id: string | null;
        ai_match_score: number | null;
        duplicate_key: string | null;
        parsed_resume: import("@prisma/client/runtime/library").JsonValue | null;
        referrer_id: string | null;
        resumeUrl: string | null;
        talent_pool: boolean;
    }>;
    parseDraft(file?: UploadedResumeFile): Promise<{
        parsedData: import("./resume-parser").ParsedDraft;
        success: boolean;
    }>;
    createFromResume(file?: UploadedResumeFile, fieldsJson?: string, user?: any): Promise<{
        candidate: {
            id: string;
            createdAt: Date;
            name: string;
            email: string;
            phone: string;
            avatarUrl: string | null;
            location: string;
            updatedAt: Date;
            appliedOn: string;
            source: import("@prisma/client").$Enums.CandidateSource;
            jobId: string;
            stage: import("@prisma/client").$Enums.CandidateStage;
            score: number;
            experience: string;
            currentRole: string;
            matchedSkills: string[];
            missingSkills: string[];
            summary: string;
            recommendation: import("@prisma/client").$Enums.CandidateRecommendation;
            tags: string[];
            assigned_recruiter_id: string | null;
            ai_match_score: number | null;
            duplicate_key: string | null;
            parsed_resume: import("@prisma/client/runtime/library").JsonValue | null;
            referrer_id: string | null;
            resumeUrl: string | null;
            talent_pool: boolean;
        };
        match: import("./resume-parser").MatchResult;
        success: boolean;
    }>;
    getInterviews(candidateId?: string): Promise<({
        interview_feedback: ({
            employees: {
                id: string;
                name: string;
                employeeCode: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                department: string;
                avatarUrl: string | null;
                status: import("@prisma/client").$Enums.EmploymentStatus;
            };
        } & {
            id: string;
            reviewer_id: string;
            comments: string | null;
            submitted_at: Date;
            recommendation: string;
            interview_id: string;
            overall_score: number;
            scorecard: import("@prisma/client/runtime/library").JsonValue | null;
        })[];
        interview_panel_members: ({
            employees: {
                id: string;
                name: string;
                employeeCode: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                department: string;
                avatarUrl: string | null;
                status: import("@prisma/client").$Enums.EmploymentStatus;
            };
        } & {
            id: string;
            employee_id: string;
            interview_id: string;
            is_lead: boolean;
        })[];
    } & {
        id: string;
        title: string;
        status: string;
        location: string | null;
        created_at: Date;
        updated_at: Date;
        candidate_id: string;
        round: number;
        starts_at: Date;
        ends_at: Date;
        meeting_url: string | null;
        reminder_at: Date | null;
    })[]>;
    createInterview(body: any): Promise<({
        interview_feedback: ({
            employees: {
                id: string;
                name: string;
                employeeCode: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                department: string;
                avatarUrl: string | null;
                status: import("@prisma/client").$Enums.EmploymentStatus;
            };
        } & {
            id: string;
            reviewer_id: string;
            comments: string | null;
            submitted_at: Date;
            recommendation: string;
            interview_id: string;
            overall_score: number;
            scorecard: import("@prisma/client/runtime/library").JsonValue | null;
        })[];
        interview_panel_members: ({
            employees: {
                id: string;
                name: string;
                employeeCode: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                department: string;
                avatarUrl: string | null;
                status: import("@prisma/client").$Enums.EmploymentStatus;
            };
        } & {
            id: string;
            employee_id: string;
            interview_id: string;
            is_lead: boolean;
        })[];
    } & {
        id: string;
        title: string;
        status: string;
        location: string | null;
        created_at: Date;
        updated_at: Date;
        candidate_id: string;
        round: number;
        starts_at: Date;
        ends_at: Date;
        meeting_url: string | null;
        reminder_at: Date | null;
    }) | null>;
    updateInterview(id: string, body: any): Promise<({
        interview_feedback: ({
            employees: {
                id: string;
                name: string;
                employeeCode: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                department: string;
                avatarUrl: string | null;
                status: import("@prisma/client").$Enums.EmploymentStatus;
            };
        } & {
            id: string;
            reviewer_id: string;
            comments: string | null;
            submitted_at: Date;
            recommendation: string;
            interview_id: string;
            overall_score: number;
            scorecard: import("@prisma/client/runtime/library").JsonValue | null;
        })[];
        interview_panel_members: ({
            employees: {
                id: string;
                name: string;
                employeeCode: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                department: string;
                avatarUrl: string | null;
                status: import("@prisma/client").$Enums.EmploymentStatus;
            };
        } & {
            id: string;
            employee_id: string;
            interview_id: string;
            is_lead: boolean;
        })[];
    } & {
        id: string;
        title: string;
        status: string;
        location: string | null;
        created_at: Date;
        updated_at: Date;
        candidate_id: string;
        round: number;
        starts_at: Date;
        ends_at: Date;
        meeting_url: string | null;
        reminder_at: Date | null;
    }) | null>;
    submitFeedback(id: string, body: any, user: any): Promise<{
        employees: {
            id: string;
            name: string;
            employeeCode: string;
            email: string;
            roleTitle: string;
            userRole: import("@prisma/client").$Enums.UserRole;
            department: string;
            avatarUrl: string | null;
            status: import("@prisma/client").$Enums.EmploymentStatus;
        };
    } & {
        id: string;
        reviewer_id: string;
        comments: string | null;
        submitted_at: Date;
        recommendation: string;
        interview_id: string;
        overall_score: number;
        scorecard: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    getInterviewForMeeting(meetingId: string, user: any): Promise<{
        interviewId: string;
        round: number;
        status: string;
        candidateName: string;
        myDecision: {
            decision: string;
            remark: string;
            submittedAt: Date;
        } | null;
    } | null>;
    submitInterviewerDecision(meetingId: string, body: {
        decision: 'SELECT' | 'REJECT';
        remark: string;
    }, user: any): Promise<{
        decision: string;
        recommendation: string;
        feedback: {
            employees: {
                id: string;
                name: string;
                employeeCode: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                department: string;
                avatarUrl: string | null;
                status: import("@prisma/client").$Enums.EmploymentStatus;
            };
        } & {
            id: string;
            reviewer_id: string;
            comments: string | null;
            submitted_at: Date;
            recommendation: string;
            interview_id: string;
            overall_score: number;
            scorecard: import("@prisma/client/runtime/library").JsonValue | null;
        };
    }>;
    getNotes(id: string): Promise<{
        success: boolean;
        data: ({
            employees: {
                id: string;
                name: string;
                employeeCode: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                department: string;
                avatarUrl: string | null;
                status: import("@prisma/client").$Enums.EmploymentStatus;
            };
        } & {
            id: string;
            note: string;
            created_at: Date;
            author_id: string;
            candidate_id: string;
        })[];
    }>;
    addNote(id: string, body: any, user: any): Promise<{
        success: boolean;
        data: {
            employees: {
                id: string;
                name: string;
                employeeCode: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                department: string;
                avatarUrl: string | null;
                status: import("@prisma/client").$Enums.EmploymentStatus;
            };
        } & {
            id: string;
            note: string;
            created_at: Date;
            author_id: string;
            candidate_id: string;
        };
    }>;
    getTimeline(id: string): Promise<{
        success: boolean;
        data: any[];
    }>;
    getOffers(candidateId?: string, user?: any): Promise<{
        success: boolean;
        data: any[];
    }>;
    createOffer(body: any): Promise<{
        recruitment_offer_approvals: ({
            employees: {
                id: string;
                name: string;
                employeeCode: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                department: string;
                avatarUrl: string | null;
                status: import("@prisma/client").$Enums.EmploymentStatus;
            };
        } & {
            id: string;
            status: import("@prisma/client").$Enums.ApprovalStatus;
            note: string | null;
            created_at: Date;
            sequence: number;
            approver_id: string;
            acted_at: Date | null;
            offer_id: string;
        })[];
        document_templates: {
            id: string;
            type: import("@prisma/client").$Enums.DocumentTemplateType;
            createdAt: Date;
            name: string;
            organization_id: string;
            isActive: boolean;
            updated_at: Date;
            created_by_id: string | null;
            content: string;
            subject: string | null;
            version: number;
            updated_by_id: string | null;
        } | null;
    } & {
        id: string;
        status: import("@prisma/client").$Enums.RecruitmentOfferStatus;
        template_id: string | null;
        expires_at: Date | null;
        created_at: Date;
        updated_at: Date;
        currency: string;
        version: number;
        candidate_id: string;
        offered_title: string;
        offered_ctc: import("@prisma/client/runtime/library").Decimal | null;
        proposed_join_date: Date | null;
        content_snapshot: string | null;
        sent_at: Date | null;
        viewed_at: Date | null;
        responded_at: Date | null;
    }>;
    updateOffer(id: string, body: any): Promise<{
        recruitment_offer_approvals: ({
            employees: {
                id: string;
                name: string;
                employeeCode: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                department: string;
                avatarUrl: string | null;
                status: import("@prisma/client").$Enums.EmploymentStatus;
            };
        } & {
            id: string;
            status: import("@prisma/client").$Enums.ApprovalStatus;
            note: string | null;
            created_at: Date;
            sequence: number;
            approver_id: string;
            acted_at: Date | null;
            offer_id: string;
        })[];
        document_templates: {
            id: string;
            type: import("@prisma/client").$Enums.DocumentTemplateType;
            createdAt: Date;
            name: string;
            organization_id: string;
            isActive: boolean;
            updated_at: Date;
            created_by_id: string | null;
            content: string;
            subject: string | null;
            version: number;
            updated_by_id: string | null;
        } | null;
    } & {
        id: string;
        status: import("@prisma/client").$Enums.RecruitmentOfferStatus;
        template_id: string | null;
        expires_at: Date | null;
        created_at: Date;
        updated_at: Date;
        currency: string;
        version: number;
        candidate_id: string;
        offered_title: string;
        offered_ctc: import("@prisma/client/runtime/library").Decimal | null;
        proposed_join_date: Date | null;
        content_snapshot: string | null;
        sent_at: Date | null;
        viewed_at: Date | null;
        responded_at: Date | null;
    }>;
    submitOfferForApproval(id: string, body: any): Promise<any>;
    offerApprovalAction(id: string, body: any, user: any): Promise<any>;
    listOfferDocuments(id: string): Promise<{
        templates: {
            id: string;
            name: string;
            type: string;
            source: string;
        }[];
        documents: any[];
        success: boolean;
    }>;
    previewOfferDocument(id: string, body: any): Promise<{
        preview: {
            html: string;
            documentTitle: string;
        };
        success: boolean;
    }>;
    generateOfferDocument(id: string, body: any, user: any): Promise<{
        document: any;
        autoSentToCandidate: boolean;
        portalUrl: null;
        portalUrlExpiresAt: null;
        success: boolean;
    }>;
    downloadOfferDocument(id: string, docId: string, res: Response): Promise<void>;
    sendOffer(id: string): Promise<{
        offer: {
            recruitment_offer_approvals: ({
                employees: {
                    id: string;
                    name: string;
                    employeeCode: string;
                    email: string;
                    roleTitle: string;
                    userRole: import("@prisma/client").$Enums.UserRole;
                    department: string;
                    avatarUrl: string | null;
                    status: import("@prisma/client").$Enums.EmploymentStatus;
                };
            } & {
                id: string;
                status: import("@prisma/client").$Enums.ApprovalStatus;
                note: string | null;
                created_at: Date;
                sequence: number;
                approver_id: string;
                acted_at: Date | null;
                offer_id: string;
            })[];
            document_templates: {
                id: string;
                type: import("@prisma/client").$Enums.DocumentTemplateType;
                createdAt: Date;
                name: string;
                organization_id: string;
                isActive: boolean;
                updated_at: Date;
                created_by_id: string | null;
                content: string;
                subject: string | null;
                version: number;
                updated_by_id: string | null;
            } | null;
        } & {
            id: string;
            status: import("@prisma/client").$Enums.RecruitmentOfferStatus;
            template_id: string | null;
            expires_at: Date | null;
            created_at: Date;
            updated_at: Date;
            currency: string;
            version: number;
            candidate_id: string;
            offered_title: string;
            offered_ctc: import("@prisma/client/runtime/library").Decimal | null;
            proposed_join_date: Date | null;
            content_snapshot: string | null;
            sent_at: Date | null;
            viewed_at: Date | null;
            responded_at: Date | null;
        };
        message: string;
        portalUrl: string;
        portalUrlExpiresAt: string;
        success: boolean;
    }>;
}
export {};
