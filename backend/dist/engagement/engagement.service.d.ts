import { PrismaService } from '../prisma/prisma.service';
export declare class EngagementService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        surveys: ({
            responses: {
                id: string;
                feedback: string | null;
                surveyId: string;
                respondentId: string | null;
                npsScore: number;
                answersJson: string;
                submittedAt: Date;
            }[];
        } & {
            id: string;
            title: string;
            createdAt: Date;
            status: string;
            startDate: string;
            endDate: string;
            description: string;
            surveyType: string;
            isAnonymous: boolean;
            responseCount: number;
        })[];
        feedPosts: {
            id: string;
            title: string;
            createdAt: Date;
            likesCount: number;
            content: string;
            authorId: string;
            authorName: string;
            authorAvatar: string | null;
            postType: string;
            mediaUrl: string | null;
            pinned: boolean;
            commentsCount: number;
        }[];
        recognitions: {
            message: string;
            id: string;
            createdAt: Date;
            giverId: string;
            giverName: string;
            receiverId: string;
            receiverName: string;
            recognitionType: string;
            badgeIcon: string;
            isPublic: boolean;
            likesCount: number;
        }[];
        suggestions: {
            id: string;
            title: string;
            createdAt: Date;
            status: string;
            employeeId: string | null;
            description: string;
            category: string;
            employeeName: string | null;
            upvotesCount: number;
            hrResponse: string | null;
        }[];
    }>;
    handleAction(body: any): Promise<{
        message: string;
        id: string;
        createdAt: Date;
        giverId: string;
        giverName: string;
        receiverId: string;
        receiverName: string;
        recognitionType: string;
        badgeIcon: string;
        isPublic: boolean;
        likesCount: number;
    } | {
        id: string;
        title: string;
        createdAt: Date;
        likesCount: number;
        content: string;
        authorId: string;
        authorName: string;
        authorAvatar: string | null;
        postType: string;
        mediaUrl: string | null;
        pinned: boolean;
        commentsCount: number;
    } | {
        id: string;
        title: string;
        createdAt: Date;
        status: string;
        employeeId: string | null;
        description: string;
        category: string;
        employeeName: string | null;
        upvotesCount: number;
        hrResponse: string | null;
    } | {
        id: string;
        feedback: string | null;
        surveyId: string;
        respondentId: string | null;
        npsScore: number;
        answersJson: string;
        submittedAt: Date;
    }>;
}
