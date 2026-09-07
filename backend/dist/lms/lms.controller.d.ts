import { LmsService } from './lms.service';
export declare class LmsController {
    private lmsService;
    constructor(lmsService: LmsService);
    findAll(employeeId?: string): Promise<{
        courses: ({
            modules: {
                id: string;
                title: string;
                createdAt: Date;
                courseId: string;
                orderIndex: number;
                contentType: string;
                contentUrl: string | null;
                estimatedMinutes: number;
            }[];
        } & {
            id: string;
            title: string;
            createdAt: Date;
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
                    title: string;
                    createdAt: Date;
                    courseId: string;
                    orderIndex: number;
                    contentType: string;
                    contentUrl: string | null;
                    estimatedMinutes: number;
                }[];
            } & {
                id: string;
                title: string;
                createdAt: Date;
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
            dueDate: string;
            courseId: string;
            enrolledAt: Date;
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
        dueDate: string;
        courseId: string;
        enrolledAt: Date;
        progressPercentage: number;
        completionDate: string | null;
        scorePercentage: number | null;
        certificateUrl: string | null;
    }>;
}
