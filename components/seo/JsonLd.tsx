/**
 * Renders structured data as a <script> tag. Safe only because every
 * caller passes data built from our own authored copy (lib/seo/json-ld.ts)
 * — never pass user-generated content through this component.
 */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
