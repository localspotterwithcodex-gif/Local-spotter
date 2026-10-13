"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, User, Mail, Phone, Check } from "lucide-react";
import { ConsumerLayout } from "@/layouts/ConsumerLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthContext";

export default function ProfileEditPage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "Sanne de Jong");
  const [email, setEmail] = useState(user?.email || "sanne@example.nl");
  const [phone, setPhone] = useState("+31 6 12345678");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <ConsumerLayout>
      <div className="max-w-md mx-auto space-y-6">
        <Link href="/account" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          Terug naar account
        </Link>

        <div className="bg-white p-6 rounded-3xl border border-[#EAEAEA] shadow-md space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold font-rubik text-[#111111]">Account Information</h1>
            <p className="text-xs text-[#B7B7B7]">Beheer je persoonlijke gegevens</p>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Volledige Naam"
              icon={<User className="w-4 h-4" />}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="E-mailadres"
              type="email"
              icon={<Mail className="w-4 h-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Telefoonnummer"
              icon={<Phone className="w-4 h-4" />}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <Button type="submit" variant="primary" size="lg" fullWidth className="mt-4 gap-2">
              {saved ? (
                <>
                  <Check className="w-5 h-5" /> Opslaan Succesvol!
                </>
              ) : (
                "Opslaan"
              )}
            </Button>
          </form>
        </div>
      </div>
    </ConsumerLayout>
  );
}
