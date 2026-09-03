import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Card, Avatar, Badge, StarRating } from '../../components/ui';
import { Calendar } from 'lucide-react';

export default function Team() {
  const [dentists, setDentists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api.get('/dentists')
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setDentists(data);
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
        <h1 className="text-2xl md:text-3xl font-bold">Our Team</h1>
        <p className="text-sm text-muted-foreground">
          Meet our experienced, caring dental professionals dedicated to your health and smile.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">Loading dentists...</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {dentists.map((dentist) => (
            <Card key={dentist.id} className="p-6 flex flex-col space-y-4 text-center items-center">
              <Avatar name={dentist.name} className="h-16 w-16 text-xl" />
              <div className="space-y-1.5 w-full">
                <h2 className="font-bold text-lg">{dentist.name}</h2>
                <div>
                  <Badge variant="primary">{dentist.specialty}</Badge>
                </div>
                <div className="flex justify-center pt-1">
                  <StarRating value={dentist.rating} />
                </div>
              </div>

              {dentist.days && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{dentist.days}</span>
                </div>
              )}

              {dentist.bio && (
                <p className="text-sm text-muted-foreground text-left pt-2 border-t border-border/60 w-full">
                  {dentist.bio}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
