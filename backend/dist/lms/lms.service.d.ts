import { PrismaService } from '../prisma/prisma.service';
export declare class LmsService {
    private prisma;
    constructor(prisma: PrismaService);
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
