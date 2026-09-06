import { useState, useEffect } from 'react';
import { DISCIPLINES, PERIODS } from '../data/constants';
import { supabase } from '../lib/supabase';
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

export default function Capture({ user }: { user: any }) {
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState(PERIODS[0]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [scores, setScores] = useState<Record<string, string>>({});
  const [dbScores, setDbScores] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    async function loadGroups() {
      if (user.role === 'school' && user.school_id) {
        const { data } = await supabase.from('z88_groups').select('*').eq('school_id', user.school_id).order('grade', { ascending: true }).order('name', { ascending: true });
        if (data) {
          setGroups(data);
          if (data.length > 0) setSelectedGroup(data[0].id);
        }
      }
      setLoading(false);
    }
    loadGroups();
  }, [user]);

  useEffect(() => {
    async function loadScores() {
      if (!selectedGroup) return;
      
      const { data } = await supabase.from('z88_scores')
        .select('*')
        .eq('group_id', selectedGroup)
        .eq('period', selectedPeriod);
        
      if (data) {
        setDbScores(data);
        const newScores: Record<string, string> = {};
        let locked = false;
        
        data.forEach(s => {
          newScores[s.discipline] = String(s.average_score);
          
          // Check 24 hours rule
          const created = new Date(s.created_at).getTime();
          const now = new Date().getTime();
          const hours = (now - created) / (1000 * 60 * 60);
          
          if (hours >= 24) {
            // Check unlocked_until
            if (!s.unlocked_until || new Date(s.unlocked_until).getTime() < now) {
              locked = true;
            }
          }
        });
        
        setScores(newScores);
        setIsLocked(locked);
      }
    }
    loadScores();
  }, [selectedGroup, selectedPeriod]);

  const handleScoreChange = (discipline: string, value: string) => {
    if (isLocked) return;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setScores(prev => ({ ...prev, [discipline]: value }));
      setSaved(false);
    }
  };

  const handleSave = async () => {
    if (isLocked) return;
    setSaving(true);
    
    const upserts = Object.keys(scores).map(discipline => {
      const val = parseFloat(scores[discipline]);
      const existing = dbScores.find(s => s.discipline === discipline);
      
      if (!isNaN(val)) {
        if (existing) {
          return { ...existing, average_score: val }; // Update
        } else {
          return {
            group_id: selectedGroup,
            period: selectedPeriod,
            discipline: discipline,
            average_score: val
          };
        }
      }
      return null;
    }).filter(Boolean);

    if (upserts.length > 0) {
      const { error } = await supabase.from('z88_scores').upsert(upserts);
      if (!error) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert('Error al guardar: ' + error.message);
      }
    }
    setSaving(false);
  };

  const currentGroup = groups.find(g => g.id === selectedGroup);

  if (user.role === 'supervisor') {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-slate-500">
        <AlertCircle size={48} className="mb-4 text-slate-300" />
        <h2 className="text-xl font-bold">Acceso Denegado</h2>
        <p>Solo las escuelas pueden capturar calificaciones.</p>
      </div>
    );
  }

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Cargando grupos...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto pb-20">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Captura de Promedios NEM</h2>
        <p className="text-slate-500 mt-1">Registra los promedios globales de cada grupo por disciplina.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Controles superiores */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Periodo de Evaluación</label>
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
              {PERIODS.map(p => (
                <button
                  key={p}
                  onClick={() => setSelectedPeriod(p)}
                  className={clsx(
                    "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                    selectedPeriod === p 
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" 
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          
          <div className="sm:w-64">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Grupo a Capturar</label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.grade}° "{g.name}"</option>
              ))}
            </select>
          </div>
        </div>

        {/* Advertencia 24h */}
        {isLocked ? (
          <div className="px-6 py-4 bg-red-50 border-b border-red-100 flex items-start gap-3 text-red-700">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold">Periodo de edición finalizado</p>
              <p className="mt-0.5 opacity-90">Han pasado más de 24 horas desde el primer registro. Para modificar datos, solicita autorización a la supervisión.</p>
            </div>
          </div>
        ) : (
          <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex items-start gap-3 text-amber-700">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold">Importante: Regla de 24 horas</p>
              <p className="mt-0.5 opacity-90">Una vez guardadas las calificaciones de un grupo, tendrás solo 24 horas para hacer correcciones. Después de ese tiempo, el registro se bloqueará permanentemente.</p>
            </div>
          </div>
        )}

        {/* Grid de Captura */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">
              Promedios del Grupo {currentGroup?.grade}° "{currentGroup?.name}"
            </h3>
            
            <button
              onClick={handleSave}
              disabled={isLocked || saving}
              className={clsx(
                "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm",
                saved 
                  ? "bg-emerald-500 text-white" 
                  : isLocked
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
              )}
            >
              {saved ? (
                <><CheckCircle2 size={18} /> Guardado</>
              ) : saving ? (
                'Guardando...'
              ) : (
                <><Save size={18} /> Guardar Calificaciones</>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {DISCIPLINES.filter(d => currentGroup?.grade === 1 || d !== 'Geografía').map(discipline => (
              <div key={discipline} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2 truncate" title={discipline}>
                  {discipline}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    disabled={isLocked}
                    value={scores[discipline] || ''}
                    onChange={(e) => handleScoreChange(discipline, e.target.value)}
                    placeholder="Ej. 8.5"
                    className={clsx(
                      "w-full bg-white border rounded-lg px-3 py-2 text-slate-800 font-medium outline-none transition-colors",
                      isLocked ? "border-slate-200 bg-slate-100 cursor-not-allowed text-slate-500" : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
