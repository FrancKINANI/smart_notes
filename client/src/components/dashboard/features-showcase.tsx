import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Camera, HelpCircle, Volume2 } from "lucide-react";

export default function FeaturesShowcase() {
  const features = [
    {
      title: "Numérisation des notes",
      description: "Transformez vos notes manuscrites en texte numérique en prenant simplement une photo.",
      icon: <Camera className="h-6 w-6 text-primary-600" />,
      link: "/notes/create?tab=photo",
      bgColor: "bg-primary-100"
    },
    {
      title: "Quiz intelligents",
      description: "Générez automatiquement des quiz basés sur vos notes pour tester vos connaissances.",
      icon: <HelpCircle className="h-6 w-6 text-secondary-600" />,
      link: "/quizzes",
      bgColor: "bg-secondary-100"
    },
    {
      title: "Podcasts de notes",
      description: "Transformez vos notes en podcasts pour apprendre en mode audio pendant vos déplacements.",
      icon: <Volume2 className="h-6 w-6 text-amber-600" />,
      link: "/notes",
      bgColor: "bg-amber-100"
    }
  ];

  return (
    <div className="mb-10">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Fonctionnalités</h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center mb-4">
                <div className={`flex-shrink-0 h-12 w-12 ${feature.bgColor} rounded-md flex items-center justify-center`}>
                  {feature.icon}
                </div>
                <h3 className="ml-4 text-lg font-medium text-gray-900">{feature.title}</h3>
              </div>
              <p className="text-sm text-gray-500">{feature.description}</p>
              <div className="mt-4">
                <Button variant="link" asChild className="px-0">
                  <Link href={feature.link} className="text-sm font-medium text-primary-600 hover:text-primary-500">
                    Essayer <span aria-hidden="true">&rarr;</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
