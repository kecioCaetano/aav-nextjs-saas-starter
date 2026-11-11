"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";

import { Button } from "@/components/ui/button";

export function DashboardWelcomeCarousel() {
  const t = useTranslations("Introduction");
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [snapCount, setSnapCount] = useState(0);

  const updateSelection = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setSnapCount(emblaApi.scrollSnapList().length);
    updateSelection();
    emblaApi.on("select", updateSelection);
    emblaApi.on("reInit", updateSelection);

    return () => {
      emblaApi.off("select", updateSelection);
      emblaApi.off("reInit", updateSelection);
    };
  }, [emblaApi, updateSelection]);

  const goToSlide = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi],
  );

  return (
    <section
      aria-label={t("eyebrow")}
      aria-roledescription={t("carouselDescription")}
      className="mx-auto w-4/5 max-w-[44.8rem] px-4 py-6 sm:px-6 sm:py-8"
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y">
          <article
            role="group"
            aria-roledescription={t("slideDescription")}
            aria-label={`${t("slideLabel")} 1`}
            className="min-w-0 flex-[0_0_100%]"
          >
            <div className="grid items-center gap-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">
                  {t("eyebrow")}
                </p>
                <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-foreground sm:text-4xl">
                  {t("headline")}
                  <span className="block text-orange-500">
                    {t("headlineAccent")}
                  </span>
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-gray-600 dark:text-muted-foreground">
                  {t("lead")}
                </p>
              </div>
              <figure className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
                <Image
                  src="/images/introduction/prolerizer-new.jpeg"
                  alt={t("modernImageAlt")}
                  width={563}
                  height={452}
                  priority
                  sizes="(min-width: 1024px) 44rem, 80vw"
                  className="aspect-[16/9] w-full object-cover"
                />
                <figcaption className="flex items-center gap-3 p-5 text-sm font-medium text-gray-700 dark:text-foreground">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500"
                    aria-hidden="true"
                  />
                  {t("imageCaption")}
                </figcaption>
              </figure>
            </div>
          </article>

          <article
            role="group"
            aria-roledescription={t("slideDescription")}
            aria-label={`${t("slideLabel")} 2`}
            className="min-w-0 flex-[0_0_100%]"
          >
            <div className="grid gap-6">
              <div className="grid grid-cols-2 items-start gap-4">
                <figure className="overflow-hidden rounded-2xl border border-border bg-muted">
                  <Image
                    src="/images/introduction/prolerizer.jpeg"
                    alt={t("historicPlantAlt")}
                    width={517}
                    height={415}
                    sizes="(min-width: 1024px) 22rem, 40vw"
                    className="aspect-[4/3] w-full object-cover"
                  />
                </figure>
                <figure className="mt-8 overflow-hidden rounded-2xl border border-border bg-muted sm:mt-12">
                  <Image
                    src="/images/introduction/prolerizer2.jpeg"
                    alt={t("historicYardAlt")}
                    width={600}
                    height={480}
                    sizes="(min-width: 1024px) 22rem, 40vw"
                    className="aspect-[4/3] w-full object-cover"
                  />
                </figure>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">
                  {t("storyEyebrow")}
                </p>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-foreground sm:text-4xl">
                  {t("storyTitle")}
                </h2>
                <p className="mt-5 text-base leading-7 text-gray-600 dark:text-muted-foreground">
                  {t("storyFirst")}
                </p>
                <p className="mt-4 text-base leading-7 text-gray-600 dark:text-muted-foreground">
                  {t("storySecond")}
                </p>
              </div>
            </div>
          </article>

          <article
            role="group"
            aria-roledescription={t("slideDescription")}
            aria-label={`${t("slideLabel")} 3`}
            className="min-w-0 flex-[0_0_100%]"
          >
            <div className="flex min-h-[25.6rem] items-center">
              <div className="w-full rounded-3xl border border-orange-200 bg-orange-50 p-6 dark:border-orange-900 dark:bg-orange-950/30 sm:p-9">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-400">
                  {t("ctaEyebrow")}
                </p>
                <h2 className="mt-4 break-words text-3xl font-bold tracking-tight text-gray-900 dark:text-foreground sm:text-4xl">
                  {t("ctaTitle")}
                </h2>
                <p className="mt-5 text-base leading-7 text-gray-600 dark:text-muted-foreground">
                  {t("ctaDescription")}
                </p>
              </div>
            </div>
          </article>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => emblaApi?.scrollPrev()}
          disabled={selectedIndex === 0}
          aria-label={t("carouselPrevious")}
        >
          <ArrowLeft aria-hidden="true" />
        </Button>
        <div className="flex items-center gap-2">
          {Array.from({ length: snapCount }, (_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goToSlide(index)}
              aria-label={`${t("slideLabel")} ${index + 1}`}
              aria-current={selectedIndex === index ? "true" : undefined}
              className={`h-2.5 rounded-full transition-all ${
                selectedIndex === index
                  ? "w-6 bg-orange-600 dark:bg-orange-400"
                  : "w-2.5 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500"
              }`}
            />
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => emblaApi?.scrollNext()}
          disabled={selectedIndex === snapCount - 1}
          aria-label={t("carouselNext")}
        >
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}
