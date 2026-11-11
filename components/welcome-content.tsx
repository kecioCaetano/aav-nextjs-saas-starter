import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function WelcomeContent({ dashboard = false }: { dashboard?: boolean }) {
  const intro = useTranslations("Introduction");

  return (
    <div className={dashboard ? "mx-auto w-full max-w-4xl" : undefined}>
      <section
        className={
          dashboard
            ? "overflow-hidden py-8 sm:py-10"
            : "overflow-hidden py-16 sm:py-24 lg:py-28"
        }
      >
        <div
          className={`mx-auto grid max-w-7xl items-center px-4 sm:px-6 ${
            dashboard ? "gap-8 lg:px-6" : "gap-12 lg:grid-cols-2 lg:gap-16 lg:px-8"
          }`}
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">
              {intro("eyebrow")}
            </p>
            <h1
              className={`mt-5 text-4xl font-bold tracking-tight text-gray-900 dark:text-foreground sm:text-5xl ${
                dashboard ? "" : "lg:text-6xl"
              }`}
            >
              {intro("headline")}
              <span className="block text-orange-500">
                {intro("headlineAccent")}
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-gray-600 dark:text-muted-foreground">
              {intro("lead")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button
                asChild
                size="lg"
                className="rounded-sm bg-orange-600 px-6 text-white hover:bg-orange-700"
              >
                <Link href="/sign-up">
                  {intro("getStarted")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-sm px-6"
              >
                <a href="#story">{intro("discoverStory")}</a>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div
              className="absolute -inset-4 rounded-[2rem] bg-orange-100/70 dark:bg-orange-950/30"
              aria-hidden="true"
            />
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
              <Image
                src="/images/introduction/prolerizer-new.jpeg"
                alt={intro("modernImageAlt")}
                width={563}
                height={452}
                priority
                sizes={
                  dashboard
                    ? "(min-width: 1024px) 60vw, 100vw"
                    : "(min-width: 1024px) 50vw, 100vw"
                }
                className="aspect-[5/4] w-full object-cover"
              />
              <div className="flex items-center gap-3 p-5">
                <span
                  className="h-2.5 w-2.5 rounded-full bg-orange-500"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium text-gray-700 dark:text-foreground">
                  {intro("imageCaption")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="story"
        className={`bg-white dark:bg-card ${
          dashboard ? "py-8 sm:py-10" : "py-16 sm:py-24"
        }`}
      >
        <div
          className={`mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 ${
            dashboard
              ? "lg:px-6"
              : "lg:grid-cols-2 lg:items-center lg:gap-20 lg:px-8"
          }`}
        >
          <div className="grid grid-cols-2 items-start gap-4">
            <figure className="overflow-hidden rounded-2xl border border-border bg-muted">
              <Image
                src="/images/introduction/prolerizer.jpeg"
                alt={intro("historicPlantAlt")}
                width={517}
                height={415}
                sizes="(min-width: 1024px) 25vw, 50vw"
                className="aspect-[4/5] w-full object-cover"
              />
            </figure>
            <figure className="mt-10 overflow-hidden rounded-2xl border border-border bg-muted">
              <Image
                src="/images/introduction/prolerizer2.jpeg"
                alt={intro("historicYardAlt")}
                width={600}
                height={480}
                sizes="(min-width: 1024px) 25vw, 50vw"
                className="aspect-[4/5] w-full object-cover"
              />
            </figure>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">
              {intro("storyEyebrow")}
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-card-foreground sm:text-4xl">
              {intro("storyTitle")}
            </h2>
            <p className="mt-6 text-base leading-7 text-gray-600 dark:text-muted-foreground">
              {intro("storyFirst")}
            </p>
            <p className="mt-4 text-base leading-7 text-gray-600 dark:text-muted-foreground">
              {intro("storySecond")}
            </p>
          </div>
        </div>
      </section>

      <section className={dashboard ? "py-8 sm:py-10" : "py-16 sm:py-24"}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-orange-200 bg-orange-50 p-8 dark:border-orange-900 dark:bg-orange-950/30 sm:p-12 lg:flex lg:items-center lg:justify-between lg:gap-12">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-400">
                {intro("ctaEyebrow")}
              </p>
              <h2 className="mt-4 break-words text-3xl font-bold tracking-tight text-gray-900 dark:text-foreground sm:text-4xl">
                {intro("ctaTitle")}
              </h2>
              <p className="mt-4 text-base leading-7 text-gray-600 dark:text-muted-foreground">
                {intro("ctaDescription")}
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="mt-8 rounded-sm bg-orange-600 px-6 text-white hover:bg-orange-700 lg:mt-0"
            >
              <Link href="/sign-up">
                {intro("getStarted")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
