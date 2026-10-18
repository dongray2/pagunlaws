import { cpSync, mkdirSync, rmSync } from "node:fs";

rmSync("public", { recursive: true, force: true });
mkdirSync("public", { recursive: true });
cpSync("site", "public", { recursive: true });
cpSync("data/record.json", "public/record.json");
