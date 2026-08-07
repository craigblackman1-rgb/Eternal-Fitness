"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { IconArrowUpRight } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";

interface ConsultationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ConsultationDialog = ({ open, onOpenChange }: ConsultationDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "consultation_dialog",
          firstName: data.get("firstName"),
          lastName: data.get("lastName"),
          email: data.get("email"),
          phone: data.get("phone"),
          message: data.get("goals"),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast({
          title: "Couldn't send your request",
          description: body.error || "Please call or email directly instead.",
          variant: "destructive",
        });
        return;
      }
      onOpenChange(false);
      toast({
        title: "Consultation Request Sent!",
        description: "We'll be in touch within 24 hours to confirm your booking.",
      });
    } catch {
      toast({
        title: "Couldn't send your request",
        description: "Please call or email directly instead.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border-muted">
        <DialogHeader>
          <DialogTitle className="text-2xl text-foreground">
            Book Your Free Consultation
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Fill in your details and we'll get back to you within 24 hours to arrange your initial session.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">First Name</label>
              <Input required name="firstName" placeholder="Jane" maxLength={100} className="bg-white border-muted text-foreground placeholder:text-muted-foreground" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Last Name</label>
              <Input required name="lastName" placeholder="Smith" maxLength={100} className="bg-white border-muted text-foreground placeholder:text-muted-foreground" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
            <Input required type="email" name="email" placeholder="jane@example.com" maxLength={255} className="bg-white border-muted text-foreground placeholder:text-muted-foreground" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Phone</label>
            <Input required type="tel" name="phone" placeholder="07xxx xxx xxx" maxLength={20} className="bg-white border-muted text-foreground placeholder:text-muted-foreground" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Tell us about your goals <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea name="goals" placeholder="E.g. I want to improve my mobility and build strength after an injury..." maxLength={1000} rows={3} className="bg-white border-muted text-foreground placeholder:text-muted-foreground resize-none" />
          </div>
          <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-2 bg-rose text-white px-6 py-3 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-60 shadow-lg shadow-rose/30">
            {loading ? "Sending..." : "Request Consultation"}
            {!loading && <IconArrowUpRight className="w-4 h-4" />}
          </button>
          <p className="text-xs text-muted-foreground text-center">
            By submitting, you agree to our{" "}
            <a href="/terms" className="underline hover:text-foreground">Terms & Conditions</a>.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ConsultationDialog;
