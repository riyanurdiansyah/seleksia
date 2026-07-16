import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultTemplateContent = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
    <h2 style="color: #059669;">Undangan Seleksi</h2>
    <p>Halo <strong>{{candidate_name}}</strong>,</p>
    <p>Anda telah diundang untuk mengikuti asesmen di platform <strong>{{company_name}}</strong>.</p>
    <p>Berikut adalah informasi akun Anda untuk masuk ke sistem:</p>
    
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>URL Login:</strong> <a href="{{login_url}}" style="color: #059669;">{{login_url}}</a></p>
        <p style="margin: 0 0 10px 0;"><strong>Username:</strong> {{username}}</p>
        <p style="margin: 0;"><strong>Password:</strong> {{password}}</p>
    </div>

    <p>Silakan masuk dan segera ganti kata sandi Anda demi keamanan.</p>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="{{login_url}}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login Sekarang</a>
    </div>
    
    <p style="font-size: 12px; color: #6b7280; margin-top: 30px;">&copy; ${new Date().getFullYear()} {{company_name}}</p>
</div>
`;

async function main() {
    console.log('Seeding default email templates for existing companies...');
    
    // Get all companies
    const companies = await prisma.company.findMany();
    let seededCount = 0;

    for (const company of companies) {
        // Check if they already have an email template
        const existing = await prisma.emailTemplate.findFirst({
            where: { companyId: company.id }
        });

        if (!existing) {
            await prisma.emailTemplate.create({
                data: {
                    companyId: company.id,
                    name: 'Undangan Standar (Sistem)',
                    subject: 'Undangan Seleksi - {{company_name}}',
                    content: defaultTemplateContent.trim(),
                    isDefault: true,
                }
            });
            seededCount++;
            console.log(`Created default template for company: ${company.name}`);
        }
    }

    console.log(`Done! Seeded templates for ${seededCount} companies.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
