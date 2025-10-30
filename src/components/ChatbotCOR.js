import React, { useState, useRef, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { FiSend } from "react-icons/fi";
import cosineSimilarity from "compute-cosine-similarity";

const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

const Chatbot = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! Welcome to Colorado Resilience. How can I help you today?" },
  ]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);


async function getEmbedding(text) {
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
  return data.data[0].embedding;
}

const searchFromSources = async (query) => {
  const collectionsToSearch = ["Resources", "Documents","COR"];
  const queryEmbedding = await getEmbedding(query);

  let bestMatch = null;
  let bestScore = 0;
  let bestCollection = "";

  for (const colName of collectionsToSearch) {
    const colRef = collection(db, colName);
    const snapshot = await getDocs(colRef);

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.embedding || !Array.isArray(data.embedding)) return;

      // Convert Firestore-encoded embeddings safely to plain array
      const embeddingArray = Array.from(data.embedding);

      const score = cosineSimilarity(queryEmbedding, embeddingArray);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = data.content;
        bestCollection = colName;
      }
    });
  }

  if (bestMatch && bestScore > 0.70) {
    console.log(`📚 Found relevant data in Firestore (${bestCollection}), similarity score: ${bestScore.toFixed(3)}`);
    return bestMatch;
  } else {
    console.log(`🌐 No relevant match found in Firestore. Best score: ${bestScore.toFixed(3)}`);
    return null;
  }
};




  const callOpenAI = async (question) => {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are a helpful assistant for SplitSmart.com users." },
            { role: "user", content: question },
          ],
          temperature: 0.7,
        }),
      });
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("OpenAI API error:", error);
      return "Sorry, I couldn't get an answer right now.";
    }
  };

  const saveGeneratedAnswer = async (question, answer) => {
    try {
      await addDoc(collection(db, "COR"), {
        question,
        answer,
      });
    } catch (error) {
      console.error("Failed to save to Firestore:", error);
    }
  };

const sendMessage = async () => {
  if (!input.trim()) return;

  const userMsg = input;
  setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
  setInput("");

  console.log("🟢 User asked:", userMsg);

  // Try finding relevant context in Firestore
  let sourceAnswer = await searchFromSources(userMsg);
  let finalAnswer;

  if (sourceAnswer) {
    console.log("📚 Found relevant data in Firestore (Resources collection).");
    console.log("🧠 Using Firestore content for context:", sourceAnswer.slice(0, 150) + "...");
    
    finalAnswer = await callOpenAI(
      `Use only this context to answer:\n\n${sourceAnswer}\n\nUser: ${userMsg}`
    );

    console.log("✅ Response generated using Firestore context + OpenAI.");
  } else {
    console.log("🌐 No match found in Firestore — querying OpenAI directly.");
    finalAnswer = await callOpenAI(userMsg);
    console.log("✅ Response generated directly from OpenAI.");
  }

  setMessages((prev) => [...prev, { role: "assistant", content: finalAnswer }]);

  // Save interaction
  await saveGeneratedAnswer(userMsg, finalAnswer);
  console.log("💾 Conversation saved to Firestore (collection: COR).");
};



  return (
    <div
      style={{
        width: "100%",
        height: "auto",
        display: "flex",
        flexDirection: "column",
        borderRadius: "16px",
        backgroundColor: "#fff",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
        maxWidth: "100%",
        overflow: "hidden", // keep border radius clean, not scroll
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 16px",
          background: "linear-gradient(90deg, #3e95baff 0%, #479ed0ff 100%)",
          color: "#fff",
          fontWeight: 600,
          fontSize: "1rem",
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        SmartBot 💬
      </div>

      {/* Messages area (scrollable) */}
      <div
        style={{
          flex: 1,
          padding: "14px",
          overflowY: "auto", // ✅ scrollable messages
          backgroundColor: "#f9fafc",
          scrollBehavior: "smooth",
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              textAlign: msg.role === "user" ? "right" : "left",
              margin: "8px 0",
            }}
          >
            <span
              style={{
                backgroundColor: msg.role === "user" ? "#4c9ddbff" : "#e8ecf4",
                color: msg.role === "user" ? "#fff" : "#111827",
                padding: "10px 14px",
                borderRadius: "18px",
                display: "inline-block",
                maxWidth: "85%",
                wordWrap: "break-word",
                fontSize: "0.95rem",
                lineHeight: "1.4",
              }}
            >
              {msg.content}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px",
          borderTop: "1px solid #e5e7eb",
          backgroundColor: "#fff",
          flexShrink: 0,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type your message..."
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "20px",
            border: "1px solid #d1d5db",
            outline: "none",
            fontSize: "0.95rem",
            transition: "border-color 0.2s ease",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#52b4ecff")}
          onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
        />
        <button
          onClick={sendMessage}
          style={{
            backgroundColor: "#1d87a7ff",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: "42px",
            height: "42px",
            marginLeft: "8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 3px 8px rgba(0,0,0,0.15)",
            transition: "background 0.2s ease",
            flexShrink: 0,
          }}
        >
          <FiSend size={18} />
        </button>
      </div>
    </div>
  );
};

export default Chatbot;
