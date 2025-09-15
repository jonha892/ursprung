#!/usr/bin/env -S deno run -A

/**
 * CLI script to delete all projects from the database.
 * This is useful when the project schema has changed and existing projects
 * can no longer be parsed with the new structure.
 */

import { DB } from "https://deno.land/x/sqlite@v3.9.1/mod.ts";

const DB_FILE_URL = new URL("../data/app.sqlite", import.meta.url);

function openDb() {
  const db = new DB(DB_FILE_URL.pathname);
  return db;
}

function main() {
  const args = Deno.args;
  
  // Safety check - require confirmation flag
  if (!args.includes("--confirm")) {
    console.log("🚨 This script will DELETE ALL PROJECTS from the database!");
    console.log("   If you're sure you want to proceed, run:");
    console.log("   deno run -A scripts/cleanup-projects.ts --confirm");
    console.log("");
    console.log("💡 This is useful when the project schema has changed and");
    console.log("   existing projects can't be parsed with the new structure.");
    return;
  }

  try {
    const db = openDb();
    
    // Count existing projects first
    const countResult = db.query("SELECT COUNT(*) as count FROM projects");
    const projectCount = countResult[0][0] as number;
    
    if (projectCount === 0) {
      console.log("✅ No projects found in database. Nothing to delete.");
      db.close();
      return;
    }
    
    console.log(`📊 Found ${projectCount} project(s) in database.`);
    console.log("🗑️  Deleting all projects...");
    
    // Delete all projects
    db.query("DELETE FROM projects");
    
    console.log(`✅ Successfully deleted all projects!`);
    console.log(`   Affected rows: ${projectCount}`);
    
    db.close();
    
  } catch (error) {
    console.error("❌ Error during cleanup:");
    console.error(error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}