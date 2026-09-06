import { createClient } from '@supabase/supabase-js';

const url = 'https://iqmqonpoguvjzqbsirbe.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxbXFvbnBvZ3V2anpxYnNpcmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYxMjI2MiwiZXhwIjoyMDk0MTg4MjYyfQ.YfaJYBE-hpajJkVo-41vvupCDhrZfwBrpbiDgHNu-Eg';
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function update() {
  console.log('Actualizando correos...');

  // 1. Supervisor
  const { data: profiles } = await supabase.from('z88_profiles').select('*').eq('role', 'supervisor').single();
  if (profiles) {
    const { error } = await supabase.auth.admin.updateUserById(profiles.id, { email: '88zonaescolar2026@gmail.com' });
    if (!error) console.log('Supervisor actualizado a 88zonaescolar2026@gmail.com');
    // Actualizar nombre en metadata? No tenemos nombre en perfiles, pero si queremos lo podemos guardar en metadata.
    await supabase.auth.admin.updateUserById(profiles.id, { user_metadata: { name: 'Dra. Magda Ordóñez Martínez' } });
  }

  // 2. Escuelas
  const emails = {
    '1': 'mescobedo2009@hotmail.com',
    '4': 'sec.josesvivanco@hotmail.com',
    '8': 'drcarlosgarciarodriguez6@gmail.com'
  };

  const { data: schools } = await supabase.from('z88_schools').select('*');
  for (const school of schools) {
    const { data: prof } = await supabase.from('z88_profiles').select('*').eq('school_id', school.id).single();
    if (prof) {
      let newEmail = '';
      if (school.name.includes('No1')) newEmail = emails['1'];
      if (school.name.includes('No4')) newEmail = emails['4'];
      if (school.name.includes('No 8')) newEmail = emails['8'];
      
      if (newEmail) {
        const { error } = await supabase.auth.admin.updateUserById(prof.id, { email: newEmail });
        if (!error) console.log(`Escuela ${school.name} actualizada a ${newEmail}`);
      }
    }
  }
}

update();
