require("dotenv").config();
const nodemailer = require("nodemailer");

async function main() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : null;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const sender = process.env.SMTP_SENDER || "Seleksia Test";

    console.log("=== SMTP Configuration ===");
    console.log(`SMTP_HOST:   ${host || "(Not set)"}`);
    console.log(`SMTP_PORT:   ${port || "(Not set)"}`);
    console.log(`SMTP_USER:   ${user || "(Not set)"}`);
    console.log(`SMTP_PASS:   ${pass ? "*****" : "(Not set)"}`);
    console.log(`SMTP_SENDER: ${sender}`);
    console.log("==========================\n");

    if (!host || !port || !user || !pass) {
        console.error("❌ Error: Missing SMTP environment variables in .env!");
        console.log("Please check your .env file and configure: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.");
        process.exit(1);
    }

    const secure = port === 465;
    console.log(`Connecting to SMTP server at ${host}:${port} (secure: ${secure})...`);

    const transporter = nodemailer.createTransport({
        host: host,
        port: port,
        secure: secure,
        auth: {
            user: user,
            pass: pass,
        },
        timeout: 10000,
    });

    try {
        // Verify connection configuration
        await transporter.verify();
        console.log("✅ Connection successfully established and verified!");
    } catch (error) {
        console.error("❌ Verification failed:", error.message);
        console.error("\nFull error details:", error);
        process.exit(1);
    }

    const recipient = process.argv[2];
    if (!recipient) {
        console.log("\n💡 Tip: To send a real test email, run the command with a recipient email address:");
        console.log("   node scripts/test-email.js your-email@example.com\n");
        return;
    }

    console.log(`\nAttempting to send a test email to: ${recipient}...`);
    try {
        const info = await transporter.sendMail({
            from: `"${sender}" <${user}>`,
            to: recipient,
            subject: "Seleksia SMTP Test Email",
            text: "Hello! This is a test email sent from the Seleksia backend to verify that the SMTP connection works properly.",
            html: `
                <div style="font-family: sans-serif; padding: 20px; line-height: 1.6; color: #333;">
                    <h2 style="color: #4F46E5;">SMTP Connection Success!</h2>
                    <p>Hello,</p>
                    <p>This is a test email sent from the <strong>Seleksia</strong> backend configuration.</p>
                    <p>If you received this message, it means your SMTP configuration is fully functional and ready to be used for sending candidate email blasts.</p>
                    <hr style="border: 0; border-top: 1px dashed #ddd; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #777;">Sent automatically during verification check.</p>
                </div>
            `
        });

        console.log("✅ Email successfully sent!");
        console.log("Message ID:", info.messageId);
        if (info.accepted) console.log("Accepted:", info.accepted);
        if (info.rejected && info.rejected.length > 0) console.log("Rejected:", info.rejected);
    } catch (error) {
        console.error("❌ Failed to send email:", error.message);
        console.error("\nFull error details:", error);
    }
}

main();
