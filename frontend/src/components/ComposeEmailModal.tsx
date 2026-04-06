"use client";

import React, { useState, useRef } from "react";
import { X, Upload, Send } from "lucide-react";
import { useSession } from "next-auth/react";

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000";

export function ComposeEmailModal({ isOpen, onClose, onSuccess }: ComposeModalProps) {
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [startTime, setStartTime] = useState("");
  const [delaySecs, setDelaySecs] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(50);
  
  const [emailsRaw, setEmailsRaw] = useState<{recipientEmail: string}[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError("");

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setEmailsRaw([]);
          return;
        }

        // Extremely robust global regex that snatches anything looking like an email from raw text
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const matches = text.match(emailRegex) || [];
        
        // Deduplicate
        const uniqueEmails = Array.from(new Set(matches.map(e => e.trim().toLowerCase())));
        const validEmails = uniqueEmails.map(email => ({ recipientEmail: email }));

        setEmailsRaw(validEmails);
      } catch (err: any) {
        setError(err.message || "Failed to process file");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.onerror = () => {
      setError("Error reading file");
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !body || !startTime || emailsRaw.length === 0) {
      setError("Please fill all required fields and upload leads.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const payload = {
        senderEmail: session?.user?.email,
        startTime: new Date(startTime).toISOString(),
        delaySecs: Number(delaySecs),
        hourlyLimit: Number(hourlyLimit),
        emails: emailsRaw.map(e => ({
          ...e,
          subject,
          body
        }))
      };

      const res = await fetch(`${API_BASE_URL}/api/emails/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(typeof d.error === 'string' ? d.error : JSON.stringify(d.error) || 'Failed to schedule');
      }

      setSubject("");
      setBody("");
      setStartTime("");
      setEmailsRaw([]);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-white/10 bg-white/5">
          <h2 className="text-xl font-bold text-white">Compose Campaign</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Upload CSV Leads</label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center justify-center space-x-2 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg cursor-pointer transition border border-white/10">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Choose CSV</span>
                  <input type="file" accept=".csv,.txt" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                </label>
                {emailsRaw.length > 0 && (
                  <span className="text-sm text-green-400 font-medium">
                    {emailsRaw.length} leads detected
                  </span>
                )}
                {isUploading && <span className="text-sm text-blue-400">Parsing...</span>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-1">Start Time</label>
                  <input 
                    type="datetime-local" 
                    required 
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full bg-neutral-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
               </div>
               <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">Interval (s)</label>
                    <input 
                      type="number" min="0" required value={delaySecs}
                      onChange={e => setDelaySecs(Number(e.target.value))}
                      className="w-full bg-neutral-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-1">Max / Hr</label>
                    <input 
                      type="number" min="1" required value={hourlyLimit}
                      onChange={e => setHourlyLimit(Number(e.target.value))}
                      className="w-full bg-neutral-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
               </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Subject</label>
              <input 
                type="text" required placeholder="Campaign Subject"
                value={subject} onChange={e => setSubject(e.target.value)}
                className="w-full bg-neutral-800 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-neutral-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Body</label>
              <textarea 
                required rows={6} placeholder="Email content..."
                value={body} onChange={e => setBody(e.target.value)}
                className="w-full bg-neutral-800 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-neutral-600 resize-none"
              />
            </div>
          </div>
          
          <div className="pt-4 border-t border-white/10 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || emailsRaw.length === 0}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-semibold px-6 py-2 rounded-lg transition-all"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? "Scheduling..." : "Schedule Campaign"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
