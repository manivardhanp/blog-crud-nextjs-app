"use client";

import React, { useEffect, useState } from "react";
import { getBlogsWithSubscriberCountAction } from "@/app/actions";

interface BlogContainer {
  blogid: number;
  blogtitle: string;
  publicid: string;
  status: string;
  subscribercount: number;
}

export default function BlogContainersList() {
  const [blogs, setBlogs] = useState<BlogContainer[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchContainers() {
    setLoading(true);
    const res = await getBlogsWithSubscriberCountAction();
    if (res.success && res.data) {
      setBlogs(res.data as BlogContainer[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchContainers();
  }, []);

  if (loading) return <p className="text-center text-xs text-gray-400 my-6">Compiling channel subscriber counts...</p>;
  if (blogs.length === 0) return null;

  return (
    <div className="mt-12 space-y-4">
      <div className="flex justify-between items-center border-b pb-2">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Active Channel Registries</h3>
        <button 
          onClick={fetchContainers} 
          className="text-[11px] bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-600 transition"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {blogs.map((blog) => (        
          <div key={blog.blogid} className="p-5 border rounded-xl bg-white shadow-sm flex flex-col justify-between hover:border-gray-300 transition">
            <div>
              <h3 className="text-md font-bold text-gray-900">{blog.blogtitle}</h3>
              <p className="text-xs text-gray-400 font-mono mt-1">Owner: #{blog.publicid}</p>
            </div>

            <div className="mt-4 pt-3 border-t flex justify-between items-center text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                👥 <strong className="font-bold">{blog.subscribercount}</strong> Subscribers
              </span>
              
              <span className={`text-[10px] uppercase font-mono tracking-wider font-black ${blog.status === 'A' ? 'text-emerald-500' : 'text-amber-500'}`}>
                {blog.status === 'A' ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}