"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <ConsumerLayout>
      <div className="max-w-md mx-auto my-8 bg-white p-6 sm:p-8 rounded-3xl border border-[#EAEAEA] shadow-md space-y-6">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          Terug naar inloggen
        </Link>

        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold font-rubik text-[#111111]">Wachtwoord Vergeten</h1>
          <p className="text-xs text-[#B7B7B7]">
            Voer je e-mailadres in om een herstellink te ontvangen.
          </p>
        </div>

        {submitted ? (
          <div className="p-4 bg-[#CBF5D5] text-[#3B9B52] rounded-2xl text-center space-y-2">
            <CheckCircle className="w-8 h-8 mx-auto" />
            <h3 className="text-sm font-bold">Herstellink verzonden!</h3>
            <p className="text-xs">
              Als dit e-mailadres bij ons bekend is, ontvang je binnen enkele minuten een e-mail met instructies.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="E-mailadres"
              type="email"
              placeholder="naam@voorbeeld.nl"
              icon={<Mail className="w-4 h-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Button type="submit" variant="primary" size="lg" fullWidth>
              Verstuur Herstellink
            </Button>
          </form>
        )}
      </div>
    </ConsumerLayout>
  );
}
