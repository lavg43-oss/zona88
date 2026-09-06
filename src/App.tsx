import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Capture from './pages/Capture';

function App() {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setUserProfile(null);
        setLoading(false);
        navigate('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    // 1. Obtener perfil
    const { data: profile } = await supabase.from('z88_profiles').select('*').eq('id', userId).single();
    if (!profile) { setLoading(false); return; }

    // 2. Si es escuela, obtener datos de escuela
    let name = profile.user_metadata?.name || 'Usuario';
    if (profile.role === 'school' && profile.school_id) {
      const { data: school } = await supabase.from('z88_schools').select('name').eq('id', profile.school_id).single();
      if (school) name = school.name;
    } else if (profile.role === 'supervisor') {
      name = 'Dra. Magda Ordóñez Martínez';
    }

    setUserProfile({
      ...profile,
      name
    });
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-slate-500 font-bold">Cargando...</div>;

  return (
    <Routes>
      <Route path="/login" element={!session ? <Login /> : <Navigate to="/dashboard" replace />} />
      
      <Route path="/" element={(session && userProfile) ? <Layout user={userProfile} onLogout={handleLogout} /> : <Navigate to="/login" replace />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard user={userProfile} />} />
        <Route path="capture" element={<Capture user={userProfile} />} />
      </Route>
    </Routes>
  );
}

export default App;
