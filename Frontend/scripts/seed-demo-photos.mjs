import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const photoDir = process.argv[2] || path.resolve(process.cwd(), 'demo-photos');
const bucket = process.env.VITE_SUPABASE_STORAGE_BUCKET || 'photo-uploads';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const demoEmail = process.env.VITE_DEMO_EMAIL;
const demoPassword = process.env.VITE_DEMO_PASSWORD;

if (!supabaseUrl || !supabaseAnonKey || !demoEmail || !demoPassword) {
  console.error('Missing env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_DEMO_EMAIL, VITE_DEMO_PASSWORD');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const mimeByExt = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const demoItems = [
  ['Seoul Night Sky', 'Night Sky', 37.5665, 126.9780, 'Seoul, Korea'],
  ['Busan Evening Coast', 'Night Sky', 35.1796, 129.0756, 'Busan, Korea'],
  ['Jeju Star Field', 'Nature', 33.4996, 126.5312, 'Jeju, Korea'],
  ['Tokyo Observatory', 'City Night', 35.6762, 139.6503, 'Tokyo, Japan'],
  ['Kyoto Moon Walk', 'City Night', 35.0116, 135.7681, 'Kyoto, Japan'],
  ['Osaka Neon Cloud', 'City Night', 34.6937, 135.5023, 'Osaka, Japan'],
  ['London Blue Hour', 'City Night', 51.5072, -0.1276, 'London, United Kingdom'],
  ['Paris Sunset Trace', 'City Night', 48.8566, 2.3522, 'Paris, France'],
  ['New York Skyline', 'City Night', 40.7128, -74.0060, 'New York, United States'],
  ['Iceland Aurora', 'Aurora', 64.1466, -21.9426, 'Reykjavik, Iceland'],
  ['Norway Northern Light', 'Aurora', 69.6492, 18.9553, 'Tromso, Norway'],
  ['Swiss Alpine Stars', 'Nature', 46.8182, 8.2275, 'Swiss Alps, Switzerland'],
  ['Sahara Milky Way', 'Nature', 23.4162, 25.6628, 'Sahara Desert'],
  ['Sydney Moonrise', 'City Night', -33.8688, 151.2093, 'Sydney, Australia'],
  ['Bangkok Night Road', 'City Night', 13.7563, 100.5018, 'Bangkok, Thailand'],
  ['Singapore Night Garden', 'City Night', 1.3521, 103.8198, 'Singapore'],
];

async function getFiles() {
  const entries = await fs.readdir(photoDir, { withFileTypes: true });
  return entries
    .filter(entry => entry.isFile())
    .map(entry => path.join(photoDir, entry.name))
    .filter(file => mimeByExt[path.extname(file).toLowerCase()])
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
}

async function ensureCategory(userId, name) {
  const { data: existing, error: selectError } = await supabase
    .from('category')
    .select('category_id')
    .eq('user_id', userId)
    .eq('name', name)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing.category_id;

  const { data, error } = await supabase
    .from('category')
    .insert({ user_id: userId, name })
    .select('category_id')
    .single();

  if (error) throw error;
  return data.category_id;
}

async function uploadPhoto(userId, filePath, index) {
  const meta = demoItems[index % demoItems.length];
  const [title, categoryName, lat, lon, address] = meta;
  const ext = path.extname(filePath).toLowerCase();
  const originalName = path.basename(filePath);
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '-');
  const storagePath = `demo/${userId}/${Date.now()}-${index + 1}-${safeName}`;
  const fileBuffer = await fs.readFile(filePath);

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, fileBuffer, {
      contentType: mimeByExt[ext],
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  const categoryId = await ensureCategory(userId, categoryName);

  const now = new Date();
  const takeTime = new Date(now.getTime() - index * 86400000).toISOString();

  const { data: locData, error: locError } = await supabase
    .from('location')
    .insert({
      user_id: userId,
      lat,
      lon,
      address_text: address,
      created_time: now.toISOString(),
    })
    .select('location_id')
    .single();

  if (locError) throw locError;

  const { data: mediaData, error: mediaError } = await supabase
    .from('media')
    .insert({
      user_id: userId,
      category_id: categoryId,
      location_id: locData.location_id,
      media_type: 'IMAGE',
      file_url: publicData.publicUrl,
      take_time: takeTime,
      created_time: now.toISOString(),
    })
    .select('media_id')
    .single();

  if (mediaError) throw mediaError;

  const { error: descError } = await supabase
    .from('media_description')
    .insert({
      media_id: mediaData.media_id,
      description_text: `${title}\n---\nDemo travel archive photo seeded for the public portfolio view. Source file: ${originalName}`,
      edited_time: now.toISOString(),
    });

  if (descError) throw descError;
  return { title, mediaId: mediaData.media_id };
}

const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
  email: demoEmail,
  password: demoPassword,
});

if (signInError) throw signInError;
const userId = signInData.user.id;
const files = await getFiles();

if (files.length === 0) {
  console.error(`No supported image files found: ${photoDir}`);
  process.exit(1);
}

console.log(`Uploading ${files.length} demo photos for user ${userId}`);

let success = 0;
for (const [index, filePath] of files.entries()) {
  try {
    const result = await uploadPhoto(userId, filePath, index);
    success += 1;
    console.log(`[${success}/${files.length}] ${result.title} -> media_id=${result.mediaId}`);
  } catch (error) {
    console.error(`Failed: ${path.basename(filePath)} - ${error.message}`);
  }
}

console.log(`Done. Uploaded ${success}/${files.length} photos.`);
