import { APP_METADATA, BRANDING } from "@/config/branding";

const ensureMetaTag = (selector: string, create: () => HTMLMetaElement) => {
  const existingTag = document.head.querySelector(selector);
  if (existingTag) return existingTag as HTMLMetaElement;
  const newTag = create();
  document.head.appendChild(newTag);
  return newTag;
};

export const applyBrandMetadata = () => {
  if (typeof document === "undefined") return;

  document.title = APP_METADATA.title;

  const descriptionTag = ensureMetaTag('meta[name="description"]', () => {
    const meta = document.createElement("meta");
    meta.setAttribute("name", "description");
    return meta;
  });
  descriptionTag.setAttribute("content", APP_METADATA.description);

  const authorTag = ensureMetaTag('meta[name="author"]', () => {
    const meta = document.createElement("meta");
    meta.setAttribute("name", "author");
    return meta;
  });
  authorTag.setAttribute("content", APP_METADATA.author);

  const ogTitleTag = ensureMetaTag('meta[property="og:title"]', () => {
    const meta = document.createElement("meta");
    meta.setAttribute("property", "og:title");
    return meta;
  });
  ogTitleTag.setAttribute("content", APP_METADATA.title);

  const ogDescriptionTag = ensureMetaTag('meta[property="og:description"]', () => {
    const meta = document.createElement("meta");
    meta.setAttribute("property", "og:description");
    return meta;
  });
  ogDescriptionTag.setAttribute("content", BRANDING.institutional.valueProp);
};
