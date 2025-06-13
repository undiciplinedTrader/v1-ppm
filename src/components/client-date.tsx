// In: src/components/client-date.tsx
"use client";

import { useState, useEffect } from 'react';

type ClientDateProps = {
  dateString: string;
};

export default function ClientDate({ dateString }: ClientDateProps) {
  const [formattedDate, setFormattedDate] = useState('');

  // Dieser useEffect läuft nur im Browser, nachdem die Komponente "eingehängt" wurde.
  useEffect(() => {
    setFormattedDate(new Date(dateString).toLocaleDateString('de-DE'));
  }, [dateString]);

  // Wir geben das formatierte Datum zurück, sobald es verfügbar ist.
  return <>{formattedDate}</>;
}