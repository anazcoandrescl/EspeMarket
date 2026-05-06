const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://thpncsayykhidafheamb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GH5XLBnXGl7TyCu25HPQOw_OclWkOIh';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data, error } = await supabase.from('app_data').select('*').eq('id', 1).single();
  console.log('SELECT:', data, error);
}
run();
