const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://thpncsayykhidafheamb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GH5XLBnXGl7TyCu25HPQOw_OclWkOIh';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const payload = {
        products: [],
        baskets: [],
        sales: [],
        categories: [],
        settings: {}
      };
  const { data, error } = await supabase.from('app_data').upsert({ id: 1, ...payload });
  console.log('UPSERT:', data, error);
}
run();
