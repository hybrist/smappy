CREATE TABLE `AnalysisRun` (
	`id` integer PRIMARY KEY NOT NULL,
	`project_name` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`bundler` text
);
--> statement-breakpoint
CREATE TABLE `Bundle` (
	`id` integer PRIMARY KEY NOT NULL,
	`analysis_run_id` integer NOT NULL,
	`file_name` text NOT NULL,
	`file_type` text NOT NULL,
	`size` integer NOT NULL,
	`gzip_size` integer,
	FOREIGN KEY (`analysis_run_id`) REFERENCES `AnalysisRun`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_bundle_analysis_run` ON `Bundle` (`analysis_run_id`);--> statement-breakpoint
CREATE TABLE `Chunk` (
	`id` integer PRIMARY KEY NOT NULL,
	`analysis_run_id` integer NOT NULL,
	`name` text,
	`total_size` integer NOT NULL,
	`is_entry` integer DEFAULT false NOT NULL,
	`is_async` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`analysis_run_id`) REFERENCES `AnalysisRun`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_chunk_analysis_run` ON `Chunk` (`analysis_run_id`);--> statement-breakpoint
CREATE TABLE `Chunk_Module` (
	`chunk_id` integer NOT NULL,
	`module_id` integer NOT NULL,
	PRIMARY KEY(`chunk_id`, `module_id`),
	FOREIGN KEY (`chunk_id`) REFERENCES `Chunk`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`module_id`) REFERENCES `Module`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Dependency` (
	`id` integer PRIMARY KEY NOT NULL,
	`analysis_run_id` integer NOT NULL,
	`importer_module_id` integer NOT NULL,
	`imported_module_id` integer NOT NULL,
	`import_type` text NOT NULL,
	`imported_symbols` text,
	FOREIGN KEY (`analysis_run_id`) REFERENCES `AnalysisRun`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`importer_module_id`) REFERENCES `Module`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`imported_module_id`) REFERENCES `Module`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_dependency_analysis_run` ON `Dependency` (`analysis_run_id`);--> statement-breakpoint
CREATE INDEX `idx_dependency_importer` ON `Dependency` (`importer_module_id`);--> statement-breakpoint
CREATE INDEX `idx_dependency_imported` ON `Dependency` (`imported_module_id`);--> statement-breakpoint
CREATE TABLE `Module` (
	`id` integer PRIMARY KEY NOT NULL,
	`analysis_run_id` integer NOT NULL,
	`file_path` text NOT NULL,
	`file_type` text NOT NULL,
	`original_size` integer NOT NULL,
	`bundled_size` integer NOT NULL,
	`is_third_party` integer DEFAULT false NOT NULL,
	`package_name` text,
	`package_version` text,
	`exports` text,
	`used_exports` text,
	FOREIGN KEY (`analysis_run_id`) REFERENCES `AnalysisRun`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_module_analysis_run` ON `Module` (`analysis_run_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_module_path_run` ON `Module` (`analysis_run_id`,`file_path`);--> statement-breakpoint
CREATE TABLE `SourceMapEntry` (
	`id` integer PRIMARY KEY NOT NULL,
	`bundle_id` integer NOT NULL,
	`symbol_id` integer NOT NULL,
	`byte_length` integer NOT NULL,
	FOREIGN KEY (`bundle_id`) REFERENCES `Bundle`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`symbol_id`) REFERENCES `Symbol`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_sourcemap_symbol` ON `SourceMapEntry` (`symbol_id`);--> statement-breakpoint
CREATE TABLE `Suggestion` (
	`id` integer PRIMARY KEY NOT NULL,
	`analysis_run_id` integer NOT NULL,
	`type` text NOT NULL,
	`severity` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	FOREIGN KEY (`analysis_run_id`) REFERENCES `AnalysisRun`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_suggestion_analysis_run` ON `Suggestion` (`analysis_run_id`);--> statement-breakpoint
CREATE TABLE `Suggestion_Link` (
	`suggestion_id` integer NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	PRIMARY KEY(`suggestion_id`, `entity_type`, `entity_id`),
	FOREIGN KEY (`suggestion_id`) REFERENCES `Suggestion`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_suggestion_link_entity` ON `Suggestion_Link` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `Symbol` (
	`id` integer PRIMARY KEY NOT NULL,
	`module_id` integer NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`source_start_line` integer NOT NULL,
	`source_start_col` integer NOT NULL,
	`source_end_line` integer NOT NULL,
	`source_end_col` integer NOT NULL,
	`ast_hash` text,
	`is_exported` integer DEFAULT false NOT NULL,
	`computed_bundled_size` integer DEFAULT 0 NOT NULL,
	`computed_gzip_size` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`module_id`) REFERENCES `Module`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_symbol_analysis_run` ON `Symbol` (`module_id`);--> statement-breakpoint
CREATE INDEX `idx_symbol_ast_hash` ON `Symbol` (`ast_hash`);