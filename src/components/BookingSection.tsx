import { demoMode } from "@/integrations/supabase/client";
import { useState, useMemo, useRef } from "react";
import { format, addDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { SERVICES, formatPrice } from "@/data/barbershop";
import { useBookings } from "@/hooks/useBookings";
import { useBarberSchedules } from "@/hooks/useBarberSchedules";
import { useBarbers } from "@/hooks/useBarbers";
import {
  Calendar,
  Check,
  Clock,
  Scissors,
  User,
  Phone,
  MessageSquare,
} from "lucide-react";
import { bogotaToday, normalizePhone, slotsForSchedule } from "@/lib/booking";
import { useToast } from "@/hooks/use-toast";

export default function BookingSection() {
  const {
    addBooking,
    getOccupiedSlotsForBarber,
    loading: availabilityLoading,
    availabilityError,
  } = useBookings();
  const { isBarberAvailable, getBarberCloseTime, getBarberOpenTime } =
    useBarberSchedules();
  const { barbers: BARBERS } = useBarbers(true);
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState("");
  const [selectedBarber, setSelectedBarber] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [consent, setConsent] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    id: string;
    date: string;
    time: string;
  } | null>(null);
  const pendingRequest = useRef<{ fingerprint: string; id: string } | null>(
    null,
  );

  const dates = useMemo(() => {
    const today = startOfDay(new Date(bogotaToday() + "T12:00:00"));
    return Array.from({ length: 14 }, (_, i) => {
      const d = addDays(today, i);
      return {
        value: format(d, "yyyy-MM-dd"),
        label: format(d, "EEE d MMM", { locale: es }),
        dayOfWeek: d.getDay(),
      };
    });
  }, []);

  const service = SERVICES.find((s) => s.id === selectedService);
  const barber = BARBERS.find((b) => b.id === selectedBarber);
  const serviceDuration = service?.duration ?? 30;

  const availableDates = useMemo(() => {
    if (!selectedBarber) return dates;
    return dates.filter((d) => isBarberAvailable(selectedBarber, d.dayOfWeek));
  }, [dates, selectedBarber, isBarberAvailable]);

  const availableSlots = useMemo(() => {
    if (!selectedDate || !selectedBarber) return [];
    const dateObj = new Date(selectedDate + "T00:00:00");
    const dayOfWeek = dateObj.getDay();
    if (
      availabilityLoading ||
      availabilityError ||
      !isBarberAvailable(selectedBarber, dayOfWeek)
    )
      return [];
    return slotsForSchedule(
      selectedDate,
      getBarberOpenTime(selectedBarber, dayOfWeek),
      getBarberCloseTime(selectedBarber, dayOfWeek),
      serviceDuration,
      getOccupiedSlotsForBarber(selectedBarber, selectedDate),
    );
  }, [
    selectedDate,
    selectedBarber,
    getBarberCloseTime,
    getBarberOpenTime,
    getOccupiedSlotsForBarber,
    serviceDuration,
    availabilityLoading,
    availabilityError,
    isBarberAvailable,
  ]);

  async function handleSubmit() {
    if (submitting) return;
    if (clientName.trim().length < 2 || !consent) {
      toast({
        title: "Revisa tus datos",
        description:
          "Escribe tu nombre y autoriza la confirmación por WhatsApp.",
        variant: "destructive",
      });
      return;
    }
    let phone: string;
    try {
      phone = normalizePhone(clientPhone);
    } catch {
      toast({
        title: "WhatsApp inválido",
        description:
          "Escribe un celular válido; para otros países incluye el código de país.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        client_name: clientName.trim(),
        client_phone: phone,
        barber_id: selectedBarber,
        service_id: selectedService,
        date: selectedDate,
        time: selectedTime,
        whatsapp_consent: true as const,
      };
      const fingerprint = JSON.stringify(body);
      if (pendingRequest.current?.fingerprint !== fingerprint)
        pendingRequest.current = { fingerprint, id: crypto.randomUUID() };
      const saved = await addBooking({
        ...body,
        request_id: pendingRequest.current.id,
      });
      setConfirmation(saved);
      pendingRequest.current = null;
      toast({
        title: "¡Reserva guardada!",
        description: demoMode
          ? "Reserva de prueba guardada en este equipo. No se enviaron mensajes."
          : "La confirmación por WhatsApp quedó programada.",
      });
    } catch (error) {
      toast({
        title: "No se pudo confirmar",
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      id="reservar"
      className="relative py-24 sm:py-32 bg-background overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-px hairline" />
      <div className="absolute left-1/2 -translate-x-1/2 top-10 w-[560px] h-[560px] glow-gold rounded-full" />
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-12 reveal-on-scroll">
          <div className="chip text-foreground/80 mb-6">
            <span className="chip-dot" />
            <span className="uppercase">Agenda tu cita</span>
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-foreground leading-[1.05]">
            Reserva en
            <span className="text-foreground/40"> 4 pasos.</span>
          </h2>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8 max-w-md mx-auto reveal-on-scroll">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  step >= s
                    ? "btn-gold"
                    : "bg-foreground/5 border border-border text-muted-foreground"
                }`}
              >
                {step > s ? <Check size={14} /> : s}
              </div>
              {s < 4 && (
                <div
                  className={`w-8 h-px transition-colors duration-500 ${
                    step > s ? "bg-gold" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="max-w-xl mx-auto reveal-on-scroll">
          <div className="surface-card rounded-3xl p-6 sm:p-9 shadow-premium">
            {confirmation && (
              <div role="status" className="space-y-4 text-center py-6">
                <Check className="mx-auto text-gold" size={36} />
                <h3 className="text-2xl font-display">
                  ¡Tu reserva está guardada!
                </h3>
                <p>
                  {confirmation.date} a las {confirmation.time}
                </p>
                <p className="text-sm text-muted-foreground">
                  {demoMode
                    ? "Esta reserva de prueba está guardada en este equipo. Los dos avisos de WhatsApp son simulados."
                    : "Te enviaremos la confirmación por WhatsApp al número indicado."}
                </p>
                <p className="text-xs break-all text-muted-foreground">
                  Referencia: {confirmation.id}
                </p>
                <button
                  className="btn-pill btn-gold px-5 py-3"
                  onClick={() => {
                    setConfirmation(null);
                    setStep(1);
                    setSelectedService("");
                    setSelectedBarber("");
                    setSelectedDate("");
                    setSelectedTime("");
                    setClientName("");
                    setClientPhone("");
                    setConsent(false);
                  }}
                >
                  Hacer otra reserva
                </button>
              </div>
            )}
            {!confirmation && step === 1 && (
              <div className="space-y-3 animate-fade-in">
                <h3 className="font-display text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2 mb-6">
                  <Scissors size={20} className="text-gold" /> Elige tu servicio
                </h3>
                {SERVICES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedService(s.id);
                      setStep(2);
                    }}
                    className={`w-full flex items-center justify-between p-4 border rounded-2xl transition-all duration-300 text-left hover:-translate-y-0.5 hover:shadow-premium ${
                      selectedService === s.id
                        ? "border-gold bg-gold/10"
                        : "border-border hover:border-gold/50"
                    }`}
                  >
                    <span className="font-medium text-foreground">
                      {s.name}
                    </span>
                    <span className="font-display font-bold text-foreground">
                      {formatPrice(s.price)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {!confirmation && step === 2 && (
              <div className="space-y-3 animate-fade-in">
                <h3 className="font-display text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2 mb-6">
                  <User size={20} className="text-gold" /> Elige tu barbero
                </h3>
                {BARBERS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setSelectedBarber(b.id);
                      setStep(3);
                    }}
                    className={`w-full flex items-center gap-4 p-4 border rounded-2xl transition-all duration-300 text-left hover:-translate-y-0.5 hover:shadow-premium ${
                      selectedBarber === b.id
                        ? "border-gold bg-gold/10"
                        : "border-border hover:border-gold/50"
                    }`}
                  >
                    <div className="relative w-14 h-14 flex-shrink-0">
                      <div className="absolute -inset-0.5 hexagon-clip bg-gradient-to-br from-gold via-gold/30 to-gold/80" />
                      <div className="relative w-full h-full hexagon-clip overflow-hidden bg-primary">
                        <img
                          src={b.photo}
                          alt={b.name}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{b.name}</p>
                      <p className="text-xs text-muted-foreground tracking-wider uppercase">
                        Puesto {b.position}
                      </p>
                    </div>
                  </button>
                ))}
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-muted-foreground hover:text-gold mt-4 transition-colors"
                >
                  ← Volver
                </button>
              </div>
            )}

            {!confirmation && step === 3 && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="font-display text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2 mb-4">
                  <Calendar size={20} className="text-gold" /> Fecha y hora
                </h3>

                <div>
                  <p className="text-sm font-medium text-foreground mb-3 uppercase tracking-wider">
                    Selecciona fecha:
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {availableDates.map((d) => (
                      <button
                        key={d.value}
                        onClick={() => {
                          setSelectedDate(d.value);
                          setSelectedTime("");
                        }}
                        className={`p-2.5 text-xs border rounded-lg text-center transition-all duration-200 capitalize ${
                          selectedDate === d.value
                            ? "border-gold bg-gold text-gold-foreground font-semibold"
                            : "border-border hover:border-gold/50 text-foreground hover:bg-foreground/5"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  {availableDates.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Este barbero no tiene días disponibles.
                    </p>
                  )}
                </div>

                {availabilityError && (
                  <p role="alert" className="text-sm text-destructive">
                    No se pudo consultar la disponibilidad. Revisa tu conexión y
                    vuelve a intentarlo.
                  </p>
                )}
                {selectedDate && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-1 uppercase tracking-wider">
                      <Clock size={14} className="text-gold" /> Selecciona hora:
                    </p>
                    {availableSlots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {availabilityLoading
                          ? "Consultando disponibilidad..."
                          : "No hay horarios disponibles para esta fecha."}
                      </p>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                        {availableSlots.map((t) => (
                          <button
                            key={t}
                            onClick={() => {
                              setSelectedTime(t);
                              setStep(4);
                            }}
                            className={`p-2.5 text-sm border rounded-lg transition-all duration-200 ${
                              selectedTime === t
                                ? "border-gold bg-gold text-gold-foreground font-semibold"
                                : "border-border hover:border-gold/50 text-foreground hover:bg-foreground/5"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => setStep(2)}
                  className="text-sm text-muted-foreground hover:text-gold transition-colors"
                >
                  ← Volver
                </button>
              </div>
            )}

            {!confirmation && step === 4 && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="font-display text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2 mb-4">
                  <MessageSquare size={20} className="text-gold" /> Tus datos
                </h3>

                <div className="relative bg-gradient-dark text-primary-foreground p-5 rounded-2xl space-y-2 text-sm border border-gold/20 shadow-premium">
                  <div className="absolute top-0 left-6 right-6 h-px gold-divider" />
                  <p>
                    <strong className="text-gold font-medium">Servicio:</strong>{" "}
                    {service?.name} —{" "}
                    {service ? formatPrice(service.price) : ""}
                  </p>
                  <p>
                    <strong className="text-gold font-medium">Barbero:</strong>{" "}
                    {barber?.name}
                  </p>
                  <p>
                    <strong className="text-gold font-medium">Fecha:</strong>{" "}
                    {selectedDate}
                  </p>
                  <p>
                    <strong className="text-gold font-medium">Hora:</strong>{" "}
                    {selectedTime}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-2 uppercase tracking-wider">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
                      maxLength={100}
                      autoComplete="name"
                      placeholder="Tu nombre"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-2 uppercase tracking-wider">
                      Teléfono / WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
                      maxLength={22}
                      autoComplete="tel"
                      placeholder="300 123 4567 o +código de país"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-3 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1"
                  />
                  Autorizo a Barbería Edwin Zambrano a guardar mis datos para
                  gestionar esta cita y enviarme su confirmación por WhatsApp.
                </label>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !consent}
                  className="btn-pill btn-gold w-full py-4 text-sm disabled:opacity-50"
                >
                  <Phone size={16} />
                  {submitting ? "Guardando..." : "Confirmar reserva"}
                </button>

                <button
                  onClick={() => setStep(3)}
                  className="text-sm text-muted-foreground hover:text-gold transition-colors"
                >
                  ← Volver
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
