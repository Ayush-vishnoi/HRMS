import { EngagementService } from './engagement.service';
export declare class EngagementController {
    private engagementService;
    constructor(engagementService: EngagementService);
    findAll(): Promise<{
        surveys: ({
            responses: {
                id: string;
                surveyId: string;
                respondentId: string | null;
                npsScore: number;
                answersJson: string;
                feedback: string | null;
                submittedAt: Date;
            }[];
        } & {
            id: string;
            status: string;
            createdAt: Date;
            startDate: string;
            endDate: string;
            title: string;
            description: string;
            surveyType: string;
            isAnonymous: boolean;
            responseCount: number;
        })[];
        feedPosts: {
            id: string;
            createdAt: Date;
            title: string;
            authorId: string;
            authorName: string;
            authorAvatar: string | null;
            postType: string;
            content: string;
            mediaUrl: string | null;
            pinned: boolean;
            likesCount: number;
            commentsCount: number;
        }[];
        recognitions: {
            message: string;
            id: string;
            createdAt: Date;
            likesCount: number;
            giverId: string;
            giverName: string;
            receiverId: string;
            receiverName: string;
            recognitionType: string;
            badgeIcon: string;
            isPublic: boolean;
        }[];
        suggestions: {
            id: string;
            status: string;
            createdAt: Date;
            category: string;
            employeeId: string | null;
            title: string;
            description: string;
            employeeName: string | null;
            upvotesCount: number;
            hrResponse: string | null;
        }[];
    }>;
    handleAction(body: any): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        authorId: string;
        authorName: string;
        authorAvatar: string | null;
        postType: string;
        content: string;
        mediaUrl: string | null;
        pinned: boolean;
        likesCount: number;
        commentsCount: number;
    } | {
        message: string;
        id: string;
        createdAt: Date;
        likesCount: number;
        giverId: string;
        giverName: string;
        receiverId: string;
        receiverName: string;
        recognitionType: string;
        badgeIcon: string;
        isPublic: boolean;
    } | {
        id: string;
        status: string;
        createdAt: Date;
        category: string;
        employeeId: string | null;
        title: string;
        description: string;
        employeeName: string | null;
        upvotesCount: number;
        hrResponse: string | null;
    } | {
        id: string;
        surveyId: string;
        respondentId: string | null;
        npsScore: number;
        answersJson: string;
        feedback: string | null;
        submittedAt: Date;
    }>;
}
