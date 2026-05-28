import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const assignment = await prisma.testAssignment.findFirst();
        if (!assignment) {
            console.log('No assignments found.');
            return;
        }
        console.log('Found assignment:', assignment.id);

        const existingSession = await prisma.examSession.findUnique({
            where: { assignmentId: assignment.id },
        });
        console.log('Existing session:', existingSession);

        if (existingSession) {
            const updated = await prisma.examSession.update({
                where: { assignmentId: assignment.id },
                data: {
                    sessionToken: 'test-token',
                    deviceFingerprint: existingSession.deviceFingerprint || 'test-fp',
                },
            });
            console.log('Updated session:', updated);
        } else {
            const session = await prisma.examSession.create({
                data: {
                    assignmentId: assignment.id,
                    deviceFingerprint: 'test-fp',
                    sessionToken: 'test-token',
                },
            });
            console.log('Created session:', session);
        }
    } catch (error) {
        console.error('Error creating/updating session:', error);
    } finally {
        await prisma.$disconnect();
    }
}
main();
