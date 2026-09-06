import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, FileEdit, LogOut, School } from 'lucide-react';
import clsx from 'clsx';

export default function Layout({ user, onLogout }: { user: any, onLogout: () => void }) {
  const isSupervisor = user.role === 'supervisor';

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Sidebar - Diseño Premium */}
      <aside className="w-72 bg-gradient-to-b from-blue-900 via-indigo-900 to-slate-900 text-white flex flex-col shadow-2xl relative z-10">
        <div className="p-8 flex flex-col items-center border-b border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl"></div>
          
          <div className="w-24 h-24 mb-4 transform hover:scale-105 transition-transform drop-shadow-xl relative z-20">
            <img src="/logo.png" alt="Logo Zona Escolar 88" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-bold tracking-wide">Zona Escolar 88</h1>
          <p className="text-xs text-blue-200 uppercase font-bold tracking-widest mt-1.5 opacity-80">Unidad Regional 7</p>
        </div>

        <div className="p-6 flex-1">
          <p className="text-xs font-bold text-indigo-300/70 uppercase tracking-widest mb-4 px-3">Navegación</p>
          <nav className="space-y-2">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 relative overflow-hidden",
                  isActive ? "bg-white/10 text-white shadow-inner border border-white/10" : "text-blue-100/70 hover:bg-white/5 hover:text-white"
                )
              }
            >
              <LayoutDashboard size={20} className={clsx("transition-transform duration-300")} />
              Dashboard {isSupervisor ? 'Zonal' : 'Escolar'}
            </NavLink>
            
            {!isSupervisor && (
              <NavLink
                to="/capture"
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300",
                    isActive ? "bg-white/10 text-white shadow-inner border border-white/10" : "text-blue-100/70 hover:bg-white/5 hover:text-white"
                  )
                }
              >
                <FileEdit size={20} />
                Captura de Promedios
              </NavLink>
            )}
          </nav>
        </div>

        <div className="p-6 bg-black/20 backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 mb-4 shadow-inner">
            <School size={22} className="text-blue-300" />
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{user.name}</p>
              <p className="text-xs text-blue-200/70 capitalize font-medium">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 hover:border-red-500/50 transition-all duration-300"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-100/50 relative">
        {/* Decorative background blur inside main */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none"></div>
        <div className="relative z-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
