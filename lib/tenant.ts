import { PrismaClient } from "@prisma/client";
import { cookies, headers } from "next/headers";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const globalPrisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = globalPrisma;

export async function getCompanyId(): Promise<string> {
    // Attempt to get from cookies
    const cookieStore = await cookies();
    const companyIdCookie = cookieStore.get("companyId");
    if (companyIdCookie?.value) {
        return companyIdCookie.value;
    }

    // Attempt to get from headers
    const headersList = await headers();
    const companyIdHeader = headersList.get("x-company-id");
    if (companyIdHeader) {
        return companyIdHeader;
    }

    // Fallback default (for development/testing)
    return "default-company-id";
}

// Helper to get a Prisma client instance with RLS / filtered by company
export async function getTenantPrisma() {
    const companyId = await getCompanyId();
    
    return globalPrisma.$extends({
        query: {
            candidate: {
                async $allOperations({ operation, args, query }) {
                    if (operation === 'create' || operation === 'createMany') {
                        // Inject companyId into data
                        if (args.data) {
                            if (Array.isArray(args.data)) {
                                args.data.forEach(d => { d.companyId = companyId; });
                            } else {
                                (args.data as any).companyId = companyId;
                            }
                        }
                    } else if (operation !== 'count' && operation !== 'findUnique' && args && typeof args === 'object' && 'where' in args) {
                        (args as any).where = { ...((args as any).where || {}), companyId };
                    }
                    return query(args);
                }
            },
            test: {
                async $allOperations({ operation, args, query }) {
                    if (operation === 'create' || operation === 'createMany') {
                        if (args.data) {
                            if (Array.isArray(args.data)) {
                                args.data.forEach(d => { d.companyId = companyId; });
                            } else {
                                (args.data as any).companyId = companyId;
                            }
                        }
                    } else if (operation !== 'count' && operation !== 'findUnique' && args && typeof args === 'object' && 'where' in args) {
                        (args as any).where = { ...((args as any).where || {}), companyId };
                    }
                    return query(args);
                }
            },
            instruction: {
                async $allOperations({ operation, args, query }) {
                    if (operation === 'create' || operation === 'createMany') {
                        if (args.data) {
                            if (Array.isArray(args.data)) {
                                args.data.forEach(d => { d.companyId = companyId; });
                            } else {
                                (args.data as any).companyId = companyId;
                            }
                        }
                    } else if (operation !== 'count' && operation !== 'findUnique' && args && typeof args === 'object' && 'where' in args) {
                        (args as any).where = { ...((args as any).where || {}), companyId };
                    }
                    return query(args);
                }
            },
            question: {
                async $allOperations({ operation, args, query }) {
                    if (operation === 'create' || operation === 'createMany') {
                        if (args.data) {
                            if (Array.isArray(args.data)) {
                                args.data.forEach(d => { d.companyId = companyId; });
                            } else {
                                (args.data as any).companyId = companyId;
                            }
                        }
                    } else if (operation !== 'count' && operation !== 'findUnique' && args && typeof args === 'object' && 'where' in args) {
                        (args as any).where = { ...((args as any).where || {}), companyId };
                    }
                    return query(args);
                }
            }
        }
    });
}
