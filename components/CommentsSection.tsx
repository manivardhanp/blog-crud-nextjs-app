"use client";

import React, { useEffect, useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { createCommentAction, getCommentsForEntryAction } from "@/app/actions";

const CommentValidationSchema = Yup.object().shape({
  author: Yup.string().required("Identity alias required"),
  commenttext: Yup.string().required("Comment text buffer cannot be blank"),
});

interface CommentsSectionProps {
  blogId: number;
  entryId: number;
}

export default function CommentsSection({ blogId, entryId }: CommentsSectionProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadComments() {
    setLoading(true);
    const res = await getCommentsForEntryAction(entryId);
    if (res.success && res.data) {
      setComments(res.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadComments();
  }, [entryId]);

  return (
    <div className="mt-6 border-t pt-6 space-y-6">
      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider font-mono">Engagement Loop & Threads</h3>
      <Formik
        initialValues={{ author: "", commenttext: "" }}
        validationSchema={CommentValidationSchema}
        onSubmit={async (values, { resetForm, setSubmitting }) => {
          const res = await createCommentAction({
            blogid: blogId,
            entryid: entryId,
            author: values.author,
            commenttext: values.commenttext,
          });

          if (res.success) {
            resetForm();
            await loadComments();
          } else {
            alert(`Comment transaction rejected: ${res.error}`);
          }
          setSubmitting(false);
        }}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-3 bg-gray-50 p-4 rounded-xl border">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-1">
                <Field 
                  type="text" 
                  name="author" 
                  placeholder="Your Name / Handle" 
                  className="w-full text-xs border p-2 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <ErrorMessage name="author" component="div" className="text-red-500 text-[10px] mt-1" />
              </div>
              <div className="sm:col-span-2">
                <Field 
                  type="text" 
                  name="commenttext" 
                  placeholder="Share your technical analysis feedback context..." 
                  className="w-full text-xs border p-2 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <ErrorMessage name="commenttext" component="div" className="text-red-500 text-[10px] mt-1" />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-gray-900 hover:bg-gray-800 text-white text-[11px] font-bold py-1.5 px-4 rounded-md transition disabled:opacity-40 shadow-sm"
              >
                {isSubmitting ? "Caching Token..." : "Post Comment"}
              </button>
            </div>
          </Form>
        )}
      </Formik>

      {/* Render Comment Log Feed */}
      <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
        {loading ? (
          <p className="text-[11px] text-gray-400 italic animate-pulse">Polling thread updates...</p>
        ) : comments.length === 0 ? (
          <p className="text-[11px] text-gray-400 italic">No interaction threads generated on this node entry yet.</p>
        ) : (
          comments.map((c) => (
            <div key={c.commentid} className="p-3 bg-white border rounded-lg shadow-sm text-xs">
              <div className="flex justify-between items-center text-gray-400 font-mono text-[10px] mb-1">
                <span className="font-bold text-gray-700">👤 {c.authorname}</span>
                <span>{c.commentdatetime ? new Date(c.commentdatetime).toLocaleString() : ""}</span>
              </div>
              <p className="text-gray-600 leading-relaxed bg-gray-50/40 p-1.5 rounded font-mono text-[11px] whitespace-pre-wrap">{c.commenttext}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}