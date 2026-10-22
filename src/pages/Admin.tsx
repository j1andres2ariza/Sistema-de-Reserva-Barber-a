import { demoMode } from "@/integrations/supabase/client";
import { useState, useMemo, useRef } from "react";
import { format } from "date-fns";
import { useBookings } from "@/hooks/useBookings";
import { useBarberSchedules } from "@/hooks/useBarberSchedules";
import { useBarbers } from "@/hooks/useBarbers";
import { useAuth } from "@/hooks/useAuth";
import { SERVICES, formatPrice } from "@/data/barbershop";
import {
  Phone,
  Calendar,
  Trash2,
  LogOut,
  Lock,
  Settings,
  Clock,
  Users,
  Upload,
  Plus,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Wallet,
  Percent,
} from "lucide-react";
import logoWhite from "@/assets/logo-white.jpeg";
import { useToast } from "@/hooks/use-toast";
import DashboardTab from "@/components/admin/DashboardTab";
import InventoryTab from "@/components/admin/InventoryTab";
import POSTab from "@/components/admin/POSTab";
import AccountingTab from "@/components/admin/AccountingTab";
import NotificationsTab from "@/components/admin/NotificationsTab";
import { bogotaToday } from "@/lib/booking";
import CommissionsTab from "@/components/admin/CommissionsTab";

const DAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "notifications", label: "WhatsApp", icon: Phone },
  { id: "bookings", label: "Reservas", icon: Calendar },
  { id: "pos", label: "Caja", icon: ShoppingCart },
  { id: "inventory", label: "Inventario", icon: Package },
  { id: "accounting", label: "Contabilidad", icon: Wallet },
  { id: "commissions", label: "Comisiones", icon: Percent },
  { id: "schedules", label: "Horarios", icon: Settings },
  { id: "barbers", label: "Barberos", icon: Users },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Admin() {
  const { user, loading: authLoading, isAdmin, signIn, signOut } = useAuth();
  const {
    bookings,
    loading: bookingsLoading,
    deleteBooking,
    getBookingsByDate,
  } = useBookings(isAdmin);
  const { schedules, updateSchedule } = useBarberSchedules();
  const { barbers, updateBarber, uploadPhoto, createBarber, deleteBarber } =
    useBarbers();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(bogotaToday());
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [editingNames, setEditingNames] = useState<Record<string, string>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [newBarberName, setNewBarberName] = useState("");
  const [creatingBarber, setCreatingBarber] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const dayBookings = useMemo(
    () => getBookingsByDate(selectedDate),
    [getBookingsByDate, selectedDate],
  );

  const getBarberName = (id: string) =>
    barbers.find((b) => b.id === id)?.name ?? id;
  const getServiceName = (id: string) =>
    SERVICES.find((s) => s.id === id)?.name ?? id;
  const getServicePrice = (id: string) => {
    const s = SERVICES.find((s) => s.id === id);
    return s ? formatPrice(s.price) : "";
  };

  async function handleLogin() {
    setLoginLoading(true);
    const { error } = await signIn(
      demoMode ? "demo@barberia.local" : email.trim(),
      demoMode ? "" : password,
    );
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoginLoading(false);
  }

  async function handleDelete(id: string) {
    try {
      await deleteBooking(id);
      toast({ title: "Reserva eliminada" });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo eliminar",
        variant: "destructive",
      });
    }
  }

  async function handleScheduleToggle(
    barberId: string,
    dayOfWeek: number,
    currentAvailable: boolean,
  ) {
    try {
      await updateSchedule(barberId, dayOfWeek, {
        is_available: !currentAvailable,
      });
      toast({
        title: `${getBarberName(barberId)} - ${DAY_NAMES[dayOfWeek]}`,
        description: !currentAvailable ? "Disponible" : "No disponible",
      });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo actualizar",
        variant: "destructive",
      });
    }
  }

  async function handleTimeChange(
    barberId: string,
    dayOfWeek: number,
    field: "open_time" | "close_time",
    value: string,
  ) {
    try {
      await updateSchedule(barberId, dayOfWeek, { [field]: value });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo actualizar",
        variant: "destructive",
      });
    }
  }

  async function handleSaveName(id: string) {
    const name = editingNames[id]?.trim();
    if (!name) return;
    try {
      await updateBarber(id, { name });
      toast({ title: "Nombre actualizado" });
      setEditingNames((prev) => {
        const c = { ...prev };
        delete c[id];
        return c;
      });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo actualizar",
        variant: "destructive",
      });
    }
  }

  async function handleToggleActive(id: string, current: boolean) {
    try {
      await updateBarber(id, { is_active: !current });
      toast({ title: !current ? "Barbero activado" : "Barbero desactivado" });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo actualizar",
        variant: "destructive",
      });
    }
  }

  async function handlePhotoUpload(id: string, file: File) {
    setUploadingId(id);
    try {
      await uploadPhoto(id, file);
      toast({ title: "Foto actualizada" });
    } catch (e) {
      toast({
        title: "Error",
        description: "No se pudo subir la foto",
        variant: "destructive",
      });
    } finally {
      setUploadingId(null);
    }
  }

  async function handleCreateBarber() {
    const name = newBarberName.trim();
    if (!name) return;
    setCreatingBarber(true);
    try {
      await createBarber(name);
      setNewBarberName("");
      toast({ title: "Barbero agregado", description: name });
    } catch (e: unknown) {
      toast({
        title: "Error",
        description:
          (e instanceof Error ? e.message : null) ?? "No se pudo agregar",
        variant: "destructive",
      });
    } finally {
      setCreatingBarber(false);
    }
  }

  async function handleDeleteBarber(id: string, name: string) {
    if (
      !confirm(
        `¿Eliminar al barbero "${name}"? Esta acción no se puede deshacer.`,
      )
    )
      return;
    try {
      await deleteBarber(id);
      toast({ title: "Barbero eliminado" });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo eliminar",
        variant: "destructive",
      });
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-primary-foreground">Cargando...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <img
            src={logoWhite}
            alt="Logo"
            className="h-16 w-16 object-contain mx-auto mb-6 rounded-full"
          />
          <h1 className="font-display text-2xl font-bold text-primary-foreground mb-6">
            Panel Administrativo
          </h1>
          {user && !isAdmin && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/20 text-primary-foreground text-sm">
              No tienes permisos de administrador.
            </div>
          )}
          {demoMode ? (
            <div className="space-y-4">
              <p className="text-primary-foreground/70 text-sm">
                Puedes explorar reservas, caja, inventario, contabilidad,
                comisiones y horarios. Los datos de prueba se guardan en este
                equipo.
              </p>
              <button
                onClick={handleLogin}
                disabled={loginLoading}
                className="w-full py-3 bg-primary-foreground text-primary font-semibold rounded-lg disabled:opacity-50"
              >
                {loginLoading ? "Ingresando..." : "Entrar a la demostración"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                placeholder="Correo del administrador"
                className="w-full px-4 py-3 bg-primary-foreground/10 border border-primary-foreground/20 rounded-lg text-primary-foreground"
              />
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-foreground/40"
                />
                <input
                  autoComplete="current-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLogin();
                  }}
                  placeholder="Contraseña"
                  className="w-full pl-10 pr-4 py-3 bg-primary-foreground/10 border border-primary-foreground/20 rounded-lg text-primary-foreground placeholder:text-primary-foreground/30 focus:outline-none focus:border-primary-foreground/50"
                />
              </div>
              <button
                onClick={handleLogin}
                disabled={loginLoading}
                className="w-full py-3 bg-primary-foreground text-primary font-semibold rounded-lg uppercase tracking-widest text-sm hover:bg-primary-foreground/90 transition-colors disabled:opacity-50"
              >
                {loginLoading ? "Ingresando..." : "Ingresar"}
              </button>
            </div>
          )}
          <a
            href="/"
            className="text-primary-foreground/40 text-sm mt-6 inline-block hover:text-primary-foreground/60"
          >
            ← Volver al sitio
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={logoWhite}
            alt="Logo"
            className="h-8 w-8 object-contain rounded-full"
          />
          <h1 className="font-display text-lg font-bold text-primary-foreground">
            Admin Panel
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-primary-foreground/60 text-xs hidden sm:inline">
            {user.email}
          </span>
          <a
            href="/"
            className="text-primary-foreground/60 text-sm hover:text-primary-foreground"
          >
            Ver sitio
          </a>
          <button
            onClick={signOut}
            className="text-primary-foreground/60 hover:text-primary-foreground"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="border-b border-border">
        <div className="container mx-auto px-4 flex gap-6 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon size={16} className="inline mr-2" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {activeTab === "notifications" && <NotificationsTab />}
        {activeTab === "dashboard" && <DashboardTab />}
        {activeTab === "pos" && <POSTab />}
        {activeTab === "inventory" && <InventoryTab />}
        {activeTab === "accounting" && <AccountingTab />}
        {activeTab === "commissions" && <CommissionsTab />}

        {activeTab === "bookings" && (
          <>
            <div className="flex items-center gap-4 mb-8">
              <Calendar size={20} className="text-muted-foreground" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:border-foreground"
              />
              <span className="text-muted-foreground text-sm">
                {dayBookings.length} reserva(s)
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {barbers.map((barber) => {
                const count = dayBookings.filter(
                  (b) => b.barber_id === barber.id,
                ).length;
                return (
                  <div
                    key={barber.id}
                    className="bg-card p-4 rounded-lg border border-border"
                  >
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      {barber.name}
                    </p>
                    <p className="text-2xl font-display font-bold text-foreground mt-1">
                      {count}
                    </p>
                    <p className="text-xs text-muted-foreground">reservas</p>
                  </div>
                );
              })}
            </div>

            {bookingsLoading ? (
              <div className="text-center py-20 text-muted-foreground">
                Cargando reservas...
              </div>
            ) : dayBookings.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Calendar size={40} className="mx-auto mb-4 opacity-30" />
                <p>No hay reservas para esta fecha</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground uppercase tracking-wider text-xs">
                        Hora
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground uppercase tracking-wider text-xs">
                        Duración
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground uppercase tracking-wider text-xs">
                        Cliente
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground uppercase tracking-wider text-xs">
                        Teléfono
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground uppercase tracking-wider text-xs">
                        Barbero
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground uppercase tracking-wider text-xs">
                        Servicio
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground uppercase tracking-wider text-xs">
                        Precio
                      </th>
                      <th className="py-3 px-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayBookings
                      .sort((a, b) => a.time.localeCompare(b.time))
                      .map((booking) => (
                        <tr
                          key={booking.id}
                          className="border-b border-border/50 hover:bg-muted/50"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-foreground">
                            {booking.time}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {booking.duration_minutes ?? 30} min
                          </td>
                          <td className="py-3 px-4 text-foreground">
                            {booking.client_name}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {booking.client_phone}
                          </td>
                          <td className="py-3 px-4 text-foreground">
                            {getBarberName(booking.barber_id)}
                          </td>
                          <td className="py-3 px-4 text-foreground">
                            {getServiceName(booking.service_id)}
                          </td>
                          <td className="py-3 px-4 font-display font-bold text-foreground">
                            {getServicePrice(booking.service_id)}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleDelete(booking.id)}
                              className="text-destructive hover:text-destructive/80"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {dayBookings.length > 0 && (
              <div className="mt-6 text-right">
                <p className="text-muted-foreground text-sm">
                  Total estimado del día:
                </p>
                <p className="font-display text-2xl font-bold text-foreground">
                  {formatPrice(
                    dayBookings.reduce((sum, b) => {
                      const s = SERVICES.find((s) => s.id === b.service_id);
                      return sum + (s?.price ?? 0);
                    }, 0),
                  )}
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === "schedules" && (
          <div className="space-y-8">
            <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              <Clock size={20} /> Gestión de Horarios por Barbero
            </h2>
            {barbers.map((barber) => (
              <div
                key={barber.id}
                className="bg-card border border-border rounded-lg p-6"
              >
                <h3 className="font-display text-lg font-bold text-foreground mb-4">
                  {barber.name}
                </h3>
                <div className="grid gap-3">
                  {DAY_NAMES.map((dayName, dayIndex) => {
                    const schedule = schedules.find(
                      (s) =>
                        s.barber_id === barber.id && s.day_of_week === dayIndex,
                    );
                    const isAvailable = schedule?.is_available ?? true;
                    return (
                      <div
                        key={dayIndex}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          isAvailable
                            ? "border-border bg-background"
                            : "border-border/50 bg-muted/50 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() =>
                              handleScheduleToggle(
                                barber.id,
                                dayIndex,
                                isAvailable,
                              )
                            }
                            className={`w-10 h-6 rounded-full transition-colors relative ${
                              isAvailable
                                ? "bg-foreground"
                                : "bg-muted-foreground/30"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-background absolute top-1 transition-transform ${
                                isAvailable ? "translate-x-5" : "translate-x-1"
                              }`}
                            />
                          </button>
                          <span className="text-sm font-medium text-foreground w-24">
                            {dayName}
                          </span>
                        </div>
                        {isAvailable && (
                          <div className="flex items-center gap-2 text-sm">
                            <input
                              type="time"
                              value={schedule?.open_time ?? "09:00"}
                              onChange={(e) =>
                                handleTimeChange(
                                  barber.id,
                                  dayIndex,
                                  "open_time",
                                  e.target.value,
                                )
                              }
                              className="px-2 py-1 border border-border rounded bg-background text-foreground text-xs"
                            />
                            <span className="text-muted-foreground">a</span>
                            <input
                              type="time"
                              value={schedule?.close_time ?? "19:30"}
                              onChange={(e) =>
                                handleTimeChange(
                                  barber.id,
                                  dayIndex,
                                  "close_time",
                                  e.target.value,
                                )
                              }
                              className="px-2 py-1 border border-border rounded bg-background text-foreground text-xs"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "barbers" && (
          <div className="space-y-6">
            <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              <Users size={20} /> Gestión de Barberos
            </h2>
            <p className="text-sm text-muted-foreground">
              Edita el nombre, sube una foto, activa/desactiva o agrega nuevos
              barberos para reemplazar a quien no trabaje algún día. Los cambios
              se reflejan en el sitio en tiempo real.
            </p>

            <div className="bg-card border border-border rounded-lg p-4 flex flex-col sm:flex-row gap-2 sm:items-center">
              <label className="text-xs uppercase tracking-wider text-muted-foreground sm:w-40">
                Agregar barbero
              </label>
              <input
                type="text"
                value={newBarberName}
                onChange={(e) => setNewBarberName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateBarber();
                }}
                placeholder="Nombre del barbero"
                className="flex-1 px-3 py-2 border border-border rounded bg-background text-foreground text-sm focus:outline-none focus:border-foreground"
              />
              <button
                onClick={handleCreateBarber}
                disabled={creatingBarber || !newBarberName.trim()}
                className="px-4 py-2 bg-foreground text-background text-xs font-semibold uppercase tracking-wider rounded hover:bg-foreground/90 transition-colors disabled:opacity-30 flex items-center justify-center gap-1"
              >
                <Plus size={14} /> {creatingBarber ? "Agregando..." : "Agregar"}
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {barbers.map((barber) => {
                const nameValue = editingNames[barber.id] ?? barber.name;
                const isUploading = uploadingId === barber.id;
                return (
                  <div
                    key={barber.id}
                    className="bg-card border border-border rounded-lg p-5 flex gap-4"
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-24 h-24 hexagon-clip overflow-hidden bg-muted">
                        {barber.photo ? (
                          <img
                            src={barber.photo}
                            alt={barber.name}
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            Sin foto
                          </div>
                        )}
                      </div>
                      <input
                        ref={(el) => {
                          fileInputRefs.current[barber.id] = el;
                        }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handlePhotoUpload(barber.id, f);
                          e.target.value = "";
                        }}
                      />
                      <button
                        onClick={() =>
                          fileInputRefs.current[barber.id]?.click()
                        }
                        disabled={isUploading}
                        className="mt-2 w-full flex items-center justify-center gap-1 text-xs px-2 py-1 border border-border rounded hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        <Upload size={12} />{" "}
                        {isUploading ? "Subiendo..." : "Foto"}
                      </button>
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        Puesto {barber.position}
                      </p>
                      <input
                        type="text"
                        value={nameValue}
                        onChange={(e) =>
                          setEditingNames((prev) => ({
                            ...prev,
                            [barber.id]: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-border rounded bg-background text-foreground text-sm focus:outline-none focus:border-foreground"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveName(barber.id)}
                          disabled={
                            !editingNames[barber.id] ||
                            editingNames[barber.id] === barber.name
                          }
                          className="px-3 py-1.5 bg-foreground text-background text-xs rounded font-semibold uppercase tracking-wider hover:bg-foreground/90 transition-colors disabled:opacity-30"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() =>
                            handleToggleActive(
                              barber.id,
                              barber.is_active ?? true,
                            )
                          }
                          className={`px-3 py-1.5 border text-xs rounded transition-colors ${
                            barber.is_active === false
                              ? "border-destructive text-destructive"
                              : "border-border text-foreground hover:bg-muted"
                          }`}
                        >
                          {barber.is_active === false
                            ? "Activar"
                            : "Desactivar"}
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteBarber(barber.id, barber.name)
                          }
                          className="ml-auto px-2 py-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors"
                          title="Eliminar barbero"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
