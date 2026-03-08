import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const topFAQs = [
  {
    question: "Qu'est-ce que Graphiste GPT ?",
    answer:
      "Graphiste GPT combine l'expertise de graphistes professionnels avec l'IA pour générer des affiches personnalisées en quelques secondes.",
  },
  {
    question: "Combien coûte la génération d'une affiche ?",
    answer:
      "Chaque affiche consomme 2 crédits. Les utilisateurs gratuits ont 3 générations gratuites, puis des plans payants à partir de 2 500 FCFA/mois.",
  },
  {
    question: "Les images générées sont-elles libres de droits ?",
    answer:
      "Oui, toutes les images générées via votre compte vous appartiennent et sont utilisables sans restriction.",
  },
  {
    question: "Comment devenir graphiste partenaire ?",
    answer:
      "Inscrivez-vous comme graphiste partenaire, soumettez vos templates et gagnez des royalties à chaque utilisation.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="py-24 relative">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="text-center mb-12">
          <span className="text-primary font-medium text-sm tracking-wider uppercase">
            FAQ
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">
            Questions Fréquentes
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Les réponses aux questions les plus posées
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
              Voir toutes les questions <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
