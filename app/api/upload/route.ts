import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Allowed image mime types
const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
];

// Max file size: 1MB
const MAX_FILE_SIZE = 1 * 1024 * 1024;

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        
        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // Validate file type
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: "Invalid file type. Only JPEG, PNG, GIF, WEBP, and SVG are allowed." },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: "File size exceeds the 1MB limit." },
                { status: 400 }
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        
        // Generate unique filename
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const originalExtension = path.extname(file.name) || ".png";
        const filename = `${uniqueSuffix}${originalExtension}`;
        
        // Destination directory inside public folder
        const uploadDir = path.join(process.cwd(), "public", "uploads", "questions");
        
        // Create directory recursively if it doesn't exist
        await mkdir(uploadDir, { recursive: true });
        
        // Write the file
        const filePath = path.join(uploadDir, filename);
        await writeFile(filePath, buffer);
        
        // Return public accessible URL
        const imageUrl = `/uploads/questions/${filename}`;
        return NextResponse.json({ imageUrl }, { status: 201 });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: "Upload failed", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
