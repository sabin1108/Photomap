import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const demoUserId = process.env.VITE_DEMO_USER_ID || process.argv[2];

if (!supabaseUrl || !supabaseAnonKey || !demoUserId) {
  console.error('Missing env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_DEMO_USER_ID');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const { data, error } = await supabase
  .from('media')
  .select(`
    media_id,
    file_url,
    location (*),
    category (*),
    media_description (*)
  `)
  .eq('user_id', demoUserId)
  .order('created_time', { ascending: false })
  .limit(50);

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(`Readable demo media: ${data.length}`);
console.log(data.slice(0, 3).map(item => ({
  media_id: item.media_id,
  category: item.category?.name,
  address: item.location?.address_text,
  hasDescription: Boolean(item.media_description?.description_text || item.media_description?.[0]?.description_text),
  hasUrl: Boolean(item.file_url),
})));
