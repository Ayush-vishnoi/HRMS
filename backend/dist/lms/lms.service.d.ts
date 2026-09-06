import { PrismaService } from '../prisma/prisma.service';
export declare class LmsService {
    private prisma;
    constructor(prisma: PrismaService);
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
            category: string;
            title: string;
            description: string;
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
                category: string;
                title: string;
                description: string;
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
