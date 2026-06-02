"use client";

import React, { useRef, useEffect, useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { 
  getBlogsWithSubscriberCountAction, 
  createEntryAction, 
  syncBlogCategoriesAction 
} from "@/app/actions";

// Validation Schema based exactly on database constraints
const EntryValidationSchema = Yup.object().shape({
  blogid: Yup.number().required("You must associate this entry with a parent Blog ID"), 
  entrytitle: Yup.string().required("Post title is mandatory"), 
  entrytext: Yup.string().required("The HTML body content cannot be empty"), 
  status: Yup.string().oneOf(["A", "I", "D"], "Invalid status conversion").required("Required"), 
});

interface BlogChannel {
  blogid: number;
  blogtitle: string;
}

export default function AddBlogEntryForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Dynamic Channels Staging States
  const [channels, setChannels] = useState<BlogChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);

  // Load available parent blog channels live from PostgreSQL on mount
  useEffect(() => {
    async function loadChannels() {
      const res = await getBlogsWithSubscriberCountAction();
      if (res.success && res.data) {
        setChannels(res.data as BlogChannel[]);
      }
      setLoadingChannels(false);
    }
    loadChannels();
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow-md rounded-lg border border-gray-200 mt-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Compose New Blog Entry</h2>

      <Formik
        initialValues={{
          blogid: "", 
          entrytitle: "", 
          entrysubtitle: "", 
          entrytext: "", 
          status: "D", 
          entryallowcomments: "F", 
          entrycommentdisabledays: 0, 
          featuredimage: null as File | null, 
          rawTags: "", // 🌟 ADDED TAXONOMY LAYER: String context cache parameter
        }}
        validationSchema={EntryValidationSchema}
        onSubmit={async (values, { setSubmitting, resetForm }) => {
          const targetedBlogId = Number(values.blogid);

          // 1. Submit Core Content payload to PostgreSQL (Preserves Image & Overrides)
          const response = await createEntryAction({
            ...values,
            blogid: targetedBlogId,
          }); 

          if (response.success && response.entryid) {
            const generatedEntryId = response.entryid;

            // 🚀 2. TAXONOMY PARSING: Split the raw tags by commas and scrub spacing strings clean
            const parsedTagsArray = values.rawTags
              .split(",")
              .map((tag) => tag.trim())
              .filter((tag) => tag.length > 0);

            // 🔄 3. DESTRUCTIVE OVERWRITE ENFORCEMENT: Execute the transaction sync block
            if (parsedTagsArray.length > 0) {
              await syncBlogCategoriesAction(targetedBlogId, generatedEntryId, parsedTagsArray);
            }

            alert(`Success! Live Post Entry Staged with ID: ${generatedEntryId}`);
            
            // Explicitly clear native file input element DOM node tracking paths
            if (fileInputRef.current) fileInputRef.current.value = "";
            
            resetForm();
          } else {
            alert(`Database Error: ${response.error}`);
          }
          setSubmitting(false);
        }}
      >
        {({ setFieldValue, isSubmitting, values }) => (
          <Form className="space-y-5 text-gray-700">
            
            {/* Grid Layout for Meta Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* 🌟 UPGRADED: Swapped static number input for an automated fetched channel selector */}
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-600">Target Blog Container *</label>
                <Field as="select" name="blogid" className="w-full p-2 border rounded border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="">-- Choose Target Channel Destination --</option>
                  {channels.map((channel) => (
                    <option key={channel.blogid} value={channel.blogid}>
                      📁 {channel.blogtitle} (ID: #{channel.blogid})
                    </option>
                  ))}
                </Field>
                <ErrorMessage name="blogid" component="div" className="text-red-500 text-xs mt-1" />
                {loadingChannels && <p className="text-[10px] text-gray-400 mt-1 italic animate-pulse">Scanning container pipelines...</p>}
              </div>

              {/* Publication Status Dropdown */}
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-600">Publication Status *</label>
                <Field as="select" name="status" className="w-full p-2 border rounded border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="D">Draft ("D")</option>
                  <option value="A">Active/Publish Immediately ("A")</option>
                  <option value="I">Inactive ("I")</option>
                </Field>
                <ErrorMessage name="status" component="div" className="text-red-500 text-xs mt-1" />
              </div>
            </div>

            {/* Title Field */}
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-600">Entry Title *</label>
              <Field
                type="text"
                name="entrytitle"
                placeholder="Forward slashes (/) will automatically convert to hyphens (-)"
                className="w-full p-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <ErrorMessage name="entrytitle" component="div" className="text-red-500 text-xs mt-1" />
            </div>

            {/* Optional Subtitle Field */}
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-600">Teaser / Subtitle (Optional)</label>
              <Field
                type="text"
                name="entrysubtitle"
                placeholder="Catchy tagline or post description summary"
                className="w-full p-2 border rounded border-gray-300 text-sm"
              />
            </div>

            {/* 🌟 ADDED: Classification Tags Input Workspace */}
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-600">Classification Tags (Comma Separated)</label>
              <Field 
                type="text" 
                name="rawTags" 
                className="w-full p-2 border rounded border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" 
                placeholder="Devops, Next js, C#, Database" 
              />
              <p className="text-gray-400 text-[11px] mt-1">
                Values split seamlessly by commas, drop whitespace elements, and map into the blogs_categories table.
              </p>
              
              {/* Optional Visual Token Feedback Engine */}
              {values.rawTags.trim().length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 p-2 bg-gray-50 rounded-xl border border-dashed">
                  {values.rawTags.split(",").map((t, idx) => t.trim() ? (
                    <span key={idx} className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-100">
                      🏷️ {t.trim()}
                    </span>
                  ) : null)}
                </div>
              )}
            </div>

            {/* HTML Body Area */}
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-600">Body Content (HTML Layout Format) *</label>
              <Field
                as="textarea"
                name="entrytext"
                rows={8}
                placeholder="<p>Write your standard HTML block syntax tags directly here...</p>"
                className="w-full p-2 border rounded border-gray-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <ErrorMessage name="entrytext" component="div" className="text-red-500 text-xs mt-1" />
            </div>

            {/* Featured Image Selector File Handler */}
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-600">Featured Post Image (AWS S3 Upload Context)</label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0] || null;
                  setFieldValue("featuredimage", file);
                }}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {values.featuredimage && (
                <p className="text-xs text-green-600 mt-1">
                  Selected target file: {(values.featuredimage as File).name}
                </p>
              )}
            </div>

            {/* Per-Entry Overrides Block Configuration */}
            <div className="bg-orange-50/50 p-4 rounded border border-orange-100 space-y-3">
              <h3 className="text-sm font-bold text-orange-800 uppercase tracking-wider">Per-Entry Configuration Overrides</h3>
              
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <Field type="checkbox" name="entryallowcomments" value="T" className="rounded text-blue-600 focus:ring-0" />
                <span className="text-sm text-gray-700">Override system defaults: Allow comment threads on this post</span>
              </label>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Custom Entry Expiration Window for Comments (Days)</label>
                <Field
                  type="number"
                  name="entrycommentdisabledays"
                  className="w-32 p-1 border rounded border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                  min="0"
                />
              </div>
            </div>

            {/* Form Actions */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl transition duration-200 disabled:opacity-50 shadow-sm"
            >
              {isSubmitting ? "Uploading Node Payload..." : "Stage and Save Entry"}
            </button>
          </Form>
        )}
      </Formik>
    </div>
  );
}