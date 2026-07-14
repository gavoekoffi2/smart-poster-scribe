import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function FAQSection() {
  const { t } = useTranslation();
  const topFAQs = [
    { question: t("faq.items.q1"), answer: t("faq.items.a1") },
    { question: t("faq.items.q2"), answer: t("faq.items.a2") },
    { question: t("faq.items.q3"), answer: t("faq.items.a3") },
    { question: t("faq.items.q4"), answer: t("faq.items.a4") },
  ];

  return (
    <section id="faq" className="py-24 relative">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="text-center mb-12">
          <span className="text-primary font-medium text-sm tracking-wider uppercase">
            {t("faq.badge")}
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">
            {t("faq.title")}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t("faq.description")}
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-3">
          {topFAQs.map((item, index) => (
            <AccordionItem
              key={index}
              value={`faq-${index}`}
              className="bg-card/50 border border-border/50 rounded-xl px-6 data-[state=open]:border-primary/30"
            >
              <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="text-center mt-8">
          <Button variant="outline" asChild>
            <Link to="/faq">
              {t("faq.seeAll")} <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
