import dotenv from "dotenv";
dotenv.config();
console.log(Object.keys(process.env).filter(k => k.includes("SUPA") || k.includes("POSTGRES") || k.includes("DB_")));
