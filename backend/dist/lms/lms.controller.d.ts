import { LmsService } from './lms.service';
export declare class LmsController {
    private lmsService;
    constructor(lmsService: LmsService);
    findAll(employeeId?: string): Promise<{
        courses: ({
            modules: {
                id: string;
                createdAt: Date;
                title: string;
                orderIndex: number;
                courseId: string;
                contentType: string;
                contentUrl: string | null;
                estimatedMinutes: number;
            }[];
        } & {
            id: string;
            createdAt: Date;
            title: string;
            description: string;
            category: string;
            durationHours: number;
            level: string;
            isMandatory: boolean;
            passingPercentage: number;
            thumbnailUrl: string | null;
        })[];
        enrollments: ({
            course: {
                modules: {
                    id: string;
                    createdAt: Date;
                    title: string;
                    orderIndex: number;
                    courseId: string;
                    contentType: string;
                    contentUrl: string | null;
                    estimatedMinutes: number;
                }[];
            } & {
                id: string;
                createdAt: Date;
                title: string;
                description: string;
                category: string;
                durationHours: number;
                level: string;
                isMandatory: boolean;
                passingPercentage: number;
                thumbnailUrl: string | null;
            };
        } & {
            id: string;
            status: string;
            employeeId: string;
            courseId: string;
            enrolledAt: Date;
            dueDate: string;
            progressPercentage: number;
            completionDate: string | null;
            scorePercentage: number | null;
            certificateUrl: string | null;
        })[];
    }>;
    handleAction(body: any): Promise<{
        id: string;
        status: string;
        employeeId: string;
        courseId: string;
        enrolledAt: Date;
        dueDate: string;
        progressPercentage: number;
        completionDate: string | null;
        scorePercentage: number | null;
        certificateUrl: string | null;
    }>;
}
