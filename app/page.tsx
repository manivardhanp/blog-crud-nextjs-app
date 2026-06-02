"use client";

import React, { useState } from "react";
import AddBlogForm from "@/components/AddBlogForm";
import BlogContainersList from "@/components/BlogContainersList";
import AddBlogEntryForm from "@/components/AddBlogEntryForm";
import BlogEntriesFeed from "@/components/BlogEntriesFeed";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"blogs" | "entries">("blogs");

  return (
    <main className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      {/* Header Panel */}
      <div className="max-w-4xl mx-auto text-center mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
          Enterprise Blog Engine Console
        </h1>
        <p className="mt-3 max-w-2xl mx-auto text-base text-gray-500">
          Seamlessly navigate system structures, co-author channels, and publication data pipelines.
        </p>
      </div>

      <div className="max-w-md mx-auto flex bg-white p-1.5 rounded-xl shadow-sm border border-gray-200 mb-10">
        <button
          onClick={() => setActiveTab("blogs")}
          className={`flex-1 text-center py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
            activeTab === "blogs"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          Manage Blog Containers
        </button>
        <button
          onClick={() => setActiveTab("entries")}
          className={`flex-1 text-center py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
            activeTab === "entries"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          Compose Entry Post
        </button>
      </div>

      <div className="max-w-4xl mx-auto transition-all duration-300">
        {activeTab === "blogs" ? (
          <div className="animate-fadeIn space-y-8">
            <AddBlogForm />
            <BlogContainersList />
          </div>
        ) : (
          <div className="animate-fadeIn">
            <AddBlogEntryForm />
          </div>
        )}
      </div>

      {/* APPEND THE COMPONENT RIGHT HERE TO CAPTURE LIVE UPDATES */}
      <hr className="my-16 max-w-6xl mx-auto border-gray-200" />
      <BlogEntriesFeed />
    </main>
  );
}