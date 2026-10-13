"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Clock, MapPin, Users, Upload } from "lucide-react";
import { OwnerLayout } from "@/layouts/OwnerLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function AddWorkshopPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("49.00");
  const [capacity, setCapacity] = useState("8");
  const [location, setLocation] = useState("Mussenberg 128, Horn");
  const [date, setDate] = useState("2026-04-25");
  const [startTime, setStartTime] = useState("13:30");
  const [finishTime, setFinishTime] = useState("16:30");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState(
    "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=600&q=80"
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      router.push("/owner");
    }, 500);
  };

  return (
    <OwnerLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/owner" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B7B7B7] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          Terug naar dashboard
        </Link>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#EAEAEA] shadow-md space-y-6">
          <div className="border-b border-[#EAEAEA] pb-4">
            <h1 className="text-xl font-bold font-rubik text-[#111111]">Workshop Toevoegen</h1>
            <p className="text-xs text-[#B7B7B7]">Organiseer een creatieve workshop of masterclass voor je klanten</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Workshop Image Preview */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#111111]">Workshop Afbeelding</label>
              <div className="relative h-44 rounded-2xl overflow-hidden bg-[#790166]/10 border border-[#EAEAEA]">
                <img src={imageUrl} alt="Workshop preview" className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Workshop Name */}
            <Input
              label="Workshop Name *"
              placeholder="Bijv. Workshop: Maak je eigen Leren Pasjeshouder"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            {/* Price & Capacity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Prijs per Ticket (€) *"
                type="number"
                step="0.01"
                placeholder="49.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
              <Input
                label="Workshop Capacity (Max Deelnemers) *"
                type="number"
                placeholder="8"
                icon={<Users className="w-4 h-4 text-[#790166]" />}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                required
              />
            </div>

            {/* Location */}
            <Input
              label="Workshop Location *"
              placeholder="Straat en stad"
              icon={<MapPin className="w-4 h-4 text-[#54D1CA]" />}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />

            {/* Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Datum *"
                type="date"
                icon={<Calendar className="w-4 h-4 text-[#FA1EFF]" />}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <Input
                label="Time Start *"
                type="time"
                icon={<Clock className="w-4 h-4 text-[#121F3E]" />}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
              <Input
                label="Time Finish *"
                type="time"
                icon={<Clock className="w-4 h-4 text-[#121F3E]" />}
                value={finishTime}
                onChange={(e) => setFinishTime(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-[#111111]">Workshop Description</label>
              <textarea
                rows={4}
                className="w-full bg-[#EAEAEA] text-[#111111] text-base p-4 rounded-xl font-normal focus:outline-none focus:ring-2 focus:ring-[#FA1EFF] focus:bg-white border border-transparent"
                placeholder="Leg uit wat deelnemers gaan maken en wat inclusief is (materiaal, hapje/drankje)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-[#EAEAEA]">
              <Link href="/owner" className="flex-1">
                <Button variant="ghost" size="lg" fullWidth type="button">
                  ANNULEREN
                </Button>
              </Link>
              <Button variant="primary" size="lg" className="flex-1" type="submit" isLoading={isSubmitting}>
                CREATE
              </Button>
            </div>
          </form>
        </div>
      </div>
    </OwnerLayout>
  );
}
