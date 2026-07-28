/**
 * supabase-client.js
 * ---------------------------------------------------------
 * Ganti dua nilai di bawah ini dengan milikmu sendiri.
 * Ambil dari: Supabase Dashboard > Project Settings > API
 * ---------------------------------------------------------
 */
const SUPABASE_URL = "https://jiylshavuzbmalkoofvc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_hRFHtk7hUAVewPCh9iBDww_3JZ9h0Mg";

// Global client, dipakai oleh articles.js dan admin.js
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TABLE_ARTICLES = "articles";
const STORAGE_BUCKET = "article-images";
