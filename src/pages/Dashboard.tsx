import { useEffect, useState, useMemo } from 'react';
import { DISCIPLINES, PERIODS } from '../data/constants';
import { supabase } from '../lib/supabase';
import { 
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  ReferenceLine,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  ComposedChart
} from 'recharts';
import { Download, Users, TrendingUp, BookOpen, AlertTriangle } from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import clsx from 'clsx';

const CustomizedAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const lines = payload.value.split('\n');
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="middle" fill="#475569" fontSize={10} fontWeight={500}>
        {lines.map((line: string, index: number) => (
          <tspan key={index} x={0} dy={index === 0 ? "0" : "1.2em"}>{line}</tspan>
        ))}
      </text>
    </g>
  );
};

export default function Dashboard({ user }: { user: any }) {
  const isSupervisor = user.role === 'supervisor';
  
  const [schools, setSchools] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(PERIODS[0]); // 'Diagnóstico'

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [schRes, grpRes, scoRes] = await Promise.all([
        supabase.from('z88_schools').select('*'),
        supabase.from('z88_groups').select('*'),
        supabase.from('z88_scores').select('*').eq('period', selectedPeriod)
      ]);
      
      setSchools(schRes.data || []);
      setGroups(grpRes.data || []);
      setScores(scoRes.data || []);
      setLoading(false);
    }
    loadData();
  }, [selectedPeriod]);

  const totalGroups = groups.length;
  // A group has completed capture if they have all required disciplines
  const completedGroupsCount = useMemo(() => {
    let count = 0;
    groups.forEach(g => {
      const gScores = scores.filter(s => s.group_id === g.id);
      const req = g.grade === 1 ? 12 : 11;
      if (gScores.length >= req) count++;
    });
    return count;
  }, [groups, scores]);

  const hasCompletedCapture = isSupervisor ? completedGroupsCount === totalGroups : (user.school_id ? (() => {
    const sGroups = groups.filter(g => g.school_id === user.school_id);
    let done = 0;
    sGroups.forEach(g => {
      const gScores = scores.filter(s => s.group_id === g.id);
      const req = g.grade === 1 ? 12 : 11;
      if (gScores.length >= req) done++;
    });
    return sGroups.length > 0 && done === sGroups.length;
  })() : false);

  // Global Avg
  const globalAvg = useMemo(() => {
    if (!scores.length) return '0.0';
    const sum = scores.reduce((a, b) => a + Number(b.average_score), 0);
    return (sum / scores.length).toFixed(1);
  }, [scores]);

  // Schools Avg (Bar Chart)
  const schoolsComparison = useMemo(() => {
    const data = schools.map(school => {
      const sGroups = groups.filter(g => g.school_id === school.id).map(g => g.id);
      const sScores = scores.filter(s => sGroups.includes(s.group_id));
      
      const sum = sScores.reduce((acc, curr) => acc + Number(curr.average_score), 0);
      const avg = sScores.length ? (sum / sScores.length).toFixed(1) : 0;
      
      let customName = school.name;
      if (school.name.includes('No1')) customName = 'Sec. No1\nM. Escobedo';
      if (school.name.includes('No4')) customName = 'Sec. No4\nJosé S. Vivanco';
      if (school.name.includes('No 8')) customName = 'Sec. No8\nCarlos García R.';
      
      return {
        id: school.id,
        name: customName,
        promedio: Number(avg)
      };
    });
    
    // Sort logic to match the order s1, s2, s3 roughly
    data.sort((a, b) => a.name.localeCompare(b.name));
    
    data.push({
      id: 'zona',
      name: 'PROMEDIO\nZONA 88',
      promedio: Number(globalAvg)
    });
    return data;
  }, [schools, groups, scores, globalAvg]);

  // Radar Data
  const radarData = useMemo(() => {
    return DISCIPLINES.map(d => {
      const base: any = { subject: d.substring(0, 5) + '.' };
      schools.forEach(school => {
        const sGroups = groups.filter(g => g.school_id === school.id).map(g => g.id);
        const dScores = scores.filter(s => sGroups.includes(s.group_id) && s.discipline === d);
        const sum = dScores.reduce((a, c) => a + Number(c.average_score), 0);
        base[school.id] = dScores.length ? Number((sum / dScores.length).toFixed(1)) : 0;
      });
      return base;
    });
  }, [schools, groups, scores]);

  // Detailed Bar Data
  const detailedDisciplineData = useMemo(() => {
    return DISCIPLINES.map(d => {
      const base: any = { subject: d };
      schools.forEach(school => {
        const sGroups = groups.filter(g => g.school_id === school.id).map(g => g.id);
        const dScores = scores.filter(s => sGroups.includes(s.group_id) && s.discipline === d);
        const sum = dScores.reduce((a, c) => a + Number(c.average_score), 0);
        base[school.id] = dScores.length ? Number((sum / dScores.length).toFixed(1)) : 0;
      });
      return base;
    });
  }, [schools, groups, scores]);

  const handleExportPDF = async () => {
    const btn = document.getElementById('btn-export');
    if (btn) btn.style.display = 'none';

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      pdf.setFontSize(22);
      pdf.text(isSupervisor ? 'Reporte Oficial - Zona Escolar 88' : 'Reporte Oficial Escolar', 14, 20);
      pdf.setFontSize(12);
      pdf.setTextColor(100);
      pdf.text(`Periodo: ${selectedPeriod} | Promedio Global: ${globalAvg} | Grupos Evaluados: ${completedGroupsCount}/${totalGroups}`, 14, 30);
      
      let currentY = 40;

      const addChartToPdf = async (id: string, heightMargin = 0) => {
        const el = document.getElementById(id);
        if (el) {
          const dataUrl = await toPng(el, { pixelRatio: 2 });
          const imgProps = pdf.getImageProperties(dataUrl);
          const imgHeight = (imgProps.height * (pdfWidth - 20)) / imgProps.width;
          
          if (currentY + imgHeight > 280) {
            pdf.addPage();
            currentY = 20;
          }
          
          pdf.addImage(dataUrl, 'PNG', 10, currentY, pdfWidth - 20, imgHeight);
          currentY += imgHeight + heightMargin;
        }
      };

      await addChartToPdf('chart-1', 15);
      await addChartToPdf('chart-2', 15);
      await addChartToPdf('chart-3', 15);

      pdf.save('Reporte_Resultados_NEM.pdf');
    } catch (error: any) {
      alert("Error al generar PDF: " + error.message);
      console.error(error);
    } finally {
      if (btn) btn.style.display = 'flex';
    }
  };

  if (!isSupervisor) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-slate-500">
        <AlertTriangle size={48} className="mb-4 text-slate-300" />
        <h2 className="text-xl font-bold">Acceso Denegado</h2>
        <p>El panel de resultados es de uso exclusivo para la Supervisión Escolar.</p>
      </div>
    );
  }

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Cargando datos en vivo...</div>;

  return (
    <div className="p-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Panel de Resultados NEM</h2>
          <p className="text-slate-500 mt-1">Análisis y promedios por disciplina</p>
        </div>
        
        {(!hasCompletedCapture && !isSupervisor) ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm font-medium">
            <AlertTriangle size={18} />
            Falta capturar grupos para ver el Dashboard
          </div>
        ) : (
          <button 
            id="btn-export"
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg shadow-md transition-all font-semibold"
          >
            <Download size={18} />
            Exportar a PDF
          </button>
        )}
      </div>

      {/* Selector de Periodo en bloque separado para que tenga espacio */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 mb-8 print:hidden inline-flex flex-wrap gap-2">
        {PERIODS.map(p => (
          <button
            key={p}
            onClick={() => setSelectedPeriod(p)}
            className={clsx(
              "px-5 py-2 rounded-lg text-sm font-semibold transition-all",
              selectedPeriod === p 
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" 
                : "bg-transparent text-slate-600 hover:bg-slate-50"
            )}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 print:hidden">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Promedio {isSupervisor ? 'Zona' : 'Escuela'}</p>
            <p className="text-2xl font-bold text-slate-800">{globalAvg}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Grupos Evaluados</p>
            <p className="text-2xl font-bold text-slate-800">{completedGroupsCount} / {isSupervisor ? totalGroups : groups.filter(g => g.school_id === user.school_id).length}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Disciplinas NEM</p>
            <p className="text-2xl font-bold text-slate-800">12</p>
          </div>
        </div>
      </div>

      {/* Area de PDF */}
      <div id="pdf-content" className="space-y-8 bg-transparent print:bg-white print:m-0 print:p-0">
        
        {!hasCompletedCapture && !isSupervisor ? (
           <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center flex flex-col items-center print:hidden">
             <AlertTriangle size={48} className="text-amber-400 mb-4" />
             <h3 className="text-xl font-bold text-slate-800 mb-2">Información Oculta</h3>
             <p className="text-slate-500 max-w-md">Para poder ver la comparativa de la zona, primero debes terminar de capturar los promedios de diagnóstico de todos tus grupos.</p>
           </div>
        ) : (
          <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2 print:break-inside-avoid">
            
            {/* Gráfica 1 */}
            <div id="chart-1" className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-6 text-center">Escuelas vs Promedio Zonal</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={schoolsComparison} margin={{ top: 20, right: 20, bottom: 30, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={<CustomizedAxisTick />} interval={0} height={60} />
                    <YAxis domain={[5, 10]} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <RechartsTooltip cursor={{ fill: '#f1f5f9' }} />
                    <Bar isAnimationActive={false} dataKey="promedio" barSize={40}>
                      {schoolsComparison.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.id === 'zona' ? '#10b981' : '#3b82f6'} />
                      ))}
                    </Bar>
                    <ReferenceLine y={Number(globalAvg)} stroke="#10b981" strokeDasharray="3 3" label={{ position: 'top', value: 'Media Zonal', fill: '#10b981', fontSize: 12 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfica 2 */}
            <div id="chart-2" className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-2 text-center">Equilibrio por Disciplina</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[4, 10]} />
                    {schools.map((s, i) => (
                      <Radar key={s.id} isAnimationActive={false} name={s.name.substring(0,10)} dataKey={s.id} stroke={i===0?'#3b82f6':i===1?'#f59e0b':'#8b5cf6'} fill={i===0?'#3b82f6':i===1?'#f59e0b':'#8b5cf6'} fillOpacity={0.2} />
                    ))}
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfica 3 */}
            <div id="chart-3" className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 print:break-inside-avoid print:mt-4">
              <h3 className="text-lg font-bold text-slate-800 mb-6 text-center">Detalle General por Disciplina (NEM)</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={detailedDisciplineData} margin={{ top: 10, right: 10, left: -20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="subject" tick={{ fontSize: 12, fill: '#64748b' }} angle={-45} textAnchor="end" interval={0} height={70} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    {schools.map((s, i) => (
                       <Bar key={s.id} isAnimationActive={false} dataKey={s.id} name={s.name.substring(0,15)} fill={i===0?'#3b82f6':i===1?'#f59e0b':'#8b5cf6'} radius={[2, 2, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
          </div>
          </>
        )}
      </div>
    </div>
  );
}
