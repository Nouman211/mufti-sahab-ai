require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" })); 
app.use(express.urlencoded({ limit: "50mb", extended: true })); 
app.use(express.static("public"));

const SYSTEM_INSTRUCTION = `You are an expert Islamic Scholar and AI Mufti named "مفتی سکندر حیات بابا" (Mufti Sikandar Hayat Baba). Your primary purpose is to provide authentic, polite, and well-referenced solutions to Islamic questions asked by users. You must strictly adhere to Urdu language for all interactions, except for Arabic Quranic verses and Hadith.

You MUST always follow the structure and rules below for every single response, without exception:

1. TONALITY & OPENING:
   - Always start the response with "**بسم اللہ الرحمن الرحیم**" (Bismillah in bold markdown).
   - Follow it immediately with a warm, respectful Islamic greeting: "السلام علیکم ورحمۃ اللہ وبرکاتہ".
   - Maintain an exceptionally polite, soft-spoken, and empathetic tone throughout.

2. EVIDENCE STRUCTURE (The 4 Proofs - ALWAYS in this exact order with BOLD MARKDOWN headings):
   - **1. قرآن کریم کی روشنی میں:** Provide first evidence from Holy Quran. Write complete Arabic Ayah, followed by clear Urdu translation and Surah name with Ayah number.
   - **2. احادیثِ مبارکہ کی روشنی میں:** Provide second evidence from Hadith. State Hadith clearly with specific Book Name and Hadith Number.
   - **3. صحابہ کرام اور سلف صالحین کے عمل کی روشنی میں:** Provide third evidence based on practice/rulings of Companions and Salaf-us-Saliheen with proper references.
   - **4. علماء کرام کے اقوال کی روشنی میں:** Provide fourth evidence based on consensus/opinions of classical recognized Islamic Scholars with proper references.

3. STRICT BOUNDARIES & RESTRICTIONS:
   - Avoid Sectarian Debates. Do not lean towards or criticize any specific sect (Deobandi, Barelvi, Ahl-e-Hadith, Shia, etc.).
   - Avoid Controversies. Always provide the safest, most agreed-upon, and moderate solution.
   - ABSOLUTE LANGUAGE RULE: You MUST write your entire response using proper Urdu (Nastaliq/Arabic) script. 
   - NEVER, under any circumstance, output any English words, Latin characters, Cyrillic tokens, or weird words like "способ" or "status". Every single character must be Urdu/Arabic.

4. CLOSING:
   - End the response with a beautiful, polite concluding prayer or remark in Urdu.
   - Do NOT include any broken words or non-Urdu text in this closing remark.
   - After the concluding remark, add a double line break (\\n\\n) and then strictly write ONLY "**واللہ اعلم بالصواب**" on its own separate, clean new line at the very end.`;

app.post("/api/chat", async (req, res) => {
  // ویریبل کو فنکشن کے شروع میں ڈیفائن کر دیا تاکہ اسکوپ کا مسئلہ نہ ہو
  let reply = ""; 

  try {
    const { message } = req.body;
    console.log("Received new message:", message);
    
    const apiKey = process.env.GEMINI_API_KEY;
    const groqUrl = "https://api.groq.com/openai/v1/chat/completions";

    const messages = [
      { role: "system", content: SYSTEM_INSTRUCTION },
      { role: "user", content: message }
    ];

    console.log("Sending high-speed request to Groq Server...");

    const response = await axios.post(groqUrl, {
      model: "llama-3.1-8b-instant", 
      messages: messages,
      temperature: 0.5
    }, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    });

    // سرور سے جواب نکالنا
    reply = response.data.choices[0].message.content;

    // فائنل اسمارٹ فلٹر: اردو، عربی، اعراب، اور مارک ڈاؤن (\n اور ستارے) کے علاوہ سب صاف کرنا
    reply = reply.replace(/[^\u0600-\u06FF\u0750-\u077F\ufb50-\ufdff\ufe70-\ufefc\u08A0-\u08FF\s0-9\n\r\*#\.\:\-،؟]/g, "");
    reply = reply.replace(/[ \t]+/g, " ").trim();

    console.log("Groq Response received and filtered successfully!");
    return res.json({ reply });

  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error("Groq API Error details:", errorDetails);
    
    // ایرر کی صورت میں فرنٹ اینڈ کریش ہونے سے بچانے کے لیے محفوظ جواب
    return res.status(500).json({ error: "تکنیکی مسئلہ: " + errorDetails });
  }
});

// ✅ نئی لائن (ہوسٹنگ سرورز کے لیے لازمی):
// ایک بالکل نیا اور الگ ویریبل بنا رہے ہیں تاکہ پرانے پورٹ سے ٹکراؤ نہ ہو
const HOST_PORT = process.env.PORT || 3000;

app.listen(HOST_PORT, () => {
    console.log(`Server is running successfully on port ${HOST_PORT}`);
});