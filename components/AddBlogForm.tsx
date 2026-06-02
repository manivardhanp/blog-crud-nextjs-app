"use client";

import React, { useState, useEffect } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { 
  createBlogAction, 
  syncBlogAgentsAction, 
  getCategoryTypesAction, 
  createCategoryTypeAction, 
  syncBlogCategoriesAction,
  getBlogsWithSubscriberCountAction,
  syncBlogMergeAction
} from "@/app/actions";

const BlogValidationSchema = Yup.object().shape({
  blogtitle: Yup.string().required("Blog title is required by the system interface"), 
  publicid: Yup.string().required("Owner public ID or 'global' identifier is required"), 
});

interface SimpleBlogNode {
  blogid: number;
  blogtitle: string;
}

export default function AddBlogForm() {
  const [loading, setLoading] = useState(false);
  const [coAuthorsInput, setCoAuthorsInput] = useState("");
  
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  
  const [availableBlogs, setAvailableBlogs] = useState<SimpleBlogNode[]>([]);
  const [selectedMergeBlogs, setSelectedMergeBlogs] = useState<number[]>([]);

  async function loadFormContextData() {
    const catRes = await getCategoryTypesAction();
    if (catRes.success && catRes.data) setCategoriesList(catRes.data);
    
    const blogRes = await getBlogsWithSubscriberCountAction();
    if (blogRes.success && blogRes.data) setAvailableBlogs(blogRes.data as SimpleBlogNode[]);
  }

  useEffect(() => {
    loadFormContextData();
  }, []);

  const handleQuickAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const res = await createCategoryTypeAction(newCategoryName, "global");
    if (res.success) {
      setNewCategoryName("");
      const catRes = await getCategoryTypesAction();
      if (catRes.success && catRes.data) setCategoriesList(catRes.data);
    }
  };

  const handleCategoryCheckboxChange = (categoryName: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories(prev => [...prev, categoryName]);
    } else {
      setSelectedCategories(prev => prev.filter(name => name !== categoryName));
    }
  };

  const handleMergeCheckboxChange = (targetBlogId: number, checked: boolean) => {
    if (checked) {
      setSelectedMergeBlogs(prev => [...prev, targetBlogId]);
    } else {
      setSelectedMergeBlogs(prev => prev.filter(id => id !== targetBlogId));
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg border border-gray-200">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Create Blog Channel Container</h2>
      
      <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Create New Global Category Tag</label>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="e.g., .NET Architecture" 
            className="flex-1 text-sm border p-2 rounded-lg bg-white focus:outline-none"
          />
          <button type="button" onClick={handleQuickAddCategory} className="bg-gray-800 hover:bg-gray-950 text-white text-xs font-bold px-4 rounded-lg transition">➕ Add Tag</button>
        </div>
      </div>

      <Formik
        initialValues={{
          blogtitle: "", 
          publicid: "", 
          status: "A", 
          entrynotification: "F", 
          commentnotification: "F", 
          requirelogin: "F", 
          allowcomments: "F", 
          commentdisabledays: 0, 
        }}
        validationSchema={BlogValidationSchema}
        onSubmit={async (values, { setSubmitting, resetForm }) => {
          setLoading(true);
          const response = await createBlogAction(values);
          
          if (response.success && response.blogid) {
            const newBlogId = response.blogid;

            // 1. Process Co-authors (blogs_agents)
            const agentIdsArray = coAuthorsInput.split(",").map(id => id.trim()).filter(id => id !== "");
            if (agentIdsArray.length > 0) {
              await syncBlogAgentsAction(newBlogId, agentIdsArray);
            }

            // 2. Process Taxonomy Category Links (blogs_categories)
            if (selectedCategories.length > 0) {
              await syncBlogCategoriesAction(newBlogId, 0, selectedCategories);
            }

            // 3. Process Feed Merging Rules (blogs_merge)
            if (selectedMergeBlogs.length > 0) {
              await syncBlogMergeAction(newBlogId, selectedMergeBlogs);
            }

            alert(`Success! Created Blog Channel Container ID: ${newBlogId}`);
            setCoAuthorsInput("");
            setSelectedCategories([]);
            setSelectedMergeBlogs([]);
            resetForm();
            loadFormContextData(); // Reload mapping dropdown arrays
          } else {
            alert(`Database Error: ${response.error}`);
          }
          setLoading(false);
          setSubmitting(false);
        }}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-4 text-gray-700">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-600">Blog Title *</label>
              <Field type="text" name="blogtitle" className="w-full p-2 border rounded border-gray-300 focus:outline-none" />
              <ErrorMessage name="blogtitle" component="div" className="text-red-500 text-xs mt-1" />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-600">Owner Public ID *</label>
              <Field type="text" name="publicid" className="w-full p-2 border rounded border-gray-300 focus:outline-none" />
              <ErrorMessage name="publicid" component="div" className="text-red-500 text-xs mt-1" />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-600">Select Channel Classifications</label>
              <div className="grid grid-cols-2 gap-2 bg-gray-50/50 p-3 rounded-lg border">
                {categoriesList.map((cat) => (
                  <label key={cat.category} className="flex items-center space-x-2 text-xs text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={selectedCategories.includes(cat.category)} onChange={(e) => handleCategoryCheckboxChange(cat.category, e.target.checked)} className="rounded text-blue-600" />
                    <span>🏷️ {cat.category}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-600">Merge Feed Into Corporate Channels</label>
              <p className="text-gray-400 text-[11px] mb-2">Select which company-wide destination nodes should automatically mirror entries published here.</p>
              {availableBlogs.length === 0 ? (
                <p className="text-xs text-gray-400 italic bg-gray-50 p-2 rounded border">No other channels found to merge targets into.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-blue-50/20 p-3 rounded-lg border border-blue-100">
                  {availableBlogs.map((b) => (
                    <label key={b.blogid} className="flex items-center space-x-2 text-xs text-gray-700 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={selectedMergeBlogs.includes(b.blogid)} 
                        onChange={(e) => handleMergeCheckboxChange(b.blogid, e.target.checked)} 
                        className="rounded text-blue-600 focus:ring-0" 
                      />
                      <span>🏢 {b.blogtitle} <span className="text-gray-400 font-mono">(ID: #{b.blogid})</span></span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded border border-gray-100 space-y-3">
              <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Feature Flags Configuration</h3>
              <label className="flex items-center space-x-2 cursor-pointer">
                <Field type="checkbox" name="entrynotification" value="T" className="rounded text-blue-600" />
                <span className="text-sm">Email alert on new entry notifications</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <Field type="checkbox" name="commentnotification" value="T" className="rounded text-blue-600" />
                <span className="text-sm">Email alert on reader comments</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <Field type="checkbox" name="requirelogin" value="T" className="rounded text-blue-600" />
                <span className="text-sm">Gate viewing access behind authorized login window</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <Field type="checkbox" name="allowcomments" value="T" className="rounded text-blue-600" />
                <span className="text-sm">Allow reader comment threads</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-600">Initial Status</label>
                <Field as="select" name="status" className="w-full p-2 border rounded border-gray-300 bg-white">
                  <option value="A">Active</option>
                  <option value="I">Inactive</option>
                </Field>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-600">Disable Comments After (Days)</label>
                <Field type="number" name="commentdisabledays" className="w-full p-2 border rounded border-gray-300" min="0" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-600">Assign Co-Authors (Public IDs)</label>
              <input type="text" value={coAuthorsInput} onChange={(e) => setCoAuthorsInput(e.target.value)} className="w-full p-2 border rounded border-gray-300 bg-white" placeholder="e.g., agent_001, agent_044" />
            </div>

            <button type="submit" disabled={isSubmitting || loading} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl transition disabled:opacity-50 shadow-sm">
              {isSubmitting || loading ? "Processing Flow..." : "Initialize New Blog"}
            </button>
          </Form>
        )}
      </Formik>
    </div>
  );
}