
export function WhatsAppButton() {
  const phone = "22893708178";
  const href = `https://wa.me/${phone}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contact WhatsApp"
      className="fixed bottom-5 right-5 z-[60] group"
    >
      <span className="absolute inset-0 rounded-full bg-[#25D366]/40 animate-ping" />
      <span className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-2xl shadow-[#25D366]/40 hover:scale-110 transition-transform">
        <svg viewBox="0 0 32 32" className="w-8 h-8" fill="currentColor" aria-hidden="true">
          <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.888 2.722.888.817 0 2.15-.515 2.478-1.318.13-.33.244-.688.244-1.045 0-.058 0-.144-.03-.215-.1-.172-2.434-1.36-2.678-1.432zm-2.908 7.593c-1.798 0-3.596-.53-5.11-1.49L7.5 24.417l1.144-3.395a9.276 9.276 0 0 1-1.79-5.494c0-5.145 4.213-9.344 9.36-9.344 5.147 0 9.36 4.2 9.36 9.344 0 5.145-4.213 9.27-9.36 9.27zm0-20.406c-6.096 0-11.11 4.998-11.11 11.088 0 1.99.53 3.94 1.535 5.66L5 27.816l3.94-1.263a11.116 11.116 0 0 0 5.334 1.348c6.11 0 11.269-4.998 11.269-11.088-.015-6.09-5.174-11.088-11.27-11.088z"/>
        </svg>
      </span>
      <span className="absolute right-16 top-1/2 -translate-y-1/2 whitespace-nowrap bg-foreground text-background text-xs font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden sm:block">
        Contactez-nous
      </span>
    </a>
  );
}

