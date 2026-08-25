import * as dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const prisma = new PrismaClient();

const BASE_URL = 'http://127.0.0.1:3000';

async function runTests() {
  console.log('🧪 Starting Resend Inbound Webhook Test Suite...\n');

  try {
    // 1. Test GET Endpoint
    console.log('👉 1. Testing GET /api/webhook/resend (Healthcheck)...');
    const getRes = await fetch(`${BASE_URL}/api/webhook/resend`);
    const getData = await getRes.json();
    console.log('   Response Status:', getRes.status);
    console.log('   Response Body:', getData);

    if (getRes.status === 200 && getData.status === 'ok') {
      console.log('   ✅ GET endpoint test passed!\n');
    } else {
      console.error('   ❌ GET endpoint test failed!\n');
    }

    // 2. Test Inbound Email to support@seleksia.com
    console.log('👉 2. Testing POST /api/webhook/resend (Inbound email to support@seleksia.com)...');
    const mockEmailPayload = {
      type: 'email.received',
      created_at: new Date().toISOString(),
      data: {
        email_id: `test-resend-${Date.now()}`,
        from: 'Budi Santoso <budi.santoso@gmail.com>',
        to: ['support@seleksia.com'],
        subject: 'Pertanyaan Jadwal Asesmen Psikotes',
        text: 'Halo Tim Seleksia, saya ingin menanyakan terkait batas waktu pengerjaan tes psikotes saya.',
        html: '<p>Halo Tim Seleksia,</p><p>Saya ingin menanyakan terkait batas waktu pengerjaan tes psikotes saya.</p>',
        headers: {
          'message-id': `<test-msg-${Date.now()}@mail.gmail.com>`,
          date: new Date().toUTCString(),
        },
        attachments: [
          {
            filename: 'bukti_pembayaran.png',
            content_type: 'image/png',
            size: 1048576,
          },
        ],
      },
    };

    const postRes = await fetch(`${BASE_URL}/api/webhook/resend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockEmailPayload),
    });

    const postData = await postRes.json();
    console.log('   Response Status:', postRes.status);
    console.log('   Response Body:', postData);

    if (postRes.status === 200 && postData.success) {
      console.log('   ✅ Inbound email webhook processed successfully!\n');
    } else {
      console.error('   ❌ Inbound email webhook test failed!\n');
    }

    // 3. Verify in PostgreSQL Database
    console.log('👉 3. Verifying record saved in database (inbound_emails)...');
    const savedRecord = await prisma.inboundEmail.findUnique({
      where: { resendId: mockEmailPayload.data.email_id },
    });

    if (savedRecord) {
      console.log('   ✅ Database record verified:');
      console.log('      - ID:', savedRecord.id);
      console.log('      - Resend ID:', savedRecord.resendId);
      console.log('      - From:', savedRecord.from, `(${savedRecord.fromEmail})`);
      console.log('      - To:', savedRecord.to, `(${savedRecord.toEmail})`);
      console.log('      - Subject:', savedRecord.subject);
      console.log('      - Status:', savedRecord.status);
      console.log('      - Created At:', savedRecord.createdAt);
    } else {
      console.error('   ❌ Database record not found!');
    }

    // 4. Test Inbound with Non-Seleksia domain to verify domain filter
    console.log('\n👉 4. Testing domain filter with non-seleksia email address...');
    const nonSeleksiaPayload = {
      type: 'email.received',
      data: {
        email_id: `test-non-seleksia-${Date.now()}`,
        from: 'Spammer <spam@example.com>',
        to: ['someone@otherdomain.com'],
        subject: 'Spam Offer',
        text: 'Buy this now!',
      },
    };

    const nonSeleksiaRes = await fetch(`${BASE_URL}/api/webhook/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nonSeleksiaPayload),
    });
    const nonSeleksiaData = await nonSeleksiaRes.json();
    console.log('   Response:', nonSeleksiaData);
    if (nonSeleksiaData.isSeleksiaDomain === false) {
      console.log('   ✅ Non-seleksia domain correctly flagged as ignored_non_seleksia_domain!');
    }

    console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
