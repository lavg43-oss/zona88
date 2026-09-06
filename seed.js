import { createClient } from '@supabase/supabase-js';

const url = 'https://iqmqonpoguvjzqbsirbe.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxbXFvbnBvZ3V2anpxYnNpcmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYxMjI2MiwiZXhwIjoyMDk0MTg4MjYyfQ.YfaJYBE-hpajJkVo-41vvupCDhrZfwBrpbiDgHNu-Eg';

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const SCHOOLS = [
  { name: 'Secundaria No1 Gral. Mariano Escobedo', shift: 'Vespertino', email: 'sec1@zona88.com' },
  { name: 'Secundaria No4 José S Vivanco', shift: 'Matutino', email: 'sec4@zona88.com' },
  { name: 'Secundaria No 8 Dr. Carlos García Rodríguez', shift: 'Matutino', email: 'sec8@zona88.com' },
];

const GROUPS_DATA = [
  [ {g:1,n:'A'},{g:1,n:'B'},{g:1,n:'C'}, {g:2,n:'A'},{g:2,n:'B'}, {g:3,n:'A'},{g:3,n:'B'} ],
  [ {g:1,n:'A'},{g:1,n:'B'}, {g:2,n:'A'},{g:2,n:'B'}, {g:3,n:'A'},{g:3,n:'B'} ],
  [ {g:1,n:'A'},{g:1,n:'B'},{g:1,n:'C'}, {g:2,n:'A'},{g:2,n:'B'},{g:2,n:'C'}, {g:3,n:'A'},{g:3,n:'B'},{g:3,n:'C'} ]
];

async function seed() {
  console.log('Iniciando poblado de base de datos...');
  
  // 1. Supervisor
  const { data: supAuth, error: supErr } = await supabase.auth.admin.createUser({
    email: 'supervisor@zona88.com',
    password: 'password123',
    email_confirm: true
  });
  if (supErr) console.log('Supervisor error (quizas ya existe):', supErr.message);
  else {
    await supabase.from('z88_profiles').insert({
      id: supAuth.user.id,
      role: 'supervisor',
      school_id: null
    });
    console.log('Supervisor creado.');
  }

  // 2. Escuelas
  for (let i = 0; i < SCHOOLS.length; i++) {
    const s = SCHOOLS[i];
    
    // Insert school
    const { data: school, error: sErr } = await supabase.from('z88_schools').insert({
      name: s.name,
      shift: s.shift
    }).select().single();
    
    if (sErr) {
      console.log('Error creando escuela', s.name, sErr.message);
      continue;
    }
    console.log(`Escuela ${s.name} creada con ID ${school.id}`);

    // Insert user
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: s.email,
      password: 'password123',
      email_confirm: true
    });
    
    if (!authErr) {
      await supabase.from('z88_profiles').insert({
        id: authUser.user.id,
        role: 'school',
        school_id: school.id
      });
      console.log(`Usuario ${s.email} creado.`);
    }

    // Insert groups
    const groups = GROUPS_DATA[i].map(g => ({
      school_id: school.id,
      grade: g.g,
      name: g.n
    }));
    await supabase.from('z88_groups').insert(groups);
    console.log(`Grupos de ${s.name} insertados.`);
  }
  
  console.log('¡Poblado finalizado!');
}

seed();
