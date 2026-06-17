// "use server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const options = {
  maxPoolSize: 10, // একসঙ্গে সর্বোচ্চ ১০টি কানেকশন ওপেন থাকতে পারবে
};

let client;
let clientPromise;

if (!process.env.MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env.local");
}

if (process.env.NODE_ENV === "development") {
  // ডেভেলপমেন্ট মোডে গ্লোবাল ভ্যারিয়েবল ব্যবহার করা হয় যেন
  // প্রতিবার কোড চেঞ্জ বা রিলোড হলে নতুন কানেকশন তৈরি না হয়।
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // প্রোডাকশন মোডে গ্লোবাল ভ্যারিয়েবল ব্যবহার না করাই ভালো।
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// এই ক্লায়েন্ট প্রমিজটি আমাদের অন্যান্য এপিআই রাউটে ইম্পোর্ট করতে হবে
export default clientPromise;
