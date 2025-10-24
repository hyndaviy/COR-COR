// src/backend/processDocuments.js
import fs from "fs";
import path from "path";
import admin from "firebase-admin";
import dotenv from "dotenv";
import fetch from "node-fetch";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs"; // ✅ modern PDF.js

dotenv.config();

// 🔐 Firebase Admin Initialization (no key file)
// Uses gcloud auth credentials and connects to your organization project
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "cor1-d0bb8", // ✅ Replace with your organization Firebase project ID
});

const db = admin.firestore();

// 🔑 OpenAI API Key (from .env)
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

// 📂 Folder containing your documents
const folderPath = "C:\\Users\\hynda\\smart-chatbot\\cor-cor\\src\\backend\\documents";

// ✅ Helper: Generate OpenAI Embeddings
async function generateEmbedding(text) {
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    });

    const data = await res.json();
    return data?.data?.[0]?.embedding || null;
  } catch (err) {
    console.error("❌ Embedding error:", err);
    return null;
  }
}

// ✅ Helper: Extract text from PDF or DOCX
async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  // --- PDF files ---
  if (ext === ".pdf") {
    try {
      const dataBuffer = new Uint8Array(fs.readFileSync(filePath));
      const pdf = await pdfjsLib.getDocument({ data: dataBuffer }).promise;
      let text = "";

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const pageText = content.items.map((item) => item.str).join(" ");
        text += pageText + "\n";
      }

      return text;
    } catch (err) {
      console.error(`❌ PDF extraction error for ${filePath}:`, err);
      return "";
    }
  }

  // --- Word (.docx) files ---
  if (ext === ".docx") {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (err) {
      console.error(`❌ DOCX extraction error for ${filePath}:`, err);
      return "";
    }
  }

  console.warn(`⚠️ Unsupported file type: ${ext}`);
  return "";
}

// ✅ Main Function
async function processDocuments() {
  const files = fs.readdirSync(folderPath);

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    console.log(`📄 Processing ${file} ...`);

    const text = await extractText(filePath);
    if (!text) {
      console.warn(`⚠️ Skipping ${file} (no text extracted).`);
      continue;
    }

    // Trim text for embedding token limit
    const trimmed = text.slice(0, 8000);

    const embedding = await generateEmbedding(trimmed);
    if (!embedding) {
      console.warn(`⚠️ Skipping ${file} (embedding failed).`);
      continue;
    }

    // Upload to Firestore
    await db.collection("Documents").add({
      filename: file,
      content: trimmed,
      embedding,
      createdAt: new Date(),
    });

    console.log(`✅ Uploaded ${file}`);
  }

  console.log("🎉 All documents processed successfully!");
}

// 🚀 Run
processDocuments();
