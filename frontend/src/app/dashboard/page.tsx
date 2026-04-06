"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ComposeEmailModal } from "@/components/ComposeEmailModal";
import { format } from "date-fns";
import { PlusCircle, Clock, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

type EmailStatus = "PENDING" | "SENT" | "FAILED";

interface EmailItem {
  id: string;
  recipientEmail: string;
  subject: string;
  scheduledAt: string;
  sentAt: string | null;
  status: EmailStatus;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"scheduled" | "sent">("scheduled");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  
  const [scheduledEmails, setScheduledEmails] = useState<EmailItem[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmails = useCallback(async () => {
    if (!session?.user?.email) return;
    try {
      setLoading(true);
      const [scheduledRes, sentRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/emails/scheduled?sender=${session.user.email}`),
        fetch(`${API_BASE_URL}/api/emails/sent?sender=${session.user.email}`)
      ]);
      
      if (scheduledRes.ok) setScheduledEmails(await scheduledRes.json());
      if (sentRes.ok) setSentEmails(await sentRes.json());
    } catch (e) {
      console.error("Fetch failed", e);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.email]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const displayedEmails = activeTab === "scheduled" ? scheduledEmails : sentEmails;

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Campaigns</h2>
          <p className="text-neutral-400 text-sm">Monitor and schedule your outreach via BullMQ</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button 
            onClick={fetchEmails}
            className="p-2.5 bg-neutral-900 border border-white/10 hover:bg-neutral-800 text-neutral-300 rounded-lg transition"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => setIsComposeOpen(true)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-lg transition shadow-lg shadow-blue-500/20"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Compose Email</span>
          </button>
        </div>
      </div>

      <div className="bg-neutral-900/50 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="flex border-b border-white/5">
          <button 
            onClick={() => setActiveTab("scheduled")}
            className={`flex-1 py-4 text-sm font-medium transition flex justify-center items-center space-x-2 ${activeTab === 'scheduled' ? 'bg-white/5 text-white border-b-2 border-blue-500' : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'}`}
          >
            <Clock className="w-4 h-4" />
            <span>Scheduled ({scheduledEmails.length})</span>
          </button>
          <button 
            onClick={() => setActiveTab("sent")}
            className={`flex-1 py-4 text-sm font-medium transition flex justify-center items-center space-x-2 ${activeTab === 'sent' ? 'bg-white/5 text-white border-b-2 border-green-500' : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'}`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Sent / Failed ({sentEmails.length})</span>
          </button>
        </div>

        <div className="p-0">
          {loading && displayedEmails.length === 0 ? (
            <div className="p-12 text-center text-neutral-500">Loading emails...</div>
          ) : displayedEmails.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                {activeTab === 'scheduled' ? <Clock className="w-8 h-8 text-neutral-600" /> : <CheckCircle2 className="w-8 h-8 text-neutral-600" />}
              </div>
              <h3 className="text-lg font-medium text-white mb-1">No {activeTab} emails</h3>
              <p className="text-neutral-500 text-sm">When you schedule an email, it will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 text-xs uppercase tracking-wider text-neutral-400">
                    <th className="px-6 py-4 font-medium">Recipient</th>
                    <th className="px-6 py-4 font-medium">Subject</th>
                    <th className="px-6 py-4 font-medium">Time ({activeTab === 'scheduled' ? 'Scheduled' : 'Sent'})</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {displayedEmails.map(email => (
                    <tr key={email.id} className="hover:bg-white/[0.02] transition">
                      <td className="px-6 py-4 text-sm text-neutral-300 font-medium">
                        {email.recipientEmail}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-400 truncate max-w-xs" title={email.subject}>
                        {email.subject}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-500">
                        {format(new Date(activeTab === 'scheduled' ? email.scheduledAt : email.sentAt || email.scheduledAt), "MMM d, yyyy h:mm a")}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {email.status === 'PENDING' && <span className="inline-flex items-center space-x-1 text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full"><Clock className="w-3 h-3"/><span>Pending</span></span>}
                        {email.status === 'SENT' && <span className="inline-flex items-center space-x-1 text-green-400 bg-green-400/10 px-2 py-1 rounded-full"><CheckCircle2 className="w-3 h-3"/><span>Sent</span></span>}
                        {email.status === 'FAILED' && <span className="inline-flex items-center space-x-1 text-red-400 bg-red-400/10 px-2 py-1 rounded-full"><XCircle className="w-3 h-3"/><span>Failed</span></span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ComposeEmailModal 
        isOpen={isComposeOpen} 
        onClose={() => setIsComposeOpen(false)} 
        onSuccess={fetchEmails}
      />
    </div>
  );
}
