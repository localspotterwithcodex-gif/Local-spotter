"use client";

import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Store, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

/* ------------------------------------------------------------------ */
/*  Option lists (mirrors backend CreateShopRegistrationDto)           */
/* ------------------------------------------------------------------ */

const SHOP_TYPES = [
  "Fashion",
  "Home & interior",
  "Gifts",
  "Beauty & lifestyle",
  "Kids",
  "Food / specialty products",
  "Jewellery & accessories",
  "Books / stationery",
  "Other",
] as const;

const PRODUCT_COUNTS = ["Under 50", "50–250", "250–1,000", "More than 1,000"] as const;

const SELLS_ONLINE = [
  "No, only in-store",
  "Yes, through our own webshop",
  "Yes, through marketplaces",
  "Yes, through social media",
  "Other",
] as const;

const WEBSHOP_POS = ["Shopify", "WooCommerce", "Lightspeed", "Other", "None"] as const;

const PILOT_INTEREST = ["Yes, definitely", "Maybe, I'd like to know more", "Not right now"] as const;

const VALUABLE_FEATURES = [
  "Showing my products to people nearby",
  "Selling products through the app",
  "Click & collect",
  "Local delivery",
  "Bringing more people into my physical shop",
  "Participating in shopping routes",
  "Promoting offers/events",
  "Being featured in local recommendations",
  "Customer analytics",
  "Other",
] as const;

const MONTHLY_PRICES = [
  "I would only use a free version",
  "Up to €10/month",
  "€10–€25/month",
  "€25–€50/month",
  "€50–€100/month",
  "€100+ if it generates sufficient sales/customers",
] as const;

const PRICING_MODELS = [
  "Fixed monthly subscription",
  "Small fee/commission per sale",
  "Combination of subscription + lower commission",
  "Pay only for additional promotion/visibility",
  "Not sure",
] as const;

const ROUTE_INTEREST = ["Definitely", "Maybe", "No"] as const;

const ROUTE_OFFERS = ["Discount", "Small gift", "Special product", "Workshop/demo", "Other", "No"] as const;

const DUTCH_OPTIONS: Record<string, string> = {
  Fashion: "Mode",
  "Home & interior": "Wonen & interieur",
  Gifts: "Cadeaus",
  "Beauty & lifestyle": "Beauty & lifestyle",
  Kids: "Kinderen",
  "Food / specialty products": "Voeding / speciaalproducten",
  "Jewellery & accessories": "Sieraden & accessoires",
  "Books / stationery": "Boeken / kantoorartikelen",
  Other: "Anders",
  "Under 50": "Minder dan 50",
  "More than 1,000": "Meer dan 1.000",
  "No, only in-store": "Nee, alleen in de winkel",
  "Yes, through our own webshop": "Ja, via onze eigen webshop",
  "Yes, through marketplaces": "Ja, via marktplaatsen",
  "Yes, through social media": "Ja, via sociale media",
  None: "Geen",
  "Yes, definitely": "Ja, zeker",
  "Maybe, I'd like to know more": "Misschien, ik wil graag meer weten",
  "Not right now": "Op dit moment niet",
  "Showing my products to people nearby": "Mijn producten tonen aan mensen in de buurt",
  "Selling products through the app": "Producten verkopen via de app",
  "Click & collect": "Klik & haal op",
  "Local delivery": "Lokale bezorging",
  "Bringing more people into my physical shop": "Meer mensen naar mijn fysieke winkel brengen",
  "Participating in shopping routes": "Deelnemen aan winkelroutes",
  "Promoting offers/events": "Aanbiedingen/evenementen promoten",
  "Being featured in local recommendations": "Vermeld worden in lokale aanbevelingen",
  "Customer analytics": "Klantanalyses",
  "I would only use a free version": "Ik zou alleen een gratis versie gebruiken",
  "Up to €10/month": "Tot €10/maand",
  "€10–€25/month": "€10–€25/maand",
  "€25–€50/month": "€25–€50/maand",
  "€50–€100/month": "€50–€100/maand",
  "€100+ if it generates sufficient sales/customers": "€100+ als het voldoende omzet/klanten oplevert",
  "Fixed monthly subscription": "Vast maandabonnement",
  "Small fee/commission per sale": "Kleine vergoeding/commissie per verkoop",
  "Combination of subscription + lower commission": "Combinatie van abonnement + lagere commissie",
  "Pay only for additional promotion/visibility": "Alleen betalen voor extra promotie/zichtbaarheid",
  "Not sure": "Weet ik niet",
  Definitely: "Zeker",
  Maybe: "Misschien",
  No: "Nee",
  Discount: "Korting",
  "Small gift": "Klein cadeau",
  "Special product": "Speciaal product",
  "Workshop/demo": "Workshop/demonstratie",
};

type Language = "en" | "nl";

type FormState = {
  shopName: string;
  contactPersonName: string;
  email: string;
  phone: string;
  shopAddress: string;
  websiteInstagram: string;
  shopType: string;
  otherShopType: string;
  productCount: string;
  sellsOnline: string;
  otherSellsOnline: string;
  webshopPos: string;
  otherWebshopPos: string;
  pilotInterest: string;
  valuableFeatures: string[];
  otherFeature: string;
  monthlyPrice: string;
  pricingModel: string;
  routeInterest: string;
  routeOffer: string;
  otherRouteOffer: string;
  biggestChallenge: string;
};

const EMPTY_FORM: FormState = {
  shopName: "",
  contactPersonName: "",
  email: "",
  phone: "",
  shopAddress: "",
  websiteInstagram: "",
  shopType: "",
  otherShopType: "",
  productCount: "",
  sellsOnline: "",
  otherSellsOnline: "",
  webshopPos: "",
  otherWebshopPos: "",
  pilotInterest: "",
  valuableFeatures: [],
  otherFeature: "",
  monthlyPrice: "",
  pricingModel: "",
  routeInterest: "",
  routeOffer: "",
  otherRouteOffer: "",
  biggestChallenge: "",
};

const COPY: Record<Language, any> = {
  en: {
    eyebrow: "Discover. Connect. Shop Local.",
    registration: "Shop Owner Registration",
    steps: [
      { title: "About your shop", subtitle: "Tell us a little about your shop." },
      { title: "Your business", subtitle: "Help us understand your products and current setup." },
      { title: "Local Spotter", subtitle: "Tell us how Local Spotter could help your shop." },
    ],
    next: "Next",
    continue: "Continue",
    back: "Back",
    submit: "Submit registration",
    submitting: "Submitting…",
    selectAll: "Select all that apply",
    fields: {
      shopName: "Shop name",
      contactPersonName: "Contact person's name",
      email: "Email address",
      phone: "Phone number",
      shopAddress: "Shop address",
      websiteInstagram: "Website / Instagram",
      shopType: "What type of shop are you?",
      otherShopType: "Other shop type",
      productCount: "Approximately how many different products do you sell?",
      sellsOnline: "Do you currently sell products online?",
      otherSellsOnline: "How do you sell online?",
      webshopPos: "Which webshop/POS system do you use?",
      otherWebshopPos: "Which system do you use?",
      pilotInterest: "Would you be interested in joining our pilot?",
      valuableFeatures: "Which features would be most valuable to your shop?",
      otherFeature: "Other feature",
      monthlyPrice: "If the platform brings your shop additional visibility and customers, what monthly price would you consider reasonable?",
      pricingModel: "Which pricing model would you prefer?",
      routeInterest: "Would you want your shop to participate in these routes?",
      routeOffer: "Would you offer something special to customers following a route?",
      otherRouteOffer: "What would you offer?",
      biggestChallenge: "What is currently your biggest challenge in attracting local customers?",
    },
    placeholders: {
      shopName: "e.g. Anna's Boutique",
      contactPersonName: "e.g. Anna Smith",
      email: "e.g. hello@yourshop.com",
      phone: "e.g. +31 6 12345678",
      shopAddress: "Enter your full shop address",
      websiteInstagram: "e.g. www.yourshop.com or @yourshop",
      other: "Please tell us more",
      challenge: "Share your experience with us…",
    },
    sections: { pricing: "Pricing", routes: "Shop routes", challenge: "Your biggest challenge" },
    info: {
      localSpotter: "Local Spotter helps consumers discover and buy products from independent shops in their neighbourhood.",
      routes: "We are considering curated shopping routes, such as “Local Fashion Route” or “Perfect Saturday Shopping Route”.",
    },
    validation: {
      shopName: "Please enter your shop name",
      contactPersonName: "Please tell us who we can contact",
      email: "Please enter a valid email address",
      shopAddress: "Please enter your shop address",
      shopType: "Please choose the type of shop you are",
      pilotInterest: "Please let us know if the pilot interests you",
      form: "Please complete the highlighted fields.",
      save: "Something went wrong. Please try again.",
      network: "We couldn't reach the server. Please check your connection and try again.",
    },
    successTitle: "Thank you for your interest in Local Spotter!",
    successBody: "Your response has been submitted successfully. We will be in touch soon.",
    close: "Close",
  },
  nl: {
    eyebrow: "Ontdek. Verbind. Winkel lokaal.",
    registration: "Registratie voor winkeliers",
    steps: [
      { title: "Over uw winkel", subtitle: "Vertel ons iets over uw winkel." },
      { title: "Uw onderneming", subtitle: "Help ons uw producten en huidige werkwijze te begrijpen." },
      { title: "Local Spotter", subtitle: "Vertel ons hoe Local Spotter uw winkel kan helpen." },
    ],
    next: "Volgende",
    continue: "Doorgaan",
    back: "Terug",
    submit: "Registratie verzenden",
    submitting: "Verzenden…",
    selectAll: "Selecteer alles wat van toepassing is",
    fields: {
      shopName: "Winkelnaam",
      contactPersonName: "Naam contactpersoon",
      email: "E-mailadres",
      phone: "Telefoonnummer",
      shopAddress: "Winkeladres",
      websiteInstagram: "Website / Instagram",
      shopType: "Wat voor soort winkel heeft u?",
      otherShopType: "Ander type winkel",
      productCount: "Hoeveel verschillende producten verkoopt u ongeveer?",
      sellsOnline: "Verkoopt u momenteel producten online?",
      otherSellsOnline: "Hoe verkoopt u online?",
      webshopPos: "Welk webshop-/kassasysteem gebruikt u?",
      otherWebshopPos: "Welk systeem gebruikt u?",
      pilotInterest: "Zou u interesse hebben om deel te nemen aan onze pilot?",
      valuableFeatures: "Welke functies zouden voor uw winkel het waardevolst zijn?",
      otherFeature: "Andere functie",
      monthlyPrice: "Als het platform uw winkel extra zichtbaarheid en klanten oplevert, welke maandprijs vindt u dan redelijk?",
      pricingModel: "Welk prijsmodel heeft uw voorkeur?",
      routeInterest: "Wilt u dat uw winkel deelneemt aan deze routes?",
      routeOffer: "Zou u iets speciaals aanbieden aan klanten die een route volgen?",
      otherRouteOffer: "Wat zou u aanbieden?",
      biggestChallenge: "Wat is momenteel uw grootste uitdaging bij het aantrekken van lokale klanten?",
    },
    placeholders: {
      shopName: "bijv. Anna's Boutique",
      contactPersonName: "bijv. Anna de Vries",
      email: "bijv. hallo@uwwinkel.nl",
      phone: "bijv. +31 6 12345678",
      shopAddress: "Vul het volledige winkeladres in",
      websiteInstagram: "bijv. www.uwwinkel.nl of @uwwinkel",
      other: "Vertel ons meer",
      challenge: "Deel uw ervaring met ons…",
    },
    sections: { pricing: "Prijzen", routes: "Winkelroutes", challenge: "Uw grootste uitdaging" },
    info: {
      localSpotter: "Local Spotter helpt consumenten producten van onafhankelijke winkels in hun buurt te ontdekken en te kopen.",
      routes: "We overwegen samengestelde winkelroutes, zoals ‘Lokale Moderoute’ of ‘Perfecte Zaterdag Winkelroute’.",
    },
    validation: {
      shopName: "Vul uw winkelnaam in",
      contactPersonName: "Vertel ons met wie we contact kunnen opnemen",
      email: "Vul een geldig e-mailadres in",
      shopAddress: "Vul uw winkeladres in",
      shopType: "Kies het type winkel dat u heeft",
      pilotInterest: "Laat ons weten of u interesse heeft in de pilot",
      form: "Vul de gemarkeerde velden in.",
      save: "Er is iets misgegaan. Probeer het opnieuw.",
      network: "We konden de server niet bereiken. Controleer uw verbinding en probeer opnieuw.",
    },
    successTitle: "Bedankt voor uw interesse in Local Spotter!",
    successBody: "Uw reactie is succesvol verzonden. We nemen binnenkort contact met u op.",
    close: "Sluiten",
  },
};

/* ------------------------------------------------------------------ */
/*  Small field primitives, styled with the site's design tokens       */
/* ------------------------------------------------------------------ */

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-bold text-[#111111]">
        {label}
        {required && <span className="ml-1 text-[#FA1EFF]">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-[#ED4C5C]">{error}</p>}
    </div>
  );
}

const inputClass =
  "w-full min-h-12 rounded-xl border border-transparent bg-[#EAEAEA] px-4 py-3 text-sm text-[#111111] placeholder:text-[#B7B7B7] outline-none transition-all focus:border-[#FA1EFF] focus:bg-white focus:ring-2 focus:ring-[#FA1EFF]/25";

function TextField({
  value,
  onChange,
  placeholder,
  type = "text",
  textarea,
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  textarea?: boolean;
  rows?: number;
}) {
  if (textarea) {
    return (
      <textarea
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    );
  }
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
    />
  );
}

function OptionGrid({
  options,
  selected,
  onSelect,
  multi,
  label,
}: {
  options: readonly string[];
  selected: string[];
  onSelect: (option: string) => void;
  multi?: boolean;
  label: (option: string) => string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            type="button"
            key={option}
            onClick={() => onSelect(option)}
            aria-pressed={active}
            className={`flex min-h-11 items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm leading-snug transition-colors ${
              active
                ? "border-[#FA1EFF] bg-[#FAE2F0] text-[#111111]"
                : "border-transparent bg-[#F5F5F5] text-[#111111] hover:border-[#F5CEE6]"
            }`}
          >
            <span
              className={`grid h-4 w-4 shrink-0 place-items-center border ${
                multi ? "rounded-[4px]" : "rounded-full"
              } ${active ? "border-[#FA1EFF] bg-[#FA1EFF]" : "border-[#B7B7B7]"}`}
            >
              {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
            </span>
            <span className="min-w-0">{label(option)}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  The modal                                                          */
/* ------------------------------------------------------------------ */

interface ShopRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLanguage?: Language;
}

export const ShopRegistrationModal: React.FC<ShopRegistrationModalProps> = ({
  isOpen,
  onClose,
  defaultLanguage = "nl",
}) => {
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState("");

  if (!isOpen) return null;

  const copy = COPY[language];
  const optionLabel = (option: string) => (language === "nl" ? DUTCH_OPTIONS[option] ?? option : option);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors(({ [key as string]: _removed, ...rest }) => rest);
  };
  const toggleFeature = (option: string) => {
    set("valuableFeatures", form.valuableFeatures.includes(option) ? form.valuableFeatures.filter((v) => v !== option) : [...form.valuableFeatures, option]);
  };

  function validateStep(index: number) {
    const next: Record<string, string> = {};
    if (index === 0) {
      if (!form.shopName.trim()) next.shopName = copy.validation.shopName;
      if (!form.contactPersonName.trim()) next.contactPersonName = copy.validation.contactPersonName;
      if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = copy.validation.email;
      if (!form.shopAddress.trim()) next.shopAddress = copy.validation.shopAddress;
      if (!form.shopType.trim()) next.shopType = copy.validation.shopType;
    }
    if (index === 2 && !form.pilotInterest.trim()) next.pilotInterest = copy.validation.pilotInterest;
    return next;
  }

  function goTo(index: number) {
    setFormError("");
    setStep(index);
  }

  function handleContinue() {
    const found = validateStep(step);
    setErrors(found);
    if (Object.keys(found).length) {
      setFormError(copy.validation.form);
      return;
    }
    goTo(step + 1);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || done) return;
    if (step < 2) {
      handleContinue();
      return;
    }
    const found = { ...validateStep(0), ...validateStep(1), ...validateStep(2) };
    setErrors(found);
    if (Object.keys(found).length) {
      setStep(Object.keys(validateStep(0)).length ? 0 : 2);
      setFormError(copy.validation.form);
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      // Same-origin route — handled by frontend/src/app/api/shop-registrations/route.ts,
      // which stores the submission directly in MongoDB.
      const response = await fetch("/api/shop-registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json().catch(() => null)) as { success?: boolean; fieldErrors?: Record<string, string> } | null;
      if (!response.ok || !data?.success) {
        if (data?.fieldErrors) {
          setErrors((prev) => ({ ...prev, ...data.fieldErrors }));
        }
        setFormError(copy.validation.save);
        return;
      }
      setDone(true);
    } catch {
      setFormError(copy.validation.network);
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    onClose();
    // Reset after the close animation would run so a re-open starts fresh,
    // but keep a successful submission visible if closed right after.
    if (!done) {
      setStep(0);
      setForm(EMPTY_FORM);
      setErrors({});
      setFormError("");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 backdrop-blur-xs duration-200 animate-in fade-in sm:items-center sm:p-4"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl sm:max-w-xl sm:rounded-3xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#EAEAEA] bg-[#FCE1F0] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#FA1EFF] text-white">
              <Store className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#D46995]">{copy.eyebrow}</p>
              <h2 className="font-rubik text-base font-bold text-[#0A182E]">{copy.registration}</h2>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="mr-1 flex rounded-full bg-white/70 p-0.5">
              {(["nl", "en"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLanguage(value)}
                  className={`rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${
                    language === value ? "bg-[#FA1EFF] text-white" : "text-[#0A182E]"
                  }`}
                >
                  {value.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={handleClose}
              aria-label={copy.close}
              className="rounded-full p-2 text-[#0A182E] transition-colors hover:bg-white/70"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-6">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-[#FA1EFF] text-2xl text-white">✓</span>
              <h3 className="font-rubik text-lg font-bold text-[#111111]">{copy.successTitle}</h3>
              <p className="max-w-sm text-sm text-[#5B5B5B]">{copy.successBody}</p>
              <Button variant="primary" size="md" className="mt-3" onClick={handleClose}>
                {copy.close}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              {/* Step indicator */}
              <ol className="flex items-center gap-2">
                {copy.steps.map((item: any, index: number) => (
                  <li key={item.title} className="flex flex-1 items-center gap-2">
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                        index === step
                          ? "bg-[#FA1EFF] text-white"
                          : index < step
                          ? "bg-[#FBBC3E] text-white"
                          : "bg-[#EAEAEA] text-[#B7B7B7]"
                      }`}
                    >
                      {index < step ? "✓" : index + 1}
                    </span>
                    {index < copy.steps.length - 1 && <span className="h-0.5 flex-1 rounded bg-[#EAEAEA]" />}
                  </li>
                ))}
              </ol>
              <div>
                <h3 className="font-rubik text-lg font-bold text-[#111111]">{copy.steps[step].title}</h3>
                <p className="text-sm text-[#5B5B5B]">{copy.steps[step].subtitle}</p>
              </div>

              {step === 0 && (
                <div className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label={copy.fields.shopName} required error={errors.shopName}>
                      <TextField value={form.shopName} onChange={(v) => set("shopName", v)} placeholder={copy.placeholders.shopName} />
                    </Field>
                    <Field label={copy.fields.contactPersonName} required error={errors.contactPersonName}>
                      <TextField value={form.contactPersonName} onChange={(v) => set("contactPersonName", v)} placeholder={copy.placeholders.contactPersonName} />
                    </Field>
                    <Field label={copy.fields.email} required error={errors.email}>
                      <TextField type="email" value={form.email} onChange={(v) => set("email", v)} placeholder={copy.placeholders.email} />
                    </Field>
                    <Field label={copy.fields.phone}>
                      <TextField type="tel" value={form.phone} onChange={(v) => set("phone", v)} placeholder={copy.placeholders.phone} />
                    </Field>
                  </div>
                  <Field label={copy.fields.shopAddress} required error={errors.shopAddress}>
                    <TextField value={form.shopAddress} onChange={(v) => set("shopAddress", v)} placeholder={copy.placeholders.shopAddress} />
                  </Field>
                  <Field label={copy.fields.websiteInstagram}>
                    <TextField value={form.websiteInstagram} onChange={(v) => set("websiteInstagram", v)} placeholder={copy.placeholders.websiteInstagram} />
                  </Field>
                  <Field label={copy.fields.shopType} required error={errors.shopType}>
                    <OptionGrid options={SHOP_TYPES} selected={[form.shopType]} onSelect={(v) => set("shopType", v)} label={optionLabel} />
                  </Field>
                  {form.shopType === "Other" && (
                    <Field label={copy.fields.otherShopType}>
                      <TextField value={form.otherShopType} onChange={(v) => set("otherShopType", v)} placeholder={copy.placeholders.other} />
                    </Field>
                  )}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <Field label={copy.fields.productCount}>
                    <OptionGrid options={PRODUCT_COUNTS} selected={[form.productCount]} onSelect={(v) => set("productCount", v)} label={optionLabel} />
                  </Field>
                  <Field label={copy.fields.sellsOnline}>
                    <OptionGrid options={SELLS_ONLINE} selected={[form.sellsOnline]} onSelect={(v) => set("sellsOnline", v)} label={optionLabel} />
                  </Field>
                  {form.sellsOnline === "Other" && (
                    <Field label={copy.fields.otherSellsOnline}>
                      <TextField value={form.otherSellsOnline} onChange={(v) => set("otherSellsOnline", v)} placeholder={copy.placeholders.other} />
                    </Field>
                  )}
                  <Field label={copy.fields.webshopPos}>
                    <OptionGrid options={WEBSHOP_POS} selected={[form.webshopPos]} onSelect={(v) => set("webshopPos", v)} label={optionLabel} />
                  </Field>
                  {form.webshopPos === "Other" && (
                    <Field label={copy.fields.otherWebshopPos}>
                      <TextField value={form.otherWebshopPos} onChange={(v) => set("otherWebshopPos", v)} placeholder={copy.placeholders.other} />
                    </Field>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <p className="rounded-2xl border border-[#F5CEE6] bg-[#FCE1F0]/50 p-4 text-sm leading-relaxed text-[#5B5B5B]">
                    {copy.info.localSpotter}
                  </p>
                  <Field label={copy.fields.pilotInterest} required error={errors.pilotInterest}>
                    <OptionGrid options={PILOT_INTEREST} selected={[form.pilotInterest]} onSelect={(v) => set("pilotInterest", v)} label={optionLabel} />
                  </Field>
                  <Field label={copy.fields.valuableFeatures}>
                    <p className="mb-2 -mt-1 text-xs text-[#B7B7B7]">{copy.selectAll}</p>
                    <OptionGrid options={VALUABLE_FEATURES} selected={form.valuableFeatures} onSelect={toggleFeature} multi label={optionLabel} />
                  </Field>
                  {form.valuableFeatures.includes("Other") && (
                    <Field label={copy.fields.otherFeature}>
                      <TextField value={form.otherFeature} onChange={(v) => set("otherFeature", v)} placeholder={copy.placeholders.other} />
                    </Field>
                  )}
                  <div className="space-y-5 border-t border-[#EAEAEA] pt-5">
                    <h4 className="font-rubik text-sm font-bold text-[#111111]">{copy.sections.pricing}</h4>
                    <Field label={copy.fields.monthlyPrice}>
                      <OptionGrid options={MONTHLY_PRICES} selected={[form.monthlyPrice]} onSelect={(v) => set("monthlyPrice", v)} label={optionLabel} />
                    </Field>
                    <Field label={copy.fields.pricingModel}>
                      <OptionGrid options={PRICING_MODELS} selected={[form.pricingModel]} onSelect={(v) => set("pricingModel", v)} label={optionLabel} />
                    </Field>
                  </div>
                  <div className="space-y-5 border-t border-[#EAEAEA] pt-5">
                    <h4 className="font-rubik text-sm font-bold text-[#111111]">{copy.sections.routes}</h4>
                    <p className="text-xs text-[#B7B7B7]">{copy.info.routes}</p>
                    <Field label={copy.fields.routeInterest}>
                      <OptionGrid options={ROUTE_INTEREST} selected={[form.routeInterest]} onSelect={(v) => set("routeInterest", v)} label={optionLabel} />
                    </Field>
                    <Field label={copy.fields.routeOffer}>
                      <OptionGrid options={ROUTE_OFFERS} selected={[form.routeOffer]} onSelect={(v) => set("routeOffer", v)} label={optionLabel} />
                    </Field>
                    {form.routeOffer === "Other" && (
                      <Field label={copy.fields.otherRouteOffer}>
                        <TextField value={form.otherRouteOffer} onChange={(v) => set("otherRouteOffer", v)} placeholder={copy.placeholders.other} />
                      </Field>
                    )}
                  </div>
                  <div className="space-y-3 border-t border-[#EAEAEA] pt-5">
                    <h4 className="font-rubik text-sm font-bold text-[#111111]">{copy.sections.challenge}</h4>
                    <TextField textarea rows={4} value={form.biggestChallenge} onChange={(v) => set("biggestChallenge", v)} placeholder={copy.placeholders.challenge} />
                  </div>
                </div>
              )}

              {formError && (
                <p role="alert" className="rounded-xl bg-[#ED4C5C]/10 px-4 py-2.5 text-sm font-medium text-[#ED4C5C]">
                  {formError}
                </p>
              )}

              <div className="flex items-center justify-between gap-3 border-t border-[#EAEAEA] pt-5">
                {step > 0 ? (
                  <Button type="button" variant="outline" size="md" onClick={() => goTo(step - 1)}>
                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                    {copy.back}
                  </Button>
                ) : (
                  <span />
                )}
                <Button type="submit" variant="primary" size="md" isLoading={submitting}>
                  {step === 2 ? copy.submit : step === 1 ? copy.continue : copy.next}
                  {!submitting && <ArrowRight className="ml-1.5 h-4 w-4" />}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
