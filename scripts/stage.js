import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const record = readFileSync("data/record.json", "utf8");
writeFileSync("functions/record.js", `export default ${record};\n`);

rmSync("public", { recursive: true, force: true });
mkdirSync("public", { recursive: true });
cpSync("site", "public", { recursive: true });
cpSync("data/record.json", "public/record.json");
