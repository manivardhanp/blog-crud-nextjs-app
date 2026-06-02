"use client";

import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import DOMPurify from "isomorphic-dompurify";
import CommentsSection from "@/components/CommentsSection";
import { 
  getBlogEntriesAction, 
  deleteBlogEntryAction, 
  updateBlogEntryAction, 
  subscribeToBlogAction,
  getEntryCategoriesAction, // 🚀 Added to fetch active entry tags
  syncBlogCategoriesAction  // 🚀 Added to run destructive taxonomy overwrite updates
} from "@/app/actions";

interface JoinedEntry {
  entryid: number;
  blogid: number;
  entrytitle: string;
  entrysubtitle: string | null;
  entrytext: string;
  status: string;
  blogtitle: string;
}

export default function BlogEntriesFeed() {
  const [entries, setEntries] = useState<JoinedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Interaction States
  const [viewingPost, setViewingPost] = useState<JoinedEntry | null>(null);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  
  // Inline Form States for Updating
  const [editTitle, setEditTitle] = useState("");
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editContext, setEditContext] = useState("");
  const [editStatus, setEditStatus] = useState("D");
  
  // 🚀 TAXONOMY EDIT LAYER: Track string text block tags inside the inline edit card frame
  const [editingTags, setEditingTags] = useState("");

  // State Dictionary tracking unique email string values per card entry ID
  const [subscriptionEmails, setSubscriptionEmails] = useState<Record<number, string>>({});

  async function fetchFeed() {
    setLoading(true);
    const response = await getBlogEntriesAction();
    if (response.success && response.data) {
      setEntries(response.data as JoinedEntry[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchFeed();
  }, []);

  // 1. DELETE ACTION HANDLER
  const handleDelete = async (entryId: number) => {
    if (!confirm("Are you sure you want to permanently purge this entry from PostgreSQL?")) return;
    const res = await deleteBlogEntryAction(entryId);
    if (res.success) {
      setEntries(entries.filter(item => item.entryid !== entryId));
    } else {
      alert(`Deletion aborted: ${res.error}`);
    }
  };

  // 2. TRIGGER UPDATE EDIT MODE (Upgraded to async to await pre-existing DB rows)
  const startEditing = async (post: JoinedEntry) => {
    setEditingPostId(post.entryid);
    setEditTitle(post.entrytitle);
    setEditSubtitle(post.entrysubtitle || "");
    setEditContext(post.entrytext);
    setEditStatus(post.status);

    // 🚀 Load the tags bound to this entry ID and convert array into a flat string
    const res = await getEntryCategoriesAction(post.entryid);
    if (res.success && res.data) {
      setEditingTags(res.data.join(", "));
    } else {
      setEditingTags("");
    }
  };

  // 3. SUBMIT UPDATE RUNTIME (Upgraded to handle the transactional taxonomy sync)
  const handleUpdateSave = async (entryId: number, blogId: number) => {
    const res = await updateBlogEntryAction(entryId, {
      entrytitle: editTitle,
      entrysubtitle: editSubtitle || null,
      entrytext: editContext,
      status: editStatus
    });

    if (res.success) {
      // 🚀 PROCESS THE COMMA-DELIMITED STRING ARRAY TO PIPELINE BULK TRANSACTIONS
      const parsedTagsArray = editingTags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      // Runs the exact Delete + Re-insert transactional overwrite pattern block
      await syncBlogCategoriesAction(blogId, entryId, parsedTagsArray);

      setEditingPostId(null);
      setEditingTags("");
      fetchFeed(); 
    } else {
      alert(`Update failed: ${res.error}`);
    }
  };

  // 4. AUDIENCE SUBSCRIPTION HANDLER
  const handleSubscribeSubmit = async (entryId: number, blogId: number) => {
    const targetEmail = subscriptionEmails[entryId] || "";
    
    if (!targetEmail.includes("@") || targetEmail.trim().length < 5) {
      alert("Please enter a valid structure email address.");
      return;
    }

    const res = await subscribeToBlogAction(blogId, targetEmail);
    if (res.success) {
      alert("Success! Added email to notification distribution pipelines.");
      setSubscriptionEmails(prev => ({ ...prev, [entryId]: "" }));
    } else {
      alert(`Subscription rejected: ${res.error}`);
    }
  };

  if (loading) return <p className="text-center text-sm text-gray-400 my-12">Parsing system feed streams...</p>;
  if (entries.length === 0) return <p className="text-center text-sm text-gray-500 my-12 bg-gray-50 p-6 rounded border border-dashed">No post entries found inside PostgreSQL database container pipelines.</p>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6 border-b pb-2">
        <h3 className="text-xl font-bold text-gray-800 tracking-tight">Live Publishing Feed Pipeline</h3>
        <button onClick={fetchFeed} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded font-bold text-gray-600 transition">🔄 Sync Container Node</button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {entries.map((post) => {
          const isEditing = editingPostId === post.entryid;
          const currentEmailValue = subscriptionEmails[post.entryid] || "";

          return (
            <div key={post.entryid} className="flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden min-h-[450px]">
              {/* Header Meta Block */}
              <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-1 rounded">📁 {post.blogtitle}</span>
                {isEditing ? (
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="text-xs border rounded p-1 font-bold">
                    <option value="D">Draft</option>
                    <option value="A">Live</option>
                    <option value="I">Inactive</option>
                  </select>
                ) : (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${post.status === 'D' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                    {post.status === 'D' ? 'Draft' : 'Live'}
                  </span>
                )}
              </div>

              {/* Core Body Section */}
              <div className="p-5 flex-1 flex flex-col">
                {isEditing ? (
                  /* --- INLINE EDIT MODE VIEW --- */
                  <div className="space-y-3 p-1 flex-1 flex flex-col">
                    <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full text-sm border p-2 rounded font-bold" placeholder="Entry Title" />
                    <input type="text" value={editSubtitle} onChange={(e) => setEditSubtitle(e.target.value)} className="w-full text-xs border p-2 rounded italic text-gray-500" placeholder="Subtitle (Optional)" />
                    
                    {/* 🚀 INJECTED MODULAR TAG FIELDS EDIT BLOCK */}
                    <div className="flex flex-col space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">Modify Classification Tags</label>
                      <input 
                        type="text" 
                        value={editingTags} 
                        onChange={(e) => setEditingTags(e.target.value)} 
                        className="w-full text-xs border p-2 rounded font-mono text-blue-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" 
                        placeholder="e.g., Devops, Next js, C#" 
                      />
                    </div>

                    <textarea value={editContext} onChange={(e) => setEditContext(e.target.value)} className="w-full flex-1 min-h-[150px] text-xs font-mono border p-2 rounded bg-gray-50 text-gray-800 shadow-inner" placeholder="Markdown / HTML Content" />
                  </div>
                ) : (
                  /* --- STANDARD RICH TEXT DISPLAY CANVAS --- */
                  <div className="flex-1 flex flex-col">
                    <h4 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2">{post.entrytitle}</h4>
                    {post.entrysubtitle && <p className="text-sm text-gray-500 italic mb-3 line-clamp-1">{post.entrysubtitle}</p>}
                    
                    {/* Render Canvas Pipeline */}
                    <div className="mt-2 border-t pt-3 flex-1">
                      <article className="prose prose-sm prose-blue max-w-none text-gray-700 h-32 overflow-y-auto overflow-x-hidden leading-relaxed">
                        <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                          {DOMPurify.sanitize(post.entrytext)}
                        </ReactMarkdown>
                      </article>
                    </div>

                    {/* Dynamic Audience Subscriber Input Widget */}
                    <div className="mt-4 bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Get Entry Notifications</label>
                      <div className="flex gap-2">
                        <input 
                          type="email" 
                          value={currentEmailValue}
                          onChange={(e) => setSubscriptionEmails(prev => ({ ...prev, [post.entryid]: e.target.value }))}
                          placeholder="name@domain.com" 
                          className="flex-1 text-xs border border-gray-200 rounded-lg p-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button 
                          onClick={() => handleSubscribeSubmit(post.entryid, post.blogid)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 rounded-lg transition"
                        >
                          Join
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Control Panel Footer */}
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center text-xs">
                {isEditing ? (
                  <div className="w-full flex gap-2">
                    {/* 🚀 UPGRADED: Now passes both entryid and the parent blogid to ensure flawless sync operations */}
                    <button onClick={() => handleUpdateSave(post.entryid, post.blogid)} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold p-2 rounded transition shadow-sm">Save</button>
                    <button onClick={() => setEditingPostId(null)} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold p-2 rounded transition">Cancel</button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => handleDelete(post.entryid)} className="text-red-500 hover:text-red-700 font-bold tracking-tight transition">🗑️ Delete</button>
                    <div className="flex gap-3">
                      <button onClick={() => startEditing(post)} className="text-gray-600 hover:text-gray-900 font-bold transition">✏️ Edit</button>
                      <button onClick={() => setViewingPost(post)} className="text-blue-600 hover:text-blue-700 font-bold transition">Analyze Node →</button>
                    </div>
                  </>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* --- MODAL OVERLAY: FULL CONTEXT RENDERING ENGINE --- */}
      {viewingPost && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border">
            {/* Modal Header */}
            <div className="p-5 bg-gray-900 text-white flex justify-between items-center">
              <div>
                <span className="text-xs uppercase font-mono bg-blue-600 px-2 py-0.5 rounded mr-2 tracking-widest font-bold">Node Reader</span>
                <span className="text-xs text-gray-400">Context Key: #{viewingPost.entryid}</span>
              </div>
              <button onClick={() => setViewingPost(null)} className="text-gray-400 hover:text-white text-xl font-bold transition">&times;</button>
            </div>
            
            {/* Modal Body Scrolling Content */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="border-b pb-3">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">Channel: {viewingPost.blogtitle}</p>
                <h2 className="text-2xl font-black text-gray-900 mt-1">{viewingPost.entrytitle}</h2>
                {viewingPost.entrysubtitle && <p className="text-md text-gray-500 italic mt-1">{viewingPost.entrysubtitle}</p>}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 block mb-3 uppercase tracking-wider font-mono">Payload Manifest (Rendered output)</label>
                
                {/* Full-Scale Rendered Content Block */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <article className="prose prose-blue max-w-none text-gray-800 leading-relaxed overflow-x-hidden">
                    <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                      {DOMPurify.sanitize(viewingPost.entrytext)}
                    </ReactMarkdown>
                  </article>
                </div>
              </div>
                { /* 🚀 MOUNT THE COMMENTS LOOP CONTAINER RIGHT HERE */}
                <CommentsSection 
                blogId={viewingPost.blogid} 
                entryId={viewingPost.entryid} 
                />
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t flex justify-end">
              <button onClick={() => setViewingPost(null)} className="bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold px-5 py-2.5 rounded-lg transition shadow-sm">
                Close Inspector Frame
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}