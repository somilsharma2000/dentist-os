import React from 'react';
import {
  Sparkles, Syringe, Zap, AlignCenter, Smile, Sun, Anchor,
  Scissors, Baby, Stethoscope, Droplet
} from 'lucide-react';

// Keyword -> icon mapping. Checked in order; first match wins.
const RULES = [
  [/clean|polish|scal/i, Sparkles],
  [/filling|cavity/i, Syringe],
  [/root canal|rct/i, Zap],
  [/brace|ortho/i, AlignCenter],
  [/invisalign|align/i, Smile],
  [/whiten/i, Sun],
  [/implant/i, Anchor],
  [/wisdom|extract/i, Scissors],
  [/kid|child|pediatric/i, Baby],
  [/gum|perio/i, Droplet]
];

export function getServiceIcon(name = '') {
  const found = RULES.find(([re]) => re.test(name));
  return found ? found[1] : Stethoscope;
}

export default function ServiceIcon({ name, className = 'h-5 w-5' }) {
  const Icon = getServiceIcon(name);
  return <Icon className={className} />;
}
