// JSON-LD de artículo para las guías
export function articleLd({ title, description, path, updated }) {
  return {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: title, description, inLanguage: 'es-ES',
    mainEntityOfPage: `https://kwhoy.es${path}`,
    datePublished: '2026-11-17', dateModified: updated,
    author: { '@type': 'Person', name: 'Bernat Yeste', url: 'https://kwhoy.es/sobre-nosotros/' },
    publisher: { '@type': 'Organization', name: 'kWhoy', url: 'https://kwhoy.es/' },
    image: 'https://kwhoy.es/og.png',
  };
}
export function faqLd(faqs) {
  return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
}
