// src/backend/scrapeAndStore.js
import admin from "firebase-admin";
import fetch from "node-fetch";
import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

// ✅ Initialize Firebase Admin using ADC and explicit project ID
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "cor1-d0bb8", // 🔒 replace with your organization Firebase project ID
});

const db = admin.firestore();

// ✅ OpenAI API key from environment
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

// Example resource entries to upload
const resources = [
  {
    title: "False Allegations",
    content:
      "False allegations are a common, serious tactic in contested custody and divorce cases...",
    url: "https://coloradoresilience.org/false-allegations/",
  },
  {
    title: "Parental Alienation Resource",
    content:
      "Parental Alienation Resource provides timeline and evidence-tracking tools for parents...",
    url: "https://www.parentalalienationresource.com/",
  },
  {
    title: "End to Domestic Violence",
    content:
      "End to Domestic Violence provides support, guidance, and advocacy for survivors of domestic abuse...",
    url: "https://endtodv.org/",
  },
  {
    title: "Men and Boys Network",
    content:
      "Men and Boys Network provides resources, counseling, and support for fathers and male caregivers...",
    url: "http://www.menandboys.net/",
  },
];

// ✅ Generate OpenAI embeddings safely
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
    if (data.data && data.data.length > 0) {
      return data.data[0].embedding;
    } else {
      console.error("⚠️ No embedding returned:", data);
      return null;
    }
  } catch (err) {
    console.error("❌ Embedding generation failed:", err);
    return null;
  }
}

// ✅ Upload resources to Firestore
async function uploadResources() {
  for (const r of resources) {
    console.log(`Processing: ${r.title}`);
    const embedding = await generateEmbedding(r.content);

    if (!embedding) {
      console.warn(`⚠️ Skipping ${r.title} — no embedding.`);
      continue;
    }

    await db.collection("Resources").add({
      ...r,
      embedding,
      createdAt: new Date(),
    });

    console.log(`✅ Uploaded ${r.title}`);
  }

  console.log("🎉 All resources uploaded to your organization Firebase!");
}

// 🚀 Run the upload
uploadResources();
