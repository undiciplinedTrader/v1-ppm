// In: src/components/tender-detail-client-view.tsx (FINALE VERSION)

//dieser Code zeigt auf der der ID Seite den Inhalt an und mit ihm kann man interagieren
//da wir auf der ID Seite Server-Komponenten verwenden, müssen wir diese diesen Client side code hier machen und dann als "Fenster" anzeigen

"use client"; // Diese Komponente ist für die Interaktion zuständig

// --- Imports ---
import { useState, type FormEvent, useRef, useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DocumentUploadForm from "@/components/document-upload-form";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getSignedUrlForFile } from "@/app/tenders/actions"; // NEUER IMPORT für unsere Server Action

// --- Verbesserte Typ-Definitionen ---
interface Document {
  id: number;
  file_name: string;
  file_size: number;
  storage_path: string;
}

interface Tender {
  id: number;
  title: string;
  client: string;
  publication_date: string;
  deadline: string;
  source_url: string;
  documents: Document[];
}

interface Message {
  from: 'human' | 'ai';
  content: string;
}

// --- Unterkomponenten ---
const TenderHeader = ({ tender }: { tender: Tender }) => (
  <>
    <Link href="/tenders" className="mb-6 block text-slate-600 hover:underline">&larr; Zurück zur Übersicht</Link>
    <h1 className="text-4xl font-bold">{tender.title}</h1>
    <div className="mt-6 rounded-lg bg-white p-8 shadow">
      <div className="space-y-4">
        <p className="text-slate-700"><strong className="w-40 inline-block text-slate-900">Auftraggeber:</strong> {tender.client}</p>
        <p className="text-slate-700"><strong className="w-40 inline-block text-slate-900">Veröffentlicht am:</strong> {new Date(tender.publication_date).toLocaleDateString('de-DE')}</p>
        <p className="text-slate-700"><strong className="w-40 inline-block text-slate-900">Frist:</strong> {new Date(tender.deadline).toLocaleDateString('de-DE')}</p>
      </div>
      <div className="mt-6 border-t pt-6">
        <a href={tender.source_url} target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline">Zur Originalquelle &rarr;</a>
      </div>
    </div>
  </>
);

const DocumentList = ({ documents, onOpenFile }: { documents: Document[], onOpenFile: (path: string) => void }) => (
  <Card className="mt-8">
    <CardHeader>
      <CardTitle>Dokumente</CardTitle>
    </CardHeader>
    <CardContent>
      <ul className="divide-y divide-gray-200">
        {documents.map((doc) => (
          <li key={doc.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-slate-800">{doc.file_name}</p>
              <p className="text-sm text-slate-500">
                {(doc.file_size / 1024).toFixed(2)} KB
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onOpenFile(doc.storage_path)}
            >
              Öffnen
            </Button>
          </li>
        ))}
        {documents.length === 0 && (
          <p className="text-sm text-center text-slate-500 py-4">
            Noch keine Dokumente für diese Ausschreibung hochgeladen.
          </p>
        )}
      </ul>
    </CardContent>
  </Card>
);

const ChatMessage = ({ message }: { message: Message }) => (
  <div className={`flex items-start gap-4 ${message.from === 'human' ? 'justify-end' : ''}`}>
    {message.from === 'ai' && <Avatar><AvatarFallback>KI</AvatarFallback></Avatar>}
    <div className={`rounded-lg p-3 max-w-2xl ${
      message.from === 'human' 
        ? 'bg-primary text-primary-foreground' 
        : 'bg-muted prose dark:prose-invert prose-sm max-w-none'
    }`}>
      {message.from === 'human' ? (
        <p>{message.content}</p>
      ) : (
        <div className="prose dark:prose-invert prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>
      )}
    </div>
    {message.from === 'human' && <Avatar><AvatarFallback>DU</AvatarFallback></Avatar>}
  </div>
);

const ChatInterface = ({ 
  messages, 
  isLoading, 
  onSubmit, 
  input, 
  setInput 
}: { 
  messages: Message[], 
  isLoading: boolean, 
  onSubmit: (e: FormEvent) => void,
  input: string,
  setInput: (value: string) => void
}) => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Card className="mt-8 flex flex-col h-[calc(100vh-10rem)] max-h-[700px]">
      <CardHeader>
        <CardTitle>Chat mit Dokumenten</CardTitle>
        <CardDescription>Stelle Fragen zu den hochgeladenen Dokumenten für diese Ausschreibung.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <div className="space-y-6">
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </CardContent>
      <div className="border-t p-4">
        <form onSubmit={onSubmit} className="flex items-center gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="z.B. Was sind die genauen Materialanforderungen für die Fassade?"
            className="min-h-0"
            disabled={isLoading}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(e); }}}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? '...' : 'Senden'}
          </Button>
        </form>
      </div>
    </Card>
  );
};

// --- Hauptkomponente ---
export default function TenderDetailClientView({ tender }: { tender: Tender }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChatSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { from: 'human', content: input };
    setMessages(current => [...current, userMessage, { from: 'ai', content: 'denkt nach...' }]);
    setIsLoading(true);
    const currentInput = input;
    setInput('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentInput,
          tenderId: tender.id,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'API-Fehler');
      }
      
      const aiMessage: Message = { 
        from: 'ai', 
        content: result.content || result.response
      };
      setMessages(current => [...current.slice(0, -1), aiMessage]);

    } catch (error: any) {
      const errorMessage: Message = { 
        from: 'ai', 
        content: `Entschuldigung, ein Fehler ist aufgetreten: ${error.message}`
      };
      setMessages(current => [...current.slice(0, -1), errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenFile = async (filePath: string) => {
    const result = await getSignedUrlForFile(filePath);
    if (result.url) {
      window.open(result.url, '_blank');
    } else {
      alert(result.error);
    }
  };

  return (
    <div>
      <TenderHeader tender={tender} />
      <DocumentList documents={tender.documents} onOpenFile={handleOpenFile} />
      <DocumentUploadForm tenderId={tender.id} />
      <ChatInterface 
        messages={messages}
        isLoading={isLoading}
        onSubmit={handleChatSubmit}
        input={input}
        setInput={setInput}
      />
    </div>
  );
}