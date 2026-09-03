import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatDate, formatINR, todayISO, next7Days } from '../../lib/utils';
import { Button, Card, Avatar, Input, Textarea, Badge } from '../../components/ui';
import { CheckCircle2, Calendar, Clock, User, UserCheck, Stethoscope, ChevronRight, ChevronLeft } from 'lucide-react';

const STEPS = [
  { id: 1, name: 'Service' },
  { id: 2, name: 'Dentist' },
  { id: 3, name: 'Date' },
  { id: 4, name: 'Time' },
  { id: 5, name: 'Details' },
  { id: 6, name: 'Confirm' }
];

export default function Book() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [slots, setSlots] = useState([]);

  const [selectedService, setSelectedService] = useState(null); // { name, price, desc }
  const [selectedDentist, setSelectedDentist] = useState(null); // { id, name } or null (No Preference)
  const [dentistChoiceMade, setDentistChoiceMade] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  const [stepError, setStepError] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(null); // holds returned appointment data

  // Load Settings & Dentists
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      api.get('/settings').catch(() => null),
      api.get('/dentists').catch(() => [])
    ]).then(([settingsData, dentistsData]) => {
      if (!isMounted) return;
      if (settingsData?.services) {
        setServices(settingsData.services);
        // Check for ?service= param
        const paramService = searchParams.get('service');
        if (paramService) {
          const matched = settingsData.services.find(
            (s) => s.name.toLowerCase() === paramService.toLowerCase()
          );
          if (matched) setSelectedService(matched);
        }
      }
      if (Array.isArray(dentistsData)) {
        setDentists(dentistsData);
      }
    });
    return () => { isMounted = false; };
  }, [searchParams]);

  // Load Time Slots when Date changes (Step 4)
  useEffect(() => {
    if (!selectedDate) {
      setSlots([]);
      return;
    }
    let isMounted = true;
    setLoadingSlots(true);
    const query = `/slots?date=${selectedDate}${selectedDentist?.id ? `&dentistId=${selectedDentist.id}` : ''}`;
    api.get(query)
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setSlots(data);
        }
      })
      .catch(() => {
        if (isMounted) setSlots([]);
      })
      .finally(() => {
        if (isMounted) setLoadingSlots(false);
      });
    return () => { isMounted = false; };
  }, [selectedDate, selectedDentist]);

  // Handlers for Step Next / Back
  const handleNext = () => {
    setStepError('');

    if (step === 1) {
      if (!selectedService) {
        setStepError('Please select a service to continue.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!dentistChoiceMade) {
        setStepError('Please select a dentist or No Preference.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!selectedDate) {
        setStepError('Please select a date to continue');
        return;
      }
      setStep(4);
    } else if (step === 4) {
      if (!selectedTime) {
        setStepError('Please select an available time slot.');
        return;
      }
      setStep(5);
    } else if (step === 5) {
      if (!name.trim()) {
        setStepError('Please enter your full name.');
        return;
      }
      const digits = phone.replace(/\D/g, '');
      if (digits.length !== 10) {
        setStepError('Please enter a valid 10-digit phone number.');
        return;
      }
      setStep(6);
    }
  };

  const handleBack = () => {
    setStepError('');
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleConfirmBooking = async () => {
    setStepError('');
    try {
      setSubmitting(true);
      const res = await api.post('/bookings', {
        service: selectedService.name,
        dentistId: selectedDentist?.id || null,
        date: selectedDate,
        time: selectedTime,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        notes: notes.trim() || undefined
      });
      setBookingConfirmed(res);
    } catch (err) {
      setStepError(err.message || 'Failed to submit booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedDentist(null);
    setDentistChoiceMade(false);
    setSelectedDate('');
    setSelectedTime('');
    setName('');
    setPhone('');
    setEmail('');
    setNotes('');
    setStepError('');
    setBookingConfirmed(null);
  };

  // SUCCESS SCREEN
  if (bookingConfirmed) {
    const dentistDisplayName = selectedDentist?.name || 'No Preference';
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center space-y-6">
        <Card className="p-8 space-y-6 flex flex-col items-center shadow-lg">
          <div className="rounded-full bg-primary/10 p-4 text-primary">
            <CheckCircle2 className="h-16 w-16" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Booking Confirmed!</h1>
            <p className="text-sm text-muted-foreground">
              We will send you a reminder. See you soon!
            </p>
          </div>

          <div className="w-full rounded-lg bg-muted/40 p-6 text-left space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Service</span>
              <span className="font-semibold">{selectedService?.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Dentist</span>
              <span className="font-semibold">{dentistDisplayName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Date</span>
              <span className="font-semibold">{formatDate(selectedDate)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Time</span>
              <span className="font-semibold">{selectedTime}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Patient</span>
              <span className="font-semibold">{name}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-semibold">{phone}</span>
            </div>
          </div>

          <Button size="lg" className="w-full" onClick={handleReset}>
            Book Another Appointment
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold">Book an Appointment</h1>
        <p className="text-sm text-muted-foreground">
          Follow the simple steps below to schedule your visit with SmileCraft.
        </p>
      </div>

      {/* Progress Dots / Steps Header */}
      <div className="flex items-center justify-between px-2 max-w-2xl mx-auto">
        {STEPS.map((s, idx) => {
          const isCompleted = step > s.id;
          const isCurrent = step === s.id;
          return (
            <React.Fragment key={s.id}>
              <div className="flex flex-col items-center space-y-1">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isCompleted || isCurrent
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {s.id}
                </div>
                <span
                  className={`text-xs hidden sm:inline font-medium ${
                    isCurrent ? 'text-foreground font-semibold' : 'text-muted-foreground'
                  }`}
                >
                  {s.name}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-1 rounded transition-colors ${
                    step > s.id ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Error Notice */}
      {stepError && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-600 text-center font-medium">
          {stepError}
        </div>
      )}

      {/* STEP CONTENTS */}
      <Card className="p-6">
        {/* STEP 1: SERVICE */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Step 1: Select a Service</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {services.map((srv, idx) => {
                const isSelected = selectedService?.name === srv.name;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedService(srv);
                      setStepError('');
                    }}
                    className={`cursor-pointer rounded-lg border p-4 transition-all hover:border-primary/50 ${
                      isSelected ? 'ring-2 ring-primary border-primary bg-primary/5' : 'bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-base">{srv.name}</h3>
                      <span className="font-semibold text-sm text-primary">{formatINR(srv.price)}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{srv.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: DENTIST */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Step 2: Choose a Dentist</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* No Preference Option */}
              <div
                onClick={() => {
                  setSelectedDentist(null);
                  setDentistChoiceMade(true);
                  setStepError('');
                }}
                className={`cursor-pointer rounded-lg border p-4 flex items-center gap-4 transition-all hover:border-primary/50 ${
                  dentistChoiceMade && selectedDentist === null
                    ? 'ring-2 ring-primary border-primary bg-primary/5'
                    : 'bg-card'
                }`}
              >
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                  <UserCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base">No Preference</h3>
                  <p className="text-xs text-muted-foreground">Any available doctor for your slot</p>
                </div>
              </div>

              {/* Dentist Cards */}
              {dentists.map((d) => {
                const isSelected = selectedDentist?.id === d.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => {
                      setSelectedDentist(d);
                      setDentistChoiceMade(true);
                      setStepError('');
                    }}
                    className={`cursor-pointer rounded-lg border p-4 flex items-center gap-4 transition-all hover:border-primary/50 ${
                      isSelected ? 'ring-2 ring-primary border-primary bg-primary/5' : 'bg-card'
                    }`}
                  >
                    <Avatar name={d.name} className="h-12 w-12 text-base shrink-0" />
                    <div>
                      <h3 className="font-bold text-base">{d.name}</h3>
                      <p className="text-xs text-primary font-medium">{d.specialty}</p>
                      <p className="text-xs text-muted-foreground">{d.days}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: DATE */}
        {step === 3 && (
          <div className="space-y-4 max-w-md mx-auto py-2">
            <h2 className="text-lg font-bold text-center">Step 3: Select Date</h2>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quick Pick</label>
              <div className="grid grid-cols-4 gap-2">
                {next7Days().map((d) => {
                  const isSelected = selectedDate === d.iso;
                  return (
                    <button
                      key={d.iso}
                      type="button"
                      onClick={() => {
                        setSelectedDate(d.iso);
                        setSelectedTime('');
                        setStepError('');
                      }}
                      className={`rounded-lg border px-2 py-2 text-center transition-all hover:border-primary/50 ${
                        isSelected ? 'ring-2 ring-primary border-primary bg-primary/5' : 'bg-card'
                      }`}
                    >
                      <span className="block text-[11px] font-medium text-muted-foreground">
                        {d.dayName}
                      </span>
                      <span className="block text-sm font-bold">{d.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Or pick from the calendar</label>
              <Input
                type="date"
                min={todayISO()}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedTime('');
                  setStepError('');
                }}
              />
            </div>
            {selectedDate && (
              <p className="text-center text-sm font-semibold text-primary">
                Selected: {formatDate(selectedDate)}
              </p>
            )}
          </div>
        )}

        {/* STEP 4: TIME */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Step 4: Select Time Slot</h2>
              <span className="text-xs text-muted-foreground">{formatDate(selectedDate)}</span>
            </div>

            {loadingSlots ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Loading slots...</div>
            ) : slots.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No slots available for this date. Please go back and choose another date.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {slots.map((s, idx) => {
                  const isSelected = selectedTime === s.time;
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!s.available}
                      onClick={() => {
                        setSelectedTime(s.time);
                        setStepError('');
                      }}
                      className={`py-2 px-3 rounded-md border text-sm font-medium transition-all ${
                        !s.available
                          ? 'opacity-50 border-muted bg-muted/30 cursor-not-allowed text-muted-foreground line-through'
                          : isSelected
                          ? 'ring-2 ring-primary border-primary bg-primary text-primary-foreground font-bold'
                          : 'hover:border-primary/60 bg-card text-foreground'
                      }`}
                    >
                      {s.time}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 5: DETAILS */}
        {step === 5 && (
          <div className="space-y-4 max-w-md mx-auto">
            <h2 className="text-lg font-bold text-center">Step 5: Patient Details</h2>

            <div className="space-y-1">
              <label className="text-sm font-medium">Full Name *</label>
              <Input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setStepError('');
                }}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Phone Number (10 digits) *</label>
              <Input
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setStepError('');
                }}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Email Address (Optional)</label>
              <Input
                type="email"
                placeholder="patient@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Notes / Symptoms (Optional)</label>
              <Textarea
                placeholder="Any current symptoms or special requests..."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* STEP 6: CONFIRM */}
        {step === 6 && (
          <div className="space-y-6 max-w-lg mx-auto">
            <h2 className="text-lg font-bold text-center">Step 6: Review & Confirm</h2>

            <div className="rounded-lg border bg-muted/20 p-5 space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Service</span>
                <span className="font-semibold">{selectedService?.name} ({formatINR(selectedService?.price)})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Dentist</span>
                <span className="font-semibold">{selectedDentist?.name || 'No Preference'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Date</span>
                <span className="font-semibold">{formatDate(selectedDate)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Time Slot</span>
                <span className="font-semibold">{selectedTime}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Patient Name</span>
                <span className="font-semibold">{name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-semibold">{phone}</span>
              </div>
              {email && (
                <div className="flex justify-between py-1 border-b border-border/60">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-semibold">{email}</span>
                </div>
              )}
              {notes && (
                <div className="py-1">
                  <span className="text-muted-foreground block text-xs">Notes:</span>
                  <span className="font-medium text-xs">{notes}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Wizard Navigation Footer */}
        <div className="mt-8 flex items-center justify-between border-t border-border/60 pt-4">
          {step > 1 ? (
            <Button variant="outline" onClick={handleBack} disabled={submitting}>
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          ) : (
            <div />
          )}

          {step < 6 ? (
            <Button onClick={handleNext}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleConfirmBooking} disabled={submitting}>
              {submitting ? 'Confirming...' : 'Confirm Booking'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
