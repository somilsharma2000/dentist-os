import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { formatINR } from '../../lib/utils';
import { Button, Card } from '../../components/ui';

export default function Services() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.get('/settings')
      .then((data) => {
        if (isMounted && data?.services) {
          setServices(data.services);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold">Our Services</h1>
        <p className="text-sm text-muted-foreground">
          Explore our complete range of high-quality dental treatments and procedures.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">Loading services...</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {services.map((service, index) => (
            <Card key={index} className="p-6 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-bold text-lg">{service.name}</h2>
                  <span className="text-base font-semibold text-primary">{formatINR(service.price)}</span>
                </div>
                <p className="text-sm text-muted-foreground">{service.desc}</p>
              </div>
              <Button
                className="w-full mt-2"
                onClick={() => navigate(`/book?service=${encodeURIComponent(service.name)}`)}
              >
                Book Now
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
