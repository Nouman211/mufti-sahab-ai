const STORAGE_KEY = "muftiChatHistory";
const THEME_KEY = "muftiTheme";

const messagesContainer = document.getElementById("messages");
const userInput = document.getElementById("userInput");
const chatForm = document.getElementById("chatForm");
const sendBtn = document.getElementById("sendBtn");
const themeToggle = document.getElementById("themeToggle");
const clearChat = document.getElementById("clearChat");
const voiceBtn = document.getElementById("voiceBtn");
const suggestions = document.getElementById("suggestions");
const scrollBottom = document.getElementById("scrollBottom");
const confirmOverlay = document.getElementById("confirmOverlay");
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");

let chatHistory = [];
let isProcessing = false;

function formatTime() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, "0");
  const m = now.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function makeAvatar(sender) {
  const div = document.createElement("div");
  div.className = "avatar";
  div.textContent = sender === "bot" ? "📖" : "👤";
  return div;
}

function makeMsgHeader(author, time) {
  const header = document.createElement("div");
  header.className = "msg-header";

  const nameSpan = document.createElement("span");
  nameSpan.className = "msg-author";
  nameSpan.textContent = author;

  const timeSpan = document.createElement("span");
  timeSpan.className = "msg-time";
  timeSpan.textContent = time;

  header.appendChild(nameSpan);
  header.appendChild(timeSpan);
  return header;
}

function makeCopyBtn(msgId) {
  const btn = document.createElement("button");
  btn.className = "copy-btn";
  btn.textContent = "📋";
  btn.title = "کاپی کریں";
  btn.dataset.msgId = msgId;

  btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    const msgEl = document.querySelector(`[data-id="${msgId}"]`);
    if (!msgEl) return;
    const contentEl = msgEl.querySelector(".msg-content");
    const text = contentEl.innerText.replace(/کاپی کریں|📋|✅/g, "").trim();

    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = "✅";
      btn.classList.add("copied");
      setTimeout(() => {
        btn.textContent = "📋";
        btn.classList.remove("copied");
      }, 1500);
    } catch {
      btn.textContent = "❌";
    }
  });

  return btn;
}

function appendMessage(text, sender, id, time) {
  const msgId = id || generateId();
  const msgTime = time || formatTime();

  const div = document.createElement("div");
  div.className = `message ${sender}`;
  div.dataset.id = msgId;

  const avatar = makeAvatar(sender);
  const content = document.createElement("div");
  content.className = "msg-content";

  const author = sender === "bot" ? "مفتی حافظ صفوان لودھی صاحب" : "معزز سائل";
  const header = makeMsgHeader(author, msgTime);
  content.appendChild(header);

  const paragraphs = text.split("\n").filter((p) => p.trim());
  paragraphs.forEach((p) => {
    const para = document.createElement("p");
    para.innerHTML = p.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight:700;">$1</strong>');
    content.appendChild(para);
  });

  if (sender === "bot") {
    const copyBtn = makeCopyBtn(msgId);
    content.appendChild(copyBtn);
  }

  div.appendChild(avatar);
  div.appendChild(content);
  messagesContainer.appendChild(div);

  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  return msgId;
}

function showTyping() {
  const div = document.createElement("div");
  div.className = "message bot typing";
  div.id = "typingIndicator";

  const avatar = makeAvatar("bot");
  const content = document.createElement("div");
  content.className = "msg-content";

  for (let i = 0; i < 3; i++) {
    const span = document.createElement("span");
    content.appendChild(span);
  }

  div.appendChild(avatar);
  div.appendChild(content);
  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideTyping() {
  const typing = document.getElementById("typingIndicator");
  if (typing) typing.remove();
}

function saveConversation() {
  try {
    const msgs = messagesContainer.querySelectorAll(".message:not(.typing)");
    const data = [];
    msgs.forEach((msg) => {
      if (msg.id === "typingIndicator") return;
      const isBot = msg.classList.contains("bot");
      const contentEl = msg.querySelector(".msg-content");
      const timeEl = msg.querySelector(".msg-time");
      data.push({
        sender: isBot ? "bot" : "user",
        text: contentEl ? contentEl.innerText.replace(/کاپی کریں|📋|✅/g, "").trim() : "",
        id: msg.dataset.id,
        time: timeEl ? timeEl.textContent : formatTime(),
      });
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function loadConversation() {
  // Clear history on page refresh
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("muftiApiHistory");

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const data = JSON.parse(saved);
    if (!data.length) return;

    messagesContainer.innerHTML = "";

    data.forEach((msg) => {
      if (msg.sender === "bot" && msg.id === "welcome") {
        appendMessage(msg.text, msg.sender, msg.id, msg.time);
      } else {
        appendMessage(msg.text, msg.sender, msg.id, msg.time);
      }
    });

    const hasUserMsg = data.some((m) => m.sender === "user");
    suggestions.style.display = hasUserMsg ? "none" : "flex";
  } catch {}
}

function restoreChatHistory() {
  try {
    const saved = localStorage.getItem("muftiApiHistory");
    if (saved) {
      chatHistory = JSON.parse(saved);
    }
  } catch {}
}

function saveChatHistory() {
  try {
    localStorage.setItem("muftiApiHistory", JSON.stringify(chatHistory));
  } catch {}
}

function updateScrollButton() {
  const isScrolledUp =
    messagesContainer.scrollHeight -
      messagesContainer.scrollTop -
      messagesContainer.clientHeight >
    100;
  scrollBottom.classList.toggle("visible", isScrolledUp);
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
  localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
}

async function sendMessage(message) {
  if (isProcessing) return;
  if (!message.trim()) return;

  isProcessing = true;
  sendBtn.disabled = true;

  appendMessage(message, "user");
  chatHistory.push({ role: "user", content: message });
  saveChatHistory();

  suggestions.style.display = "none";

  userInput.value = "";
  showTyping();
  saveConversation();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history: chatHistory }),
    });

    const data = await res.json();
    hideTyping();

    if (data.reply) {
      appendMessage(data.reply, "bot");
      chatHistory.push({ role: "assistant", content: data.reply });
      saveChatHistory();
    } else {
      appendMessage(
        "معاف کیجیے، کوئی جواب نہیں ملا۔ براہ کرم دوبارہ کوشش کریں۔",
        "bot"
      );
    }
  } catch (err) {
    hideTyping();
    appendMessage(
      "معاف کیجیے، کچھ تکنیکی مسئلہ پیش آ گیا ہے۔ براہ کرم دوبارہ کوشش کریں۔",
      "bot"
    );
  }

  saveConversation();
  isProcessing = false;
  sendBtn.disabled = false;
  userInput.focus();
}

function clearAllChat() {
  confirmOverlay.classList.add("active");
}

function confirmClear() {
  messagesContainer.innerHTML = "";
  chatHistory = [];
  suggestions.style.display = "flex";

  appendMessage(
    "بسم اللہ الرحمن الرحیم\nالسلام علیکم ورحمۃ اللہ و برکاتہ\nمیں مفتی حافظ صفوان لودھی صاحب۔ قرآن و سنت کی روشنی میں آپ کا رہنما۔\nبراہ کرم معزز سائل اپنا اسلامی سوال پوچھیں، میں چاروں دلائل (قرآن، حدیث، صحابہ کا طرز عمل، اور علما کی رائے) کے ساتھ جواب دوں گا، ان شاء اللہ۔",
    "bot",
    "welcome"
  );

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("muftiApiHistory");
  confirmOverlay.classList.remove("active");
}

async function startVoiceRecognition() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    appendMessage(
      "معاف کیجیے، آپ کا براؤزر وائس ریگنیشن کو سپورٹ نہیں کرتا۔ براہ کرم جدید براؤزر استعمال کریں۔",
      "bot"
    );
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.lang = 'ur-PK';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  hideTyping();

  try {
    appendMessage(
      "میں آپ کو سن رہا ہوں... براہ کرم سوال پوچھیں، میں جواب دینے کے لیے تیار ہوں۔",
      "bot"
    );

    const result = await new Promise((resolve) => {
      recognition.onresult = (event) => {
        const speechResult = event.results[0][0].transcript;
        resolve(speechResult);
      };

      recognition.onerror = (event) => {
        resolve(null);
      };

      recognition.start();
    });

    if (result) {
      sendMessage(result);
    }
  } catch (err) {
    appendMessage(
      "معاف کیجیے، وائس ریگنیشن شروع کرنے میں مسئلہ پیش آ گیا ہے۔ براہ کرم دوبارہ کوشش کریں۔",
      "bot"
    );
  }
}

voiceBtn.addEventListener("click", (e) => {
  e.preventDefault();
  startVoiceRecognition();
});

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = userInput.value.trim();
  if (msg) sendMessage(msg);
});

themeToggle.addEventListener("click", toggleTheme);

clearChat.addEventListener("click", clearAllChat);

confirmYes.addEventListener("click", confirmClear);

confirmNo.addEventListener("click", () => {
  confirmOverlay.classList.remove("active");
});

confirmOverlay.addEventListener("click", (e) => {
  if (e.target === confirmOverlay) {
    confirmOverlay.classList.remove("active");
  }
});

messagesContainer.addEventListener("scroll", updateScrollButton);

scrollBottom.addEventListener("click", () => {
  messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: "smooth" });
  scrollBottom.classList.remove("visible");
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    confirmOverlay.classList.remove("active");
  }
});

document.querySelectorAll(".suggestion-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const q = btn.dataset.q;
    if (q) sendMessage(q);
  });
});

const savedTheme = localStorage.getItem(THEME_KEY) || "light";
applyTheme(savedTheme);
restoreChatHistory();
loadConversation();
