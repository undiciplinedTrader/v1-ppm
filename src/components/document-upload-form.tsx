// In: src/components/document-upload-form.tsx (Version für Multi-Upload)

// Stellt sicher, dass diese Zeile ganz oben steht.
"use client";

// Stellt sicher, dass alle diese Imports vorhanden sind.
import { useState, type FormEvent } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useRouter } from "next/navigation";

// Stellt sicher, dass die Typ-Definition korrekt ist.
type DocumentUploadFormProps = {
  tenderId: number;
};

// Stellt sicher, dass die Zeile mit "export default" beginnt.
export default function DocumentUploadForm({ tenderId }: DocumentUploadFormProps) {
  // 1. Der State speichert jetzt eine LISTE von Dateien (FileList)
  const [files, setFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter(); // Wir benutzen den Router, um die Seite neu zu laden

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // 2. Wir prüfen, ob mindestens eine Datei ausgewählt wurde
    if (!files || files.length === 0) {
      alert("Bitte wählen Sie mindestens eine Datei aus.");
      return;
    }
    setIsUploading(true);

    const formData = new FormData();
    formData.append("tenderId", String(tenderId));
    // 3. Wir fügen jede ausgewählte Datei zum FormData hinzu
    for (let i = 0; i < files.length; i++) {
      formData.append("documents", files[i]);
    }

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unbekannter Fehler");
      
      alert(`${files.length} Datei(en) erfolgreich hochgeladen!`);
      // 4. WICHTIG: Seite neu laden, um die neue Dokumentenliste anzuzeigen
      router.refresh();

    } catch (error: any) {
      alert(`Fehler beim Upload: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Stellt sicher, dass der return-Block das JSX mit der <Card> zurückgibt.
  return (
    <Card className="mt-8 border-t-4 border-primary">
      <CardHeader>
        <CardTitle>Dokumente hochladen</CardTitle>
        <CardDescription>
          Lade hier weitere PDF-Dokumente für diese Ausschreibung hoch.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="document">PDF-Dokument(e) auswählen</Label>
            <Input
              id="document"
              type="file"
              accept=".pdf"
              // 5. WICHTIG: Das 'multiple'-Attribut erlauben den Upload mehrerer Dateien
              multiple 
              onChange={(e) => setFiles(e.target.files)}
              className="text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-primary/90 file:py-2 file:px-4 file:text-sm file:font-semibold file:text-white hover:file:bg-primary"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={!files || isUploading}>
              {isUploading ? "Lädt hoch..." : "Dokument(e) verarbeiten"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}