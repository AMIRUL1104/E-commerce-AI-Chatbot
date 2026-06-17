"use client";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "ai",
      text: "Hello! I'm **Sirina**. Ask me anything about our products — I'm here to help! 🚀",
      products: [],
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userPrompt = input.trim();
    setInput("");

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      text: userPrompt,
      products: [],
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userPrompt }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "ai",
            text: data.reply,
            products: data.products || [], // ব্যাকএন্ড থেকে আসা প্রোডাক্ট লিস্ট
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "ai",
            text: data.error || "Something went wrong!",
            products: [],
          },
        ]);
      }
    } catch (error) {
      console.error("Frontend Fetch Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "ai",
          text: "Failed to connect to server. Please try again.",
          products: [],
        },
      ]);
    }
    setIsLoading(false);
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome",
        role: "ai",
        text: "Chat cleared! Ask me anything new.",
        products: [],
      },
    ]);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Text Copied To Your Clipboard!");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950 text-slate-100 antialiased selection:bg-blue-500/30">
      {/* 🔹 HEADER */}
      <header className="sticky top-0 z-10 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-4 py-4 shadow-sm">
        <div className="max-w-[600px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              E-commerce AI Chatbot
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">How can I help you?</p>
          </div>
          {messages.length > 1 && (
            <button
              onClick={clearChat}
              className="text-xs bg-slate-800 hover:bg-rose-950/50 hover:text-rose-400 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors duration-200"
            >
              Clear
            </button>
          )}
        </div>
      </header>

      {/* 🔹 CHAT AREA */}
      <main className="flex-1 max-w-[600px] w-full mx-auto p-4 overflow-y-auto pb-32 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === "user" ? "items-end" : "items-start"
            } animate-fadeIn`}
          >
            {/* চ্যাট বাবল */}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md whitespace-pre-line group relative ${
                msg.role === "user"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none"
                  : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none"
              }`}
            >
              {msg.text}

              {/* Copy Button */}
              {msg.role === "ai" && msg.id !== "welcome" && (
                <button
                  onClick={() => copyToClipboard(msg.text)}
                  className="absolute bottom-1 right-2 opacity-0 group-hover:opacity-100 text-[10px] bg-slate-800 hover:bg-slate-700 px-1.5 py-0.5 rounded transition-all duration-150 text-slate-400"
                >
                  Copy
                </button>
              )}
            </div>

            {/* 📦 প্রোডাক্ট কার্ড রেন্ডারিং (যদি এআই রেসপন্সে প্রোডাক্ট থাকে) */}
            {msg.role === "ai" && msg.products && msg.products.length > 0 && (
              <div className="w-full max-w-[85%] mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fadeIn">
                {msg.products.map((product, idx) => (
                  <div
                    key={product._id || idx}
                    className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-lg flex flex-col justify-between hover:border-blue-500/40 transition-all duration-200"
                  >
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-semibold bg-slate-800 text-blue-400 px-2 py-0.5 rounded">
                        {product.brand || "Gadget"}
                      </span>
                      <h3 className="font-bold text-slate-100 text-sm mt-1.5 line-clamp-1">
                        {product.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {product.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">
                          Price
                        </p>
                        <p className="text-sm font-bold text-emerald-400">
                          {product.price} BDT
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase text-right">
                          Stock
                        </p>
                        <p
                          className={`text-xs font-semibold text-right ${product.stock > 0 ? "text-blue-400" : "text-rose-500"}`}
                        >
                          {product.stock > 0
                            ? `${product.stock} left`
                            : "Out of Stock"}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        alert(`Proceeding to checkout for ${product.name}`)
                      }
                      className="w-full mt-3 py-2 bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white rounded-lg text-xs font-medium transition-all duration-150"
                    >
                      Buy Now
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* 🔹 LOADING STATE */}
        {isLoading && (
          <div className="flex justify-start animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 text-slate-400 text-sm rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2 shadow-md">
              <span className="text-xs font-medium text-slate-400">
                Thinking
              </span>
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* 🔹 INPUT SECTION */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-slate-800/60 bg-gradient-to-t from-slate-950 via-slate-950 to-slate-950/80 backdrop-blur-md px-4 py-4">
        <div className="max-w-[600px] mx-auto">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isLoading
                  ? "Please wait..."
                  : "Ask about products (e.g., iPhone 13, Laptop)..."
              }
              disabled={isLoading}
              className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 rounded-xl pl-4 pr-14 py-3.5 text-sm placeholder-slate-500 text-slate-100 transition-all duration-200 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white disabled:text-slate-600 font-medium text-xs rounded-lg transition-all duration-200 flex items-center gap-1.5 h-[calc(100%-16px)]"
            >
              <span>Send</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-3.5 h-3.5"
              >
                <path d="M3.105 2.289a.75.75 0 0 0-.826.95l1.414 4.925A1.5 1.5 0 0 0 5.135 9.25h5.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.896 28.896 0 0 0 15.293-7.154.75.75 0 0 0 0-1.115A28.897 28.897 0 0 0 3.105 2.289Z" />
              </svg>
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
