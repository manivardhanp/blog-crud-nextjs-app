import { pgTable, serial, varchar, text, integer, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// =========================================================================
// 1. BLOGS - Core Blog Container Channel
// =========================================================================
export const blogs = pgTable('blogs', {
  blogid: serial('blogid').primaryKey(), // Auto-generated Identity PK [cite: 14]
  blogtitle: varchar('blogtitle', { length: 255 }).notNull(), // Validated by UI [cite: 15]
  publicid: varchar('publicid', { length: 255 }).notNull(), // Owner agent public ID or 'global' [cite: 16-17]
  status: varchar('status', { length: 1 }).notNull().default('A'), // "A" = Active, "I" = Inactive [cite: 18-19]
  adminemail: varchar('adminemail', { length: 255 }).default(''), // Stored lowercase [cite: 20]
  entrynotification: varchar('entrynotification', { length: 1 }).notNull().default('F'), // "T"/"F" [cite: 21]
  commentnotification: varchar('commentnotification', { length: 1 }).notNull().default('F'), // "T"/"F" [cite: 22]
  requirelogin: varchar('requirelogin', { length: 1 }).notNull().default('F'), // "T"/"F" [cite: 23]
  allowcomments: varchar('allowcomments', { length: 1 }).notNull().default('F'), // "T"/"F" [cite: 24]
  commentdisabledays: integer('commentdisabledays').notNull().default(0), // 0 = never disabled [cite: 25-26]
});

// =========================================================================
// 2. BLOGS_ENTRIES - Individual Posts Within a Container
// =========================================================================
export const blogsEntries = pgTable('blogs_entries', {
  entryid: serial('entryid').primaryKey(), // Auto-generated Identity PK [cite: 36]
  blogid: integer('blogid')
    .notNull()
    .references(() => blogs.blogid, { onDelete: 'cascade' }), // FK to blogs.blogid with cascade delete [cite: 37, 133]
  entrytitle: varchar('entrytitle', { length: 255 }).notNull(), // Slashes sanitized on submission [cite: 38]
  entrytext: text('entrytext').notNull(), // Full HTML body content text [cite: 39]
  status: varchar('status', { length: 1 }).notNull(), // "A" = Active, "I" = Inactive, "D" = Draft [cite: 40]
  entrypostedbypublicid: varchar('entrypostedbypublicid', { length: 255 }).notNull(), // From user session [cite: 41-42]
  entrydatetime: timestamp('entrydatetime', { mode: 'string' }).notNull().defaultNow(), // Defaults to UTC now [cite: 43-44]
  entrysubtitle: varchar('entrysubtitle', { length: 255 }).default(''), // Optional subtitle [cite: 45]
  entryallowcomments: varchar('entryallowcomments', { length: 1 }), // "T"/"F" per-entry override flag [cite: 46-47]
  entrycommentdisabledays: integer('entrycommentdisabledays'), // Per-entry window override [cite: 48]
  featuredimage: varchar('featuredimage', { length: 500 }), // S3 storage bucket reference engine URL [cite: 49]
});

// =========================================================================
// 3. BLOGS_AGENTS - Shared Blog Co-Author Access
// =========================================================================
export const blogsAgents = pgTable('blogs_agents', {
  blogid: integer('blogid')
    .notNull()
    .references(() => blogs.blogid, { onDelete: 'cascade' }), // Fully replaced on edit [cite: 63, 65, 133]
  publicid: varchar('publicid', { length: 255 }).notNull(), // FK to system agents catalog [cite: 64]
}, (table) => ({
  pk: primaryKey({ columns: [table.blogid, table.publicid] }), // Composite primary key setup
}));

// =========================================================================
// 4. BLOGS_MERGE - Company Blog Feed Aggregation Linkages
// =========================================================================
export const blogsMerge = pgTable('blogs_merge', {
  blogid: integer('blogid')
    .notNull()
    .references(() => blogs.blogid, { onDelete: 'cascade' }), // The source agent blog channel [cite: 70, 133]
  mergewithblogid: integer('mergewithblogid').notNull(), // Destination corporate aggregator blog container ID [cite: 71]
}, (table) => ({
  pk: primaryKey({ columns: [table.blogid, table.mergewithblogid] }),
}));

// =========================================================================
// 5. BLOGS_CATEGORIES - Active Entry Assignment Category Tags
// =========================================================================
export const blogsCategories = pgTable('blogs_categories', {
  blogid: integer('blogid')
    .notNull()
    .references(() => blogs.blogid, { onDelete: 'cascade' }), // [cite: 77, 133]
  entryid: integer('entryid')
    .notNull()
    .references(() => blogsEntries.entryid, { onDelete: 'cascade' }), // Replaced entirely on updates [cite: 78, 80, 137]
  categoryname: varchar('categoryname', { length: 64 }).notNull(), // Trimmed to 64 chars [cite: 79]
}, (table) => ({
  pk: primaryKey({ columns: [table.entryid, table.categoryname] }),
}));

// =========================================================================
// 6. BLOG_CATEGORIES_TYPES - Available Predefined Master Options List
// =========================================================================
export const blogCategoriesTypes = pgTable('blog_categories_types', {
  publicid: varchar('publicid', { length: 255 }).notNull(), // Scoping identity visibility context [cite: 86]
  category: varchar('category', { length: 64 }).notNull(), // Name acts as PK; triggers duplicate block catches [cite: 87]
}, (table) => ({
  pk: primaryKey({ columns: [table.publicid, table.category] }),
}));

// =========================================================================
// 7. BLOGS_USERS - Registered Notifications Subscriber Tracking
// =========================================================================
export const blogsUsers = pgTable('blogs_users', {
  subscriberid: serial('subscriberid').primaryKey(),
  blogid: integer('blogid')
    .notNull()
    .references(() => blogs.blogid, { onDelete: 'cascade' }), // Cascade dropped on parent container deletion [cite: 93, 95, 133]
  email: varchar('email', { length: 255 }).notNull(), // Subscriber field mapping address details [cite: 94]
});

// =========================================================================
// 8. BLOGS_COMMENTS - Reader Discussion Logs
// =========================================================================
export const blogsComments = pgTable('blogs_comments', {
  commentid: serial('commentid').primaryKey(),
  blogid: integer('blogid')
    .notNull()
    .references(() => blogs.blogid, { onDelete: 'cascade' }), // [cite: 100, 133]
  entryid: integer('entryid')
    .notNull()
    .references(() => blogsEntries.entryid, { onDelete: 'cascade' }), // Cascades with container or single post [cite: 101, 103, 136]
  authorname: varchar('authorname', { length: 100 }).notNull(), // [cite: 102]
  commenttext: text('commenttext').notNull(), // [cite: 102]
  commentdatetime: timestamp('commentdatetime').defaultNow().notNull(), // [cite: 102]
});

// =========================================================================
// RELATIONAL MODEL MAPPINGS (Enables Elegant Drizzle Fluent Queries)
// =========================================================================
export const blogsRelations = relations(blogs, ({ many }) => ({
  entries: many(blogsEntries),
  agents: many(blogsAgents),
  subscribers: many(blogsUsers),
}));

export const blogsEntriesRelations = relations(blogsEntries, ({ one, many }) => ({
  blog: one(blogs, { fields: [blogsEntries.blogid], references: [blogs.blogid] }),
  comments: many(blogsComments),
  categories: many(blogsCategories),
}));