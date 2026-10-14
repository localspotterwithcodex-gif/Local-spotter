"use client";

import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Store, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/i18n/LocaleContext";
import type { TranslationKey } from "@/i18n/dictionaries";

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

const OPTION_KEYS: Record<string, TranslationKey> = {
  "Fashion": "shopreg.opt.fashion",
  "Home & interior": "shopreg.opt.homeInterior",
  "Gifts": "shopreg.opt.gifts",
  "Beauty & lifestyle": "shopreg.opt.beauty",
  "Kids": "shopreg.opt.kids",
  "Food / specialty products": "shopreg.opt.food",
  "Jewellery & accessories": "shopreg.opt.jewellery",
  "Books / stationery": "shopreg.opt.books",
  "Other": "shopreg.opt.other",
  "Under 50": "shopreg.opt.under50",
  "50–250": "shopreg.opt.c50_250",
  "250–1,000": "shopreg.opt.c250_1000",
  "More than 1,000": "shopreg.opt.over1000",
  "No, only in-store": "shopreg.opt.onlineNo",
  "Yes, through our own webshop": "shopreg.opt.onlineOwn",
  "Yes, through marketplaces": "shopreg.opt.onlineMarket",
  "Yes, through social media": "shopreg.opt.onlineSocial",
  "Shopify": "shopreg.opt.posShopify",
  "WooCommerce": "shopreg.opt.posWoo",
  "Lightspeed": "shopreg.opt.posLight",
  "None": "shopreg.opt.posNone",
  "Yes, definitely": "shopreg.opt.pilotYes",
  "Maybe, I'd like to know more": "shopreg.opt.pilotMaybe",
  "Not right now": "shopreg.opt.pilotNo",
  "Showing my products to people nearby": "shopreg.opt.featShow",
  "Selling products through the app": "shopreg.opt.featSell",
  "Click & collect": "shopreg.opt.featClick",
  "Local delivery": "shopreg.opt.featDelivery",
  "Bringing more people into my physical shop": "shopreg.opt.featFoot",
  "Participating in shopping routes": "shopreg.opt.featRoutes",
  "Promoting offers/events": "shopreg.opt.featPromo",
  "Being featured in local recommendations": "shopreg.opt.featRecs",
  "Customer analytics": "shopreg.opt.featAnalytics",
  "I would only use a free version": "shopreg.opt.priceFree",
  "Up to €10/month": "shopreg.opt.price10",
  "€10–€25/month": "shopreg.opt.price10_25",
  "€25–€50/month": "shopreg.opt.price25_50",
  "€50–€100/month": "shopreg.opt.price50_100",
  "€100+ if it generates sufficient sales/customers": "shopreg.opt.price100",
  "Fixed monthly subscription": "shopreg.opt.modelFixed",
  "Small fee/commission per sale": "shopreg.opt.modelCommission",
  "Combination of subscription + lower commission": "shopreg.opt.modelCombo",
  "Pay only for additional promotion/visibility": "shopreg.opt.modelPromo",
  "Not sure": "shopreg.opt.notSure",
  "Definitely": "shopreg.opt.routeDefinitely",
  "Maybe": "shopreg.opt.routeMaybe",
  "No": "shopreg.opt.routeNo",
  "Discount": "shopreg.opt.offerDiscount",
  "Small gift": "shopreg.opt.offerGift",
  "Special product": "shopreg.opt.offerProduct",
  "Workshop/demo": "shopreg.opt.offerWorkshop",
};

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
  /** @deprecated The form follows the site-wide language; kept so existing callers still compile. */
  defaultLanguage?: "en" | "nl";
}

export const ShopRegistrationModal: React.FC<ShopRegistrationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useLocale();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState("");

  if (!isOpen) return null;

  const copy = {
    eyebrow: t("shopreg.eyebrow"),
    registration: t("shopreg.registration"),
    steps: [
      { title: t("shopreg.step1Title"), subtitle: t("shopreg.step1Sub") },
      { title: t("shopreg.step2Title"), subtitle: t("shopreg.step2Sub") },
      { title: t("shopreg.step3Title"), subtitle: t("shopreg.step3Sub") },
    ],
    next: t("shopreg.next"),
    continue: t("shopreg.continue"),
    back: t("shopreg.back"),
    submit: t("shopreg.submit"),
    selectAll: t("shopreg.selectAll"),
    fields: {
      shopName: t("shopreg.f.shopName"),
      contactPersonName: t("shopreg.f.contactPersonName"),
      email: t("shopreg.f.email"),
      phone: t("shopreg.f.phone"),
      shopAddress: t("shopreg.f.shopAddress"),
      websiteInstagram: t("shopreg.f.websiteInstagram"),
      shopType: t("shopreg.f.shopType"),
      otherShopType: t("shopreg.f.otherShopType"),
      productCount: t("shopreg.f.productCount"),
      sellsOnline: t("shopreg.f.sellsOnline"),
      otherSellsOnline: t("shopreg.f.otherSellsOnline"),
      webshopPos: t("shopreg.f.webshopPos"),
      otherWebshopPos: t("shopreg.f.otherWebshopPos"),
      pilotInterest: t("shopreg.f.pilotInterest"),
      valuableFeatures: t("shopreg.f.valuableFeatures"),
      otherFeature: t("shopreg.f.otherFeature"),
      monthlyPrice: t("shopreg.f.monthlyPrice"),
      pricingModel: t("shopreg.f.pricingModel"),
      routeInterest: t("shopreg.f.routeInterest"),
      routeOffer: t("shopreg.f.routeOffer"),
      otherRouteOffer: t("shopreg.f.otherRouteOffer"),
      biggestChallenge: t("shopreg.f.biggestChallenge"),
    },
    placeholders: {
      shopName: t("shopreg.p.shopName"),
      contactPersonName: t("shopreg.p.contactPersonName"),
      email: t("shopreg.p.email"),
      phone: t("shopreg.p.phone"),
      shopAddress: t("shopreg.p.shopAddress"),
      websiteInstagram: t("shopreg.p.websiteInstagram"),
      other: t("shopreg.p.other"),
      challenge: t("shopreg.p.challenge"),
    },
    sections: { pricing: t("shopreg.s.pricing"), routes: t("shopreg.s.routes"), challenge: t("shopreg.s.challenge") },
    info: { localSpotter: t("shopreg.info.localSpotter"), routes: t("shopreg.info.routes") },
    validation: {
      shopName: t("shopreg.v.shopName"),
      contactPersonName: t("shopreg.v.contactPersonName"),
      email: t("shopreg.v.email"),
      shopAddress: t("shopreg.v.shopAddress"),
      shopType: t("shopreg.v.shopType"),
      pilotInterest: t("shopreg.v.pilotInterest"),
      form: t("shopreg.v.form"),
      save: t("shopreg.v.save"),
      network: t("shopreg.v.network"),
    },
    successTitle: t("shopreg.successTitle"),
    successBody: t("shopreg.successBody"),
    close: t("shopreg.close"),
  };
  const optionLabel = (option: string) => (OPTION_KEYS[option] ? t(OPTION_KEYS[option]) : option);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
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
      // Stored in PostgreSQL by the NestJS backend (POST /api/v1/shop-registrations, public + validated).
      const response = await fetch("/api/v1/shop-registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
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
                {copy.steps.map((item, index) => (
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
