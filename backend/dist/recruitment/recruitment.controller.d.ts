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
                candidates: {
                    id: string;
                    stage: import("@prisma/client").$Enums.CandidateStage;
                }[];
                recruitment_job_approvals: ({
                    employees: {
                        id: string;
                        department: string;
                        status: import("@prisma/client").$Enums.EmploymentStatus;
                        employeeCode: string;
                        name: string;
                        email: string;
                        roleTitle: string;
                        userRole: import("@prisma/client").$Enums.UserRole;
                        avatarUrl: string | null;
                    };
                } & {
                    id: string;
                    status: import("@prisma/client").$Enums.ApprovalStatus;
                    job_id: string;
                    sequence: number;
                    approver_id: string;
                    note: string | null;
                    acted_at: Date | null;
                    created_at: Date;
                    updated_at: Date;
                })[];
                hiringManager: {
                    id: string;
                    department: string;
                    status: import("@prisma/client").$Enums.EmploymentStatus;
                    employeeCode: string;
                    name: string;
                    email: string;
                    roleTitle: string;
                    userRole: import("@prisma/client").$Enums.UserRole;
                    avatarUrl: string | null;
                } | null;
                recruiter: {
                    id: string;
                    department: string;
                    status: import("@prisma/client").$Enums.EmploymentStatus;
                    employeeCode: string;
                    name: string;
                    email: string;
                    roleTitle: string;
                    userRole: import("@prisma/client").$Enums.UserRole;
                    avatarUrl: string | null;
                } | null;
            } & {
                id: string;
                title: string;
                department: string;
                location: string;
                employmentType: import("@prisma/client").$Enums.JobEmploymentType;
                openings: number;
                applicants: number;
                status: import("@prisma/client").$Enums.JobStatus;
                postedOn: string;
                description: string;
                requirements: string[];
                responsibilities: string[];
                experience_min: number | null;
                experience_max: number | null;
                salary_min: import("@prisma/client/runtime/library").Decimal | null;
                salary_max: import("@prisma/client/runtime/library").Decimal | null;
                currency: string;
                hiring_manager_id: string | null;
                recruiter_id: string | null;
                priority: string;
                target_close_date: Date | null;
                createdAt: Date;
                updatedAt: Date;
            })[];
            candidates: ({
                matches: {
                    id: string;
                    jobId: string;
                    matchedSkills: string[];
                    missingSkills: string[];
                    candidateId: string;
                    overallScore: number;
                    skillScore: number;
                    experienceScore: number;
                    educationScore: number;
                    locationScore: number;
                    experienceGap: string | null;
                    explanation: string;
                    engineVersion: string;
                    calculatedAt: Date;
                }[];
                onboarding: ({
                    employee: {
                        id: string;
                        department: string;
                        status: import("@prisma/client").$Enums.EmploymentStatus;
                        employeeCode: string;
                        name: string;
                        email: string;
                        roleTitle: string;
                        userRole: import("@prisma/client").$Enums.UserRole;
                        avatarUrl: string | null;
                    } | null;
                } & {
                    id: string;
                    status: import("@prisma/client").$Enums.OnboardingStatus;
                    stage: import("@prisma/client").$Enums.OnboardingStage;
                    updated_at: Date;
                    candidateId: string;
                    employeeId: string | null;
                    onboardedById: string | null;
                    onboardedAt: Date;
                    actual_joining_date: Date | null;
                    buddy_employee_id: string | null;
                    confirmation_date: Date | null;
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
                    department: string;
                    location: string;
                    employmentType: import("@prisma/client").$Enums.JobEmploymentType;
                    openings: number;
                    applicants: number;
                    status: import("@prisma/client").$Enums.JobStatus;
                    postedOn: string;
                    description: string;
                    requirements: string[];
                    responsibilities: string[];
                    experience_min: number | null;
                    experience_max: number | null;
                    salary_min: import("@prisma/client/runtime/library").Decimal | null;
                    salary_max: import("@prisma/client/runtime/library").Decimal | null;
                    currency: string;
                    hiring_manager_id: string | null;
                    recruiter_id: string | null;
                    priority: string;
                    target_close_date: Date | null;
                    createdAt: Date;
                    updatedAt: Date;
                };
                assignedRecruiter: {
                    id: string;
                    department: string;
                    status: import("@prisma/client").$Enums.EmploymentStatus;
                    employeeCode: string;
                    name: string;
                    email: string;
                    roleTitle: string;
                    userRole: import("@prisma/client").$Enums.UserRole;
                    avatarUrl: string | null;
                } | null;
                resumeDocument: {
                    id: string;
                    candidateId: string;
                    fileName: string;
                    fileType: string;
                    fileSize: number;
                    storagePath: string;
                    fileHash: string;
                    uploadedById: string | null;
                    uploadedAt: Date;
                    parsingStatus: string;
                    parserVersion: string;
                    parsingError: string | null;
                    rawTextSample: string | null;
                } | null;
            } & {
                id: string;
                location: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                email: string;
                phone: string;
                avatarUrl: string | null;
                jobId: string;
                appliedOn: string;
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
                source: import("@prisma/client").$Enums.CandidateSource;
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
    getJobs(): Promise<{
        jobs: ({
            candidates: {
                id: string;
                stage: import("@prisma/client").$Enums.CandidateStage;
            }[];
            recruitment_job_approvals: ({
                employees: {
                    id: string;
                    department: string;
                    status: import("@prisma/client").$Enums.EmploymentStatus;
                    employeeCode: string;
                    name: string;
                    email: string;
                    roleTitle: string;
                    userRole: import("@prisma/client").$Enums.UserRole;
                    avatarUrl: string | null;
                };
            } & {
                id: string;
                status: import("@prisma/client").$Enums.ApprovalStatus;
                job_id: string;
                sequence: number;
                approver_id: string;
                note: string | null;
                acted_at: Date | null;
                created_at: Date;
                updated_at: Date;
            })[];
            hiringManager: {
                id: string;
                department: string;
                status: import("@prisma/client").$Enums.EmploymentStatus;
                employeeCode: string;
                name: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                avatarUrl: string | null;
            } | null;
            recruiter: {
                id: string;
                department: string;
                status: import("@prisma/client").$Enums.EmploymentStatus;
                employeeCode: string;
                name: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                avatarUrl: string | null;
            } | null;
        } & {
            id: string;
            title: string;
            department: string;
            location: string;
            employmentType: import("@prisma/client").$Enums.JobEmploymentType;
            openings: number;
            applicants: number;
            status: import("@prisma/client").$Enums.JobStatus;
            postedOn: string;
            description: string;
            requirements: string[];
            responsibilities: string[];
            experience_min: number | null;
            experience_max: number | null;
            salary_min: import("@prisma/client/runtime/library").Decimal | null;
            salary_max: import("@prisma/client/runtime/library").Decimal | null;
            currency: string;
            hiring_manager_id: string | null;
            recruiter_id: string | null;
            priority: string;
            target_close_date: Date | null;
            createdAt: Date;
            updatedAt: Date;
        })[];
        candidates: ({
            matches: {
                id: string;
                jobId: string;
                matchedSkills: string[];
                missingSkills: string[];
                candidateId: string;
                overallScore: number;
                skillScore: number;
                experienceScore: number;
                educationScore: number;
                locationScore: number;
                experienceGap: string | null;
                explanation: string;
                engineVersion: string;
                calculatedAt: Date;
            }[];
            onboarding: ({
                employee: {
                    id: string;
                    department: string;
                    status: import("@prisma/client").$Enums.EmploymentStatus;
                    employeeCode: string;
                    name: string;
                    email: string;
                    roleTitle: string;
                    userRole: import("@prisma/client").$Enums.UserRole;
                    avatarUrl: string | null;
                } | null;
            } & {
                id: string;
                status: import("@prisma/client").$Enums.OnboardingStatus;
                stage: import("@prisma/client").$Enums.OnboardingStage;
                updated_at: Date;
                candidateId: string;
                employeeId: string | null;
                onboardedById: string | null;
                onboardedAt: Date;
                actual_joining_date: Date | null;
                buddy_employee_id: string | null;
                confirmation_date: Date | null;
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
                department: string;
                location: string;
                employmentType: import("@prisma/client").$Enums.JobEmploymentType;
                openings: number;
                applicants: number;
                status: import("@prisma/client").$Enums.JobStatus;
                postedOn: string;
                description: string;
                requirements: string[];
                responsibilities: string[];
                experience_min: number | null;
                experience_max: number | null;
                salary_min: import("@prisma/client/runtime/library").Decimal | null;
                salary_max: import("@prisma/client/runtime/library").Decimal | null;
                currency: string;
                hiring_manager_id: string | null;
                recruiter_id: string | null;
                priority: string;
                target_close_date: Date | null;
                createdAt: Date;
                updatedAt: Date;
            };
            assignedRecruiter: {
                id: string;
                department: string;
                status: import("@prisma/client").$Enums.EmploymentStatus;
                employeeCode: string;
                name: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                avatarUrl: string | null;
            } | null;
            resumeDocument: {
                id: string;
                candidateId: string;
                fileName: string;
                fileType: string;
                fileSize: number;
                storagePath: string;
                fileHash: string;
                uploadedById: string | null;
                uploadedAt: Date;
                parsingStatus: string;
                parserVersion: string;
                parsingError: string | null;
                rawTextSample: string | null;
            } | null;
        } & {
            id: string;
            location: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            email: string;
            phone: string;
            avatarUrl: string | null;
            jobId: string;
            appliedOn: string;
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
            source: import("@prisma/client").$Enums.CandidateSource;
            talent_pool: boolean;
        })[];
    }>;
    createJob(body: any): Promise<{
        success: boolean;
        data: {
            id: string;
            title: string;
            department: string;
            location: string;
            employmentType: import("@prisma/client").$Enums.JobEmploymentType;
            openings: number;
            applicants: number;
            status: import("@prisma/client").$Enums.JobStatus;
            postedOn: string;
            description: string;
            requirements: string[];
            responsibilities: string[];
            experience_min: number | null;
            experience_max: number | null;
            salary_min: import("@prisma/client/runtime/library").Decimal | null;
            salary_max: import("@prisma/client/runtime/library").Decimal | null;
            currency: string;
            hiring_manager_id: string | null;
            recruiter_id: string | null;
            priority: string;
            target_close_date: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
    }>;
    updateJob(id: string, body: any): Promise<any>;
    jobApprovalAction(id: string, body: any, user: any): Promise<any>;
    rediscover(id: string, minScore?: string): Promise<{
        rediscoveredCandidates: any[];
        success: boolean;
    }>;
    getCandidates(jobId?: string, stage?: string): Promise<({
        matches: {
            id: string;
            jobId: string;
            matchedSkills: string[];
            missingSkills: string[];
            candidateId: string;
            overallScore: number;
            skillScore: number;
            experienceScore: number;
            educationScore: number;
            locationScore: number;
            experienceGap: string | null;
            explanation: string;
            engineVersion: string;
            calculatedAt: Date;
        }[];
        onboarding: ({
            employee: {
                id: string;
                department: string;
                status: import("@prisma/client").$Enums.EmploymentStatus;
                employeeCode: string;
                name: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                avatarUrl: string | null;
            } | null;
        } & {
            id: string;
            status: import("@prisma/client").$Enums.OnboardingStatus;
            stage: import("@prisma/client").$Enums.OnboardingStage;
            updated_at: Date;
            candidateId: string;
            employeeId: string | null;
            onboardedById: string | null;
            onboardedAt: Date;
            actual_joining_date: Date | null;
            buddy_employee_id: string | null;
            confirmation_date: Date | null;
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
            department: string;
            location: string;
            employmentType: import("@prisma/client").$Enums.JobEmploymentType;
            openings: number;
            applicants: number;
            status: import("@prisma/client").$Enums.JobStatus;
            postedOn: string;
            description: string;
            requirements: string[];
            responsibilities: string[];
            experience_min: number | null;
            experience_max: number | null;
            salary_min: import("@prisma/client/runtime/library").Decimal | null;
            salary_max: import("@prisma/client/runtime/library").Decimal | null;
            currency: string;
            hiring_manager_id: string | null;
            recruiter_id: string | null;
            priority: string;
            target_close_date: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
        assignedRecruiter: {
            id: string;
            department: string;
            status: import("@prisma/client").$Enums.EmploymentStatus;
            employeeCode: string;
            name: string;
            email: string;
            roleTitle: string;
            userRole: import("@prisma/client").$Enums.UserRole;
            avatarUrl: string | null;
        } | null;
        resumeDocument: {
            id: string;
            candidateId: string;
            fileName: string;
            fileType: string;
            fileSize: number;
            storagePath: string;
            fileHash: string;
            uploadedById: string | null;
            uploadedAt: Date;
            parsingStatus: string;
            parserVersion: string;
            parsingError: string | null;
            rawTextSample: string | null;
        } | null;
    } & {
        id: string;
        location: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        email: string;
        phone: string;
        avatarUrl: string | null;
        jobId: string;
        appliedOn: string;
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
        source: import("@prisma/client").$Enums.CandidateSource;
        talent_pool: boolean;
    })[]>;
    createCandidate(body: any, user: any): Promise<{
        job: {
            id: string;
            title: string;
            department: string;
            location: string;
            employmentType: import("@prisma/client").$Enums.JobEmploymentType;
            openings: number;
            applicants: number;
            status: import("@prisma/client").$Enums.JobStatus;
            postedOn: string;
            description: string;
            requirements: string[];
            responsibilities: string[];
            experience_min: number | null;
            experience_max: number | null;
            salary_min: import("@prisma/client/runtime/library").Decimal | null;
            salary_max: import("@prisma/client/runtime/library").Decimal | null;
            currency: string;
            hiring_manager_id: string | null;
            recruiter_id: string | null;
            priority: string;
            target_close_date: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: string;
        location: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        email: string;
        phone: string;
        avatarUrl: string | null;
        jobId: string;
        appliedOn: string;
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
        source: import("@prisma/client").$Enums.CandidateSource;
        talent_pool: boolean;
    }>;
    getCandidate(id: string): Promise<{
        matches: {
            id: string;
            jobId: string;
            matchedSkills: string[];
            missingSkills: string[];
            candidateId: string;
            overallScore: number;
            skillScore: number;
            experienceScore: number;
            educationScore: number;
            locationScore: number;
            experienceGap: string | null;
            explanation: string;
            engineVersion: string;
            calculatedAt: Date;
        }[];
        onboarding: ({
            employee: {
                id: string;
                department: string;
                status: import("@prisma/client").$Enums.EmploymentStatus;
                employeeCode: string;
                name: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                avatarUrl: string | null;
            } | null;
        } & {
            id: string;
            status: import("@prisma/client").$Enums.OnboardingStatus;
            stage: import("@prisma/client").$Enums.OnboardingStage;
            updated_at: Date;
            candidateId: string;
            employeeId: string | null;
            onboardedById: string | null;
            onboardedAt: Date;
            actual_joining_date: Date | null;
            buddy_employee_id: string | null;
            confirmation_date: Date | null;
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
            department: string;
            location: string;
            employmentType: import("@prisma/client").$Enums.JobEmploymentType;
            openings: number;
            applicants: number;
            status: import("@prisma/client").$Enums.JobStatus;
            postedOn: string;
            description: string;
            requirements: string[];
            responsibilities: string[];
            experience_min: number | null;
            experience_max: number | null;
            salary_min: import("@prisma/client/runtime/library").Decimal | null;
            salary_max: import("@prisma/client/runtime/library").Decimal | null;
            currency: string;
            hiring_manager_id: string | null;
            recruiter_id: string | null;
            priority: string;
            target_close_date: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
        assignedRecruiter: {
            id: string;
            department: string;
            status: import("@prisma/client").$Enums.EmploymentStatus;
            employeeCode: string;
            name: string;
            email: string;
            roleTitle: string;
            userRole: import("@prisma/client").$Enums.UserRole;
            avatarUrl: string | null;
        } | null;
        resumeDocument: {
            id: string;
            candidateId: string;
            fileName: string;
            fileType: string;
            fileSize: number;
            storagePath: string;
            fileHash: string;
            uploadedById: string | null;
            uploadedAt: Date;
            parsingStatus: string;
            parserVersion: string;
            parsingError: string | null;
            rawTextSample: string | null;
        } | null;
    } & {
        id: string;
        location: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        email: string;
        phone: string;
        avatarUrl: string | null;
        jobId: string;
        appliedOn: string;
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
        source: import("@prisma/client").$Enums.CandidateSource;
        talent_pool: boolean;
    }>;
    updateCandidate(id: string, body: any): Promise<{
        id: string;
        location: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        email: string;
        phone: string;
        avatarUrl: string | null;
        jobId: string;
        appliedOn: string;
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
        source: import("@prisma/client").$Enums.CandidateSource;
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
            department: string;
            location: string;
            employmentType: import("@prisma/client").$Enums.JobEmploymentType;
            openings: number;
            applicants: number;
            status: import("@prisma/client").$Enums.JobStatus;
            postedOn: string;
            description: string;
            requirements: string[];
            responsibilities: string[];
            experience_min: number | null;
            experience_max: number | null;
            salary_min: import("@prisma/client/runtime/library").Decimal | null;
            salary_max: import("@prisma/client/runtime/library").Decimal | null;
            currency: string;
            hiring_manager_id: string | null;
            recruiter_id: string | null;
            priority: string;
            target_close_date: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: string;
        location: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        email: string;
        phone: string;
        avatarUrl: string | null;
        jobId: string;
        appliedOn: string;
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
        source: import("@prisma/client").$Enums.CandidateSource;
        talent_pool: boolean;
    }>;
    parseDraft(file?: UploadedResumeFile): Promise<{
        parsedData: import("./resume-parser").ParsedDraft;
        success: boolean;
    }>;
    createFromResume(file?: UploadedResumeFile, fieldsJson?: string, user?: any): Promise<{
        candidate: {
            id: string;
            location: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            email: string;
            phone: string;
            avatarUrl: string | null;
            jobId: string;
            appliedOn: string;
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
            source: import("@prisma/client").$Enums.CandidateSource;
            talent_pool: boolean;
        };
        match: import("./resume-parser").MatchResult;
        success: boolean;
    }>;
    getInterviews(candidateId?: string): Promise<({
        interview_feedback: ({
            employees: {
                id: string;
                department: string;
                status: import("@prisma/client").$Enums.EmploymentStatus;
                employeeCode: string;
                name: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            recommendation: string;
            interview_id: string;
            reviewer_id: string;
            overall_score: number;
            scorecard: import("@prisma/client/runtime/library").JsonValue | null;
            comments: string | null;
            submitted_at: Date;
        })[];
        interview_panel_members: ({
            employees: {
                id: string;
                department: string;
                status: import("@prisma/client").$Enums.EmploymentStatus;
                employeeCode: string;
                name: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            interview_id: string;
            employee_id: string;
            is_lead: boolean;
        })[];
    } & {
        id: string;
        title: string;
        location: string | null;
        status: string;
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
                department: string;
                status: import("@prisma/client").$Enums.EmploymentStatus;
                employeeCode: string;
                name: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            recommendation: string;
            interview_id: string;
            reviewer_id: string;
            overall_score: number;
            scorecard: import("@prisma/client/runtime/library").JsonValue | null;
            comments: string | null;
            submitted_at: Date;
        })[];
        interview_panel_members: ({
            employees: {
                id: string;
                department: string;
                status: import("@prisma/client").$Enums.EmploymentStatus;
                employeeCode: string;
                name: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            interview_id: string;
            employee_id: string;
            is_lead: boolean;
        })[];
    } & {
        id: string;
        title: string;
        location: string | null;
        status: string;
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
                department: string;
                status: import("@prisma/client").$Enums.EmploymentStatus;
                employeeCode: string;
                name: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            recommendation: string;
            interview_id: string;
            reviewer_id: string;
            overall_score: number;
            scorecard: import("@prisma/client/runtime/library").JsonValue | null;
            comments: string | null;
            submitted_at: Date;
        })[];
        interview_panel_members: ({
            employees: {
                id: string;
                department: string;
                status: import("@prisma/client").$Enums.EmploymentStatus;
                employeeCode: string;
                name: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            interview_id: string;
            employee_id: string;
            is_lead: boolean;
        })[];
    } & {
        id: string;
        title: string;
        location: string | null;
        status: string;
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
            department: string;
            status: import("@prisma/client").$Enums.EmploymentStatus;
            employeeCode: string;
            name: string;
            email: string;
            roleTitle: string;
            userRole: import("@prisma/client").$Enums.UserRole;
            avatarUrl: string | null;
        };
    } & {
        id: string;
        recommendation: string;
        interview_id: string;
        reviewer_id: string;
        overall_score: number;
        scorecard: import("@prisma/client/runtime/library").JsonValue | null;
        comments: string | null;
        submitted_at: Date;
    }>;
    getNotes(id: string): Promise<{
        success: boolean;
        data: ({
            employees: {
                id: string;
                department: string;
                status: import("@prisma/client").$Enums.EmploymentStatus;
                employeeCode: string;
                name: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            note: string;
            created_at: Date;
            candidate_id: string;
            author_id: string;
        })[];
    }>;
    addNote(id: string, body: any, user: any): Promise<{
        success: boolean;
        data: {
            employees: {
                id: string;
                department: string;
                status: import("@prisma/client").$Enums.EmploymentStatus;
                employeeCode: string;
                name: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            note: string;
            created_at: Date;
            candidate_id: string;
            author_id: string;
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
                department: string;
                status: import("@prisma/client").$Enums.EmploymentStatus;
                employeeCode: string;
                name: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            status: import("@prisma/client").$Enums.ApprovalStatus;
            sequence: number;
            approver_id: string;
            note: string | null;
            acted_at: Date | null;
            created_at: Date;
            offer_id: string;
        })[];
        document_templates: {
            id: string;
            createdAt: Date;
            name: string;
            organization_id: string;
            updated_at: Date;
            version: number;
            type: import("@prisma/client").$Enums.DocumentTemplateType;
            subject: string | null;
            content: string;
            isActive: boolean;
            created_by_id: string | null;
            updated_by_id: string | null;
        } | null;
    } & {
        id: string;
        status: import("@prisma/client").$Enums.RecruitmentOfferStatus;
        currency: string;
        created_at: Date;
        updated_at: Date;
        candidate_id: string;
        template_id: string | null;
        version: number;
        offered_title: string;
        offered_ctc: import("@prisma/client/runtime/library").Decimal | null;
        proposed_join_date: Date | null;
        expires_at: Date | null;
        content_snapshot: string | null;
        sent_at: Date | null;
        viewed_at: Date | null;
        responded_at: Date | null;
    }>;
    updateOffer(id: string, body: any): Promise<{
        recruitment_offer_approvals: ({
            employees: {
                id: string;
                department: string;
                status: import("@prisma/client").$Enums.EmploymentStatus;
                employeeCode: string;
                name: string;
                email: string;
                roleTitle: string;
                userRole: import("@prisma/client").$Enums.UserRole;
                avatarUrl: string | null;
            };
        } & {
            id: string;
            status: import("@prisma/client").$Enums.ApprovalStatus;
            sequence: number;
            approver_id: string;
            note: string | null;
            acted_at: Date | null;
            created_at: Date;
            offer_id: string;
        })[];
        document_templates: {
            id: string;
            createdAt: Date;
            name: string;
            organization_id: string;
            updated_at: Date;
            version: number;
            type: import("@prisma/client").$Enums.DocumentTemplateType;
            subject: string | null;
            content: string;
            isActive: boolean;
            created_by_id: string | null;
            updated_by_id: string | null;
        } | null;
    } & {
        id: string;
        status: import("@prisma/client").$Enums.RecruitmentOfferStatus;
        currency: string;
        created_at: Date;
        updated_at: Date;
        candidate_id: string;
        template_id: string | null;
        version: number;
        offered_title: string;
        offered_ctc: import("@prisma/client/runtime/library").Decimal | null;
        proposed_join_date: Date | null;
        expires_at: Date | null;
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
                    department: string;
                    status: import("@prisma/client").$Enums.EmploymentStatus;
                    employeeCode: string;
                    name: string;
                    email: string;
                    roleTitle: string;
                    userRole: import("@prisma/client").$Enums.UserRole;
                    avatarUrl: string | null;
                };
            } & {
                id: string;
                status: import("@prisma/client").$Enums.ApprovalStatus;
                sequence: number;
                approver_id: string;
                note: string | null;
                acted_at: Date | null;
                created_at: Date;
                offer_id: string;
            })[];
            document_templates: {
                id: string;
                createdAt: Date;
                name: string;
                organization_id: string;
                updated_at: Date;
                version: number;
                type: import("@prisma/client").$Enums.DocumentTemplateType;
                subject: string | null;
                content: string;
                isActive: boolean;
                created_by_id: string | null;
                updated_by_id: string | null;
            } | null;
        } & {
            id: string;
            status: import("@prisma/client").$Enums.RecruitmentOfferStatus;
            currency: string;
            created_at: Date;
            updated_at: Date;
            candidate_id: string;
            template_id: string | null;
            version: number;
            offered_title: string;
            offered_ctc: import("@prisma/client/runtime/library").Decimal | null;
            proposed_join_date: Date | null;
            expires_at: Date | null;
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
