"use server";

import {db} from "../db/index";
import { blogs, blogsEntries, blogsMerge } from "../db/schema";
import { and, or, eq, sql, desc } from "drizzle-orm";
import { blogCategoriesTypes, blogsCategories, blogsComments, blogsUsers, blogsAgents  } from "@/db/schema";

/**
 * ACTION 1: Creates a new main Blog Container channel
 * Maps to Step 1 of the technical reference blueprint[cite: 104, 105].
 */
export async function createBlogAction(values: {
  blogtitle: string;
  publicid: string;
  status: string;
  entrynotification: string;
  commentnotification: string;
  requirelogin: string;
  allowcomments: string;
  commentdisabledays: number;
}) {
  try {
    // Inserts values precisely into PostgreSQL using Drizzle [cite: 27-30]
    const result = await db.insert(blogs).values({
      blogtitle: values.blogtitle,
      publicid: values.publicid,
      status: values.status,
      entrynotification: values.entrynotification === "T" ? "T" : "F",
      commentnotification: values.commentnotification === "T" ? "T" : "F",
      requirelogin: values.requirelogin === "T" ? "T" : "F",
      allowcomments: values.allowcomments === "T" ? "T" : "F",
      commentdisabledays: Number(values.commentdisabledays),
    }).returning({ insertedId: blogs.blogid });

    return { success: true, blogid: result[0].insertedId };
  } catch (error: any) {
    console.error("Database insert failure:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ACTION 2: Publishes an individual blog entry post inside a channel
 * Maps to Step 2 of the technical reference blueprint[cite: 118].
 */
export async function createEntryAction(values: {
  blogid: number;
  entrytitle: string;
  entrysubtitle?: string;
  entrytext: string;
  status: string;
  entryallowcomments: string;
  entrycommentdisabledays: number;
}) {
  try {
    // Platform specification: forward slashes must be replaced with hyphens before insertion [cite: 38]
    const sanitizedTitle = values.entrytitle.replace(/\//g, "-");

    const result = await db.insert(blogsEntries).values({
      blogid: Number(values.blogid),
      entrytitle: sanitizedTitle,
      entrysubtitle: values.entrysubtitle || "",
      entrytext: values.entrytext, // Raw HTML body text [cite: 39]
      status: values.status, // "A" = Active, "I" = Inactive, "D" = Draft [cite: 40]
      entrypostedbypublicid: "session_agent_user", // Fallback session marker placeholder [cite: 41, 42]
      entryallowcomments: values.entryallowcomments === "T" ? "T" : "F",
      entrycommentdisabledays: Number(values.entrycommentdisabledays),
    }).returning({ insertedId: blogsEntries.entryid });

    return { success: true, entryid: result[0].insertedId };
  } catch (error: any) {
    console.error("Database entry insert failure:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ACTION 3: Fetches all post entries combined with their parent blog metadata
 */
export async function getBlogEntriesAction(selectedBlogId?: number) {
  try {
   if (selectedBlogId) {
    const data = await db
    .select({
      entryid: blogsEntries.entryid,
      blogid: blogsEntries.blogid,
      entrytitle: blogsEntries.entrytitle,
      entrysubtitle: blogsEntries.entrysubtitle,
      entrytext: blogsEntries.entrytext,
      status: blogsEntries.status,
      blogtitle: blogs.blogtitle,
    })
    .from(blogsEntries)
    .innerJoin(blogs, eq(blogsEntries.blogid, blogs.blogid))
    .leftJoin(blogsMerge, eq(blogsEntries.blogid, blogsMerge.blogid))
    .where(
      or(
        eq(blogsEntries.blogid, selectedBlogId),          // Own channel posts
        eq(blogsMerge.mergewithblogid, selectedBlogId)    // Merged agent posts
      )
    );

  return { success: true, data };
  }

  const data = await db
  .select({
    entryid: blogsEntries.entryid,
    blogid: blogsEntries.blogid,
    entrytitle: blogsEntries.entrytitle,
    entrysubtitle: blogsEntries.entrysubtitle,
    entrytext: blogsEntries.entrytext,
    status: blogsEntries.status,
    blogtitle: blogs.blogtitle,
  })
  .from(blogsEntries)
  .innerJoin(blogs, eq(blogsEntries.blogid, blogs.blogid));

return { success: true, data };
  } catch (error: any) {
    console.error("Failed to parse publishing feeds:", error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * ACTION 4: Destroys a specific blog entry record by ID
 */
export async function deleteBlogEntryAction(entryId: number) {
  try {
    await db.delete(blogsEntries).where(eq(blogsEntries.entryid, entryId));
    return { success: true };
  } catch (error: any) {
    console.error("Database deletion failure:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ACTION 5: Updates an existing blog entry's dataset inside PostgreSQL
 */
export async function updateBlogEntryAction(
  entryId: number, 
  values: { entrytitle: string; entrysubtitle: string | null; entrytext: string; status: string }
) {
  try {
    await db
      .update(blogsEntries)
      .set({
        entrytitle: values.entrytitle,
        entrysubtitle: values.entrysubtitle,
        entrytext: values.entrytext,
        status: values.status,
      })
      .where(eq(blogsEntries.entryid, entryId));
      
    return { success: true };
  } catch (error: any) {
    console.error("Database update failure:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ACTION 6: Adds a reader's email to a blog's notification distribution list
 */
export async function subscribeToBlogAction(blogId: number, email: string) {
  try {
    await db.insert(blogsUsers).values({
      blogid: blogId,
      email: email.trim().toLowerCase(),
    });
    return { success: true };
  } catch (error: any) {
    console.error("Failed to register subscriber email:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ACTION 7: Synchronizes co-authors using the destructive overwrite pattern (Delete + Re-insert)
 */
export async function syncBlogAgentsAction(blogId: number, agentPublicIds: string[]) {
  try {
    await db.transaction(async (tx) => {
      // 1. Wipe out history: Clear all historical co-author bindings for this container
      await tx.delete(blogsAgents).where(eq(blogsAgents.blogid, blogId));

      // 2. Re-insert fresh: Bulk map new tokens if arrays contain parameters
      if (agentPublicIds.length > 0) {
        const joinRows = agentPublicIds.map((pubId) => ({
          blogid: blogId,
          publicid: pubId.trim(), // Maps exactly to your agents table public identifier column
        }));
        await tx.insert(blogsAgents).values(joinRows);
      }
    });
    return { success: true };
  } catch (error: any) {
    console.error("Shared access co-author synchronization aborted:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ACTION 8: Syncs company blog feed merging destinations (Delete + Re-insert transaction loop)
 * Mandated: Directs source agent posts to replicate into company channel feeds.
 */
export async function syncBlogMergeAction(blogId: number, mergeWithBlogIds: number[]) {
  try {
    await db.transaction(async (tx) => {
      // 1. Wipe out history: Purge previous target configurations for this source blog
      await tx.delete(blogsMerge).where(eq(blogsMerge.blogid, blogId));

      // 2. Re-insert fresh: Create new distribution lines to target company profiles
      if (mergeWithBlogIds.length > 0) {
        const joinRows = mergeWithBlogIds.map((targetId) => ({
          blogid: blogId,
          mergewithblogid: targetId, // Maps the target destination company blog container identifier
        }));
        await tx.insert(blogsMerge).values(joinRows);
      }
    });
    return { success: true };
  } catch (error: any) {
    console.error("Feed pipeline merging synchronization aborted:", error);
    return { success: false, error: error.message };
  }
}


/**
 * ACTION 9: Creates a new master category type label
 */
export async function createCategoryTypeAction(category: string, publicId: string = "global") {
  try {
    if (!category || !category.trim()) {
      return { success: false, error: "Category string cannot be empty" };
    }

    await db.insert(blogCategoriesTypes).values({
      category: category.trim(),
      publicid: (publicId || "global").trim(),  
    });
    
    return { success: true };
  } catch (error: any) {
    console.error("Failed to write category type:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ACTION 10: Fetches all available global category configurations
 */
export async function getCategoryTypesAction() {
  try {
    const list = await db.select().from(blogCategoriesTypes);
    return { success: true, data: list };
  } catch (error: any) {
    console.error("Failed to read category types:", error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * ACTION 11: Syncs a blog container to chosen categories (Delete + Re-insert transaction loop)
 */
export async function syncBlogCategoriesAction(blogId: number, entryId: number, categoryNames: string[]) {
  try {
    await db.transaction(async (tx) => {
      // 1. Wipe out the history: Clean slate for this entry ID
      await tx.delete(blogsCategories).where(eq(blogsCategories.entryid, entryId));

      // 2. Re-insert fresh: Loop over parsed string values and bulk write rows
      if (categoryNames.length > 0) {
        const joinRows = categoryNames.map((catName) => ({
          blogid: blogId,
          entryid: entryId,
          categoryname: catName.trim(), 
        }));
        
        await tx.insert(blogsCategories).values(joinRows);
      }
    });
    return { success: true };
  } catch (error: any) {
    console.error("Taxonomy synchronization failure:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteCategoryTypeAction(category: string, userPublicId: string) {
  try {
    await db
      .delete(blogCategoriesTypes)
      .where(
        and(
          eq(blogCategoriesTypes.category, category),
          // Enforce scoping: user must match the creator, or be a global admin
          or(
            eq(blogCategoriesTypes.publicid, userPublicId),
            eq(blogCategoriesTypes.publicid, "global")
          )
        )
      );
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete category type:", error);
    return { success: false, error: error.message };
  }
}

export async function getBlogsWithSubscriberCountAction() {
  try {
    const list = await db
      .select({
        blogid: blogs.blogid,
        blogtitle: blogs.blogtitle,
        publicid: blogs.publicid,
        status: blogs.status,
        
        subscribercount: sql<number>`count(${blogsUsers.subscriberid})::int`,
      })
      .from(blogs)
      // A Left Join ensures blogs with 0 subscribers are still returned in the feed array safely
      .leftJoin(blogsUsers, eq(blogs.blogid, blogsUsers.blogid))
      // Grouping by the primary identifier combines subscriber rows into a unified tally value
      .groupBy(blogs.blogid);

    return { success: true, data: list };
  } catch (error: any) {
    console.error("Failed to compile blog channel subscriber matrix:", error);
    return { success: false, error: error.message, data: [] };
  }
}

export async function getEntryCategoriesAction(entryId: number) {
  try {
    const rows = await db
      .select({ categoryname: blogsCategories.categoryname })
      .from(blogsCategories)
      .where(eq(blogsCategories.entryid, entryId));
      
    return { success: true, data: rows.map(r => r.categoryname) };
  } catch (error: any) {
    console.error("Failed to read entry tags:", error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * ACTION 15: Stages a brand-new reader comment string record to PostgreSQL
 */
export async function createCommentAction(payload: { blogid: number; entryid: number; author: string; commenttext: string }) {
  try {
    if (!payload.author.trim() || !payload.commenttext.trim()) {
      return { success: false, error: "Author name and text content cannot be blank." };
    }

    await db.insert(blogsComments).values({
      blogid: payload.blogid,
      entryid: payload.entryid,
      authorname: payload.author.trim(),
      commenttext: payload.commenttext.trim(),
    });

    return { success: true };
  } catch (error: any) {
    console.error("Failed to commit reader comment:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ACTION 16: Fetches comments for an entry, sorted chronologically (Newest First)
 */
export async function getCommentsForEntryAction(entryId: number) {
  try {
    const data = await db
      .select()
      .from(blogsComments)
      .where(eq(blogsComments.entryid, entryId))
      .orderBy(desc(blogsComments.commentdatetime)); // Newest comments first

    return { success: true, data };
  } catch (error: any) {
    console.error("Failed to pull comment entries tree:", error);
    return { success: false, error: error.message, data: [] };
  }
}