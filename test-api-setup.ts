import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

// Mocks
(global as any).import = { meta: { env: { VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY } } };
(global as any).window = {};
(global as any).localStorage = { getItem: () => null, setItem: () => {} };

import fs from 'fs';
const apiTsCode = fs.readFileSync('src/lib/api.ts', 'utf8');
const fakeApiFile = apiTsCode.replace('import.meta.env', 'process.env');
fs.writeFileSync('test-api-mock.ts', fakeApiFile);

