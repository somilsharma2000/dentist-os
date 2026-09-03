import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatINR } from '../../lib/utils';
import { Button, Card, Avatar, StarRating } from '../../components/ui';
import { Smile, ShieldCheck, Sparkles, Calendar, ArrowRight, Star, HeartPulse } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      api.get('/settings').catch(() => null),
      api.get('/reviews').catch(() => [])
    ]).then(([settingsData, reviewsData]) => {
      if (isMounted) {
        if (settingsData) setSettings(settingsData);
        if (Array.isArray(reviewsData)) setReviews(reviewsData);
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, []);

  const heroTitle = settings?.heroTitle || 'Your Smile, Our Priority';
  const heroSubtitle = settings?.heroSubtitle || 'Comprehensive, comfortable, and modern dental care tailored for your whole family in Bengaluru.';
  const services = settings?.services || [];

  const topReviews = reviews
    .filter((r) => r.status === 'published')
    .slice(0, 3);

  const whyChooseUs = [
    {
      icon: Smile,
      title: 'Painless Treatments',
      desc: 'Gentle procedures designed for maximum comfort with modern technique and care.'
    },
    {
      icon: ShieldCheck,
      title: 'Sterilization-First',
      desc: 'Hospital-grade hygiene standards and 100% autoclaved tools for your safety.'
    },
    {
      icon: Sparkles,
      title: 'Transparent Pricing',
      desc: 'Upfront prices, honest recommendations, and zero hidden charges ever.'
    },
    {
      icon: Calendar,
      title: 'Easy Online Booking',
      desc: 'Select your dentist and choose your slot in under a minute.'
    }
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10 space-y-12 md:space-y-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-primary/10 via-primary/5 to-transparent px-6 py-12 md:py-20 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
            <HeartPulse className="h-4 w-4" />
            SmileCraft Dental Clinic • Bengaluru
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl leading-tight">
            {heroTitle}
          </h1>
          <p className="text-base text-muted-foreground md:text-lg">
            {heroSubtitle}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Button size="lg" onClick={() => navigate('/book')}>
              Book Now
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/services')}>
              Explore Services
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="grid grid-cols-2 gap-4 border-y border-border/60 py-8 md:grid-cols-4 text-center">
        <div className="p-2">
          <p className="text-2xl font-bold md:text-3xl text-primary flex items-center justify-center gap-1">
            4.7<Star className="h-5 w-5 fill-amber-400 text-amber-400 inline" />
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Google Rating</p>
        </div>
        <div className="p-2">
          <p className="text-2xl font-bold md:text-3xl text-primary">10k+</p>
          <p className="mt-1 text-sm text-muted-foreground">Happy Smiles</p>
        </div>
        <div className="p-2">
          <p className="text-2xl font-bold md:text-3xl text-primary">9+</p>
          <p className="mt-1 text-sm text-muted-foreground">Services</p>
        </div>
        <div className="p-2">
          <p className="text-2xl font-bold md:text-3xl text-primary">4</p>
          <p className="mt-1 text-sm text-muted-foreground">Expert Dentists</p>
        </div>
      </section>

      {/* Services Preview */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold">Our Featured Services</h2>
          <p className="text-sm text-muted-foreground">Comprehensive dental treatments delivered with precision and care.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.slice(0, 6).map((service, index) => (
            <Card key={index} className="p-6 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-lg">{service.name}</h3>
                  <span className="text-sm font-semibold text-primary">{formatINR(service.price)}</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">{service.desc}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => navigate(`/book?service=${encodeURIComponent(service.name)}`)}
              >
                Book now
              </Button>
            </Card>
          ))}
        </div>
        <div className="text-center pt-2">
          <Button variant="ghost" onClick={() => navigate('/services')}>
            View All Services <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold">Why Choose Us</h2>
          <p className="text-sm text-muted-foreground">We prioritize your health, comfort, and peace of mind.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {whyChooseUs.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Card key={idx} className="p-6 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-base">{item.title}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Testimonials */}
      {topReviews.length > 0 && (
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold">What Our Patients Say</h2>
            <p className="text-sm text-muted-foreground">Real reviews from our valued patients.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {topReviews.map((rev) => (
              <Card key={rev.id} className="p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={rev.name} />
                    <div>
                      <p className="font-semibold text-sm">{rev.name}</p>
                      <StarRating value={rev.rating} />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground italic">"{rev.text}"</p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Bottom CTA Banner */}
      <section className="rounded-2xl bg-primary p-8 md:p-12 text-center text-primary-foreground space-y-4 shadow-lg">
        <h2 className="text-2xl md:text-3xl font-bold">Ready for a healthier smile?</h2>
        <p className="text-primary-foreground/90 max-w-xl mx-auto text-sm md:text-base">
          Book your consultation today with our experienced Bengaluru dentists.
        </p>
        <div>
          <Button
            size="lg"
            className="bg-background text-foreground hover:bg-background/90"
            onClick={() => navigate('/book')}
          >
            Book Now
          </Button>
        </div>
      </section>
    </div>
  );
}
