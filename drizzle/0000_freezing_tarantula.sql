CREATE TABLE "blog_categories_types" (
	"publicid" varchar(255) NOT NULL,
	"category" varchar(64) NOT NULL,
	CONSTRAINT "blog_categories_types_publicid_category_pk" PRIMARY KEY("publicid","category")
);
--> statement-breakpoint
CREATE TABLE "blogs" (
	"blogid" serial PRIMARY KEY NOT NULL,
	"blogtitle" varchar(255) NOT NULL,
	"publicid" varchar(255) NOT NULL,
	"status" varchar(1) DEFAULT 'A' NOT NULL,
	"adminemail" varchar(255) DEFAULT '',
	"entrynotification" varchar(1) DEFAULT 'F' NOT NULL,
	"commentnotification" varchar(1) DEFAULT 'F' NOT NULL,
	"requirelogin" varchar(1) DEFAULT 'F' NOT NULL,
	"allowcomments" varchar(1) DEFAULT 'F' NOT NULL,
	"commentdisabledays" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blogs_agents" (
	"blogid" integer NOT NULL,
	"publicid" varchar(255) NOT NULL,
	CONSTRAINT "blogs_agents_blogid_publicid_pk" PRIMARY KEY("blogid","publicid")
);
--> statement-breakpoint
CREATE TABLE "blogs_categories" (
	"blogid" integer NOT NULL,
	"entryid" integer NOT NULL,
	"categoryname" varchar(64) NOT NULL,
	CONSTRAINT "blogs_categories_entryid_categoryname_pk" PRIMARY KEY("entryid","categoryname")
);
--> statement-breakpoint
CREATE TABLE "blogs_comments" (
	"commentid" serial PRIMARY KEY NOT NULL,
	"blogid" integer NOT NULL,
	"entryid" integer NOT NULL,
	"authorname" varchar(100) NOT NULL,
	"commenttext" text NOT NULL,
	"commentdatetime" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blogs_entries" (
	"entryid" serial PRIMARY KEY NOT NULL,
	"blogid" integer NOT NULL,
	"entrytitle" varchar(255) NOT NULL,
	"entrytext" text NOT NULL,
	"status" varchar(1) NOT NULL,
	"entrypostedbypublicid" varchar(255) NOT NULL,
	"entrydatetime" timestamp DEFAULT now() NOT NULL,
	"entrysubtitle" varchar(255) DEFAULT '',
	"entryallowcomments" varchar(1),
	"entrycommentdisabledays" integer,
	"featuredimage" varchar(500)
);
--> statement-breakpoint
CREATE TABLE "blogs_merge" (
	"blogid" integer NOT NULL,
	"mergewithblogid" integer NOT NULL,
	CONSTRAINT "blogs_merge_blogid_mergewithblogid_pk" PRIMARY KEY("blogid","mergewithblogid")
);
--> statement-breakpoint
CREATE TABLE "blogs_users" (
	"subscriberid" serial PRIMARY KEY NOT NULL,
	"blogid" integer NOT NULL,
	"email" varchar(255) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blogs_agents" ADD CONSTRAINT "blogs_agents_blogid_blogs_blogid_fk" FOREIGN KEY ("blogid") REFERENCES "public"."blogs"("blogid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blogs_categories" ADD CONSTRAINT "blogs_categories_blogid_blogs_blogid_fk" FOREIGN KEY ("blogid") REFERENCES "public"."blogs"("blogid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blogs_categories" ADD CONSTRAINT "blogs_categories_entryid_blogs_entries_entryid_fk" FOREIGN KEY ("entryid") REFERENCES "public"."blogs_entries"("entryid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blogs_comments" ADD CONSTRAINT "blogs_comments_blogid_blogs_blogid_fk" FOREIGN KEY ("blogid") REFERENCES "public"."blogs"("blogid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blogs_comments" ADD CONSTRAINT "blogs_comments_entryid_blogs_entries_entryid_fk" FOREIGN KEY ("entryid") REFERENCES "public"."blogs_entries"("entryid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blogs_entries" ADD CONSTRAINT "blogs_entries_blogid_blogs_blogid_fk" FOREIGN KEY ("blogid") REFERENCES "public"."blogs"("blogid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blogs_merge" ADD CONSTRAINT "blogs_merge_blogid_blogs_blogid_fk" FOREIGN KEY ("blogid") REFERENCES "public"."blogs"("blogid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blogs_users" ADD CONSTRAINT "blogs_users_blogid_blogs_blogid_fk" FOREIGN KEY ("blogid") REFERENCES "public"."blogs"("blogid") ON DELETE cascade ON UPDATE no action;