import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import clientPromise from "@/app/lib/mongodb";
// তোমার মঙ্গোডিবি কানেকশন ফাইলের পাথ

// সার্ভার সাইডে ক্লায়েন্ট ইনিশিয়ালাইজেশন
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request) {
  try {
    try {
      const testClient = await clientPromise;
      const testDb = testClient.db("E-commerce-AI-Chatbot"); // 👈 এখানে তোমার সঠিক ডাটাবেস নাম দাও

      // কানেকশন ঠিক আছে কিনা দেখতে একটি সিম্পল কাউন্ট কোয়েরি
      const productCount = await testDb
        .collection("productsdb")
        .countDocuments();
      console.log("🟢 MongoDB Connected Successfully!");
      console.log(`📦 Total products found in database: ${productCount}`);

      // ডাটাবেস থেকে যেকোনো ১টি প্রোডাক্ট এনে কনসোলে প্রিন্ট করে দেখা
      const sampleProduct = await testDb.collection("productsdb").findOne({});
      // console.log("📄 Sample Product from DB:", sampleProduct);

      if (productCount === 0) {
        console.log(
          "⚠️ alert: কানেকশন ঠিক আছে, কিন্তু 'productsdb' কালেকশনটি খালি অথবা ডাটাবেসের নাম ভুল!",
        );
      }
    } catch (dbError) {
      console.error("🔴 MongoDB Connection Failed:", dbError.message);
      return NextResponse.json(
        { error: "Database connection failed: " + dbError.message },
        { status: 500 },
      );
    }

    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    // --- STEP 1: Intent Extraction (Gemini) ---
    // ইউজারের মেসেজ থেকে শুধু প্রোডাক্টের নাম বা কি-ওয়ার্ড বের করা
    const intentPrompt = `You are an AI assistant. Extract only the main product name or technical keyword from this user query for database searching. Respond with ONLY the keyword, nothing else. Do not include extra text, punctuation, or explanations.
    User query: "${message}"`;

    const intentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: intentPrompt,
    });

    const searchKeyword = intentResponse.text.trim();
    console.log("Extracted Keyword:", searchKeyword); // ডিবাগিং এর জন্য

    //   // --- STEP 2: MongoDB Atlas Search ---
    const client = await clientPromise;
    const db = client.db("E-commerce-AI-Chatbot"); // তোমার ডাটাবেসের নাম দাও

    //   // Atlas Search অথবা টেক্সট ইনডেক্স কোয়েরি
    //   let products = await db
    //     .collection("productsdb")
    //     .aggregate([
    //       {
    //         $search: {
    //           index: "ecommerce-ai-chatbot-product-search-index", // তোমার তৈরি করা সার্চ ইনডেক্স নাম
    //           text: {
    //             query: searchKeyword,
    //             path: ["name", "tags"],
    //             fuzzy: {},
    //           },
    //         },
    //       },
    //       { $limit: 3 }, // চ্যাটের ভেতর দেখানোর জন্য সেরা ৩টি রেজাল্ট নিলাম
    //     ])
    //     .toArray();

    //   console.log(products);

    //   // Fallback: যদি Atlas Search-এ কিছু না পাওয়া যায়, তবে সাধারণ Regex সার্চ
    //   if (products.length === 0) {
    //     products = await db
    //       .collection("productsdb")
    //       .find({ name: { $regex: searchKeyword, $options: "i" } })
    //       .limit(3)
    //       .toArray();
    //   }

    //   // --- STEP 3: Context Building & Final Response (Gemini) ---
    //   const productContext =
    //     products.length > 0
    //       ? JSON.stringify(products, null, 2)
    //       : "No products found in the database for this query.";

    //   const finalPrompt = `You are a helpful and professional sales assistant for an electronics store.
    //   Answer the user's question naturally based ONLY on the provided Database Product Data.
    //   If the product is available, tell them the price and stock. If not available, politely inform them.
    //   Mix Bangla and English (Banglish) naturally in your response as peers talk.

    //   User Question: "${message}"
    //   Database Product Data:
    //   ${productContext}`;

    //   const finalResponse = await ai.models.generateContent({
    //     model: "gemini-2.5-flash",
    //     contents: finalPrompt,
    //   });

    // --- STEP 2: MongoDB Atlas Search (Fuzzy & Fallback Enabled) ---
    let products = [];
    try {
      // প্রথমে Atlas Search চেষ্টা করবে
      products = await db
        .collection("productsdb")
        .aggregate([
          {
            $search: {
              index: "ecommerce-ai-chatbot-product-search-index", // তোমার ইনডেক্স নাম
              text: {
                query: searchKeyword,
                path: ["name", "tags"],
                fuzzy: { maxEdits: 2 }, // বানান একটু ভুল হলেও খুঁজে বের করবে
              },
            },
          },
          { $limit: 3 },
        ])
        .toArray();
    } catch (searchError) {
      console.log("⚠️ Atlas Search failed, switching to Regex Fallback...");
    }

    // Fallback: যদি Atlas Search-এ ডেটা না পাওয়া যায় বা এরর হয়, তবে সাধারণ Regex দিয়ে খোঁজো
    if (!products || products.length === 0) {
      products = await db
        .collection("productsdb")
        .find({
          $or: [
            { name: { $regex: searchKeyword, $options: "i" } },
            { tags: { $regex: searchKeyword, $options: "i" } },
          ],
        })
        .limit(3)
        .toArray();
    }

    console.log("🔍 Search Results Found:", products.length);

    // --- STEP 3: Context Building with Safe Guard ---
    // যদি কোনো প্রোডাক্টই না পাওয়া যায়, তবে Gemini-কে স্পষ্ট নির্দেশনা দেওয়া
    let productContext = "";
    if (products && products.length > 0) {
      productContext = JSON.stringify(products, null, 2);
    } else {
      productContext =
        "No products found matching this keyword in our store inventory. The store does not have this item.";
    }

    const finalPrompt = `You are a helpful sales assistant for an electronics store.
    Answer the user's question naturally based ONLY on the provided Database Product Data.
    
    CRITICAL RULE: If the Database Product Data says "No products found", politely tell the user that this product is currently out of stock or not available in our shop, and suggest them to look for other items like iPhone, Samsung, Keychron, or Laptop.
    
    Mix Bangla and English (Banglish) naturally.

    User Question: "${message}"
    Database Product Data:
    ${productContext}`;

    // --- STEP 4: Gemini Response ---
    const finalResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash", // স্টেবল মডেল
      contents: finalPrompt,
    });
    console.log(finalResponse.text);
    console.log(finalResponse.data);

    return NextResponse.json({
      reply: finalResponse.text,
      products: products,
    });
  } catch (error) {
    console.error("Backend Error:", error);
    return NextResponse.json(
      { error: "Something went wrong in the server" },
      { status: 500 },
    );
  }
}
