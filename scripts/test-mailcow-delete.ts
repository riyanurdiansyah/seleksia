import dotenv from 'dotenv';
dotenv.config();

async function testGet() {
  const mailcowUrl = process.env.MAILCOW_API_URL?.trim().replace(/^"|"$/g, "");
  const mailcowKey = process.env.MAILCOW_API_KEY?.trim().replace(/^"|"$/g, "");
  
  if (!mailcowUrl || !mailcowKey) {
    console.error("Missing credentials");
    return;
  }
  
  const cleanUrl = mailcowUrl.endsWith("/") ? mailcowUrl.slice(0, -1) : mailcowUrl;
  
  console.log(`Sending to: ${cleanUrl}/get/mailbox/isuzu@seleksia.com`);
  
  const res = await fetch(`${cleanUrl}/get/mailbox/isuzu@seleksia.com`, {
    method: "GET",
    headers: {
      "accept": "application/json",
      "X-API-Key": mailcowKey
    }
  });
  
  console.log(`Status: ${res.status}`);
  const text = await res.text();
  console.log(`Response: ${text}`);
}

testGet();
