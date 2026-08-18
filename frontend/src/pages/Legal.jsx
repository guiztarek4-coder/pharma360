import { useSettings } from "@/context/SettingsContext";

function LegalPage({ title, content, testid }) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12" data-testid={testid}>
      <h1 className="font-display font-extrabold text-3xl mb-6">{title}</h1>
      <div className="text-slate-600 leading-relaxed whitespace-pre-line">{content}</div>
    </div>
  );
}

export function Privacy() {
  const { settings } = useSettings();
  return <LegalPage title="Politique de Confidentialité" content={settings.privacy_content || ""} testid="privacy-page" />;
}

export function Terms() {
  const { settings } = useSettings();
  return <LegalPage title="Conditions Générales de Vente" content={settings.cgv_content || ""} testid="cgv-page" />;
}
