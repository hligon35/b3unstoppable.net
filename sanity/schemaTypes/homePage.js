export const homePage = {
  name: 'homePage',
  title: 'Home Page',
  type: 'document',
  fields: [
    {
      name: 'aboutHeading',
      title: 'About Heading',
      type: 'string',
      description: 'Keep the format "About Name" so the homepage keeps the highlighted name styling.',
      initialValue: 'About Dr. Bree Charles',
      validation: (Rule) =>
        Rule.required().custom((value) => {
          if (!value) return 'About heading is required.';
          return /^About\s+.+/.test(value.trim()) || 'Use the format "About Name" to preserve the homepage heading style.';
        }),
    },
    {
      name: 'aboutParagraphOne',
      title: 'About paragraph one',
      type: 'text',
      rows: 4,
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'aboutParagraphTwo',
      title: 'About paragraph two',
      type: 'text',
      rows: 4,
    },
    {
      name: 'aboutTagline',
      title: 'About tagline',
      type: 'string',
    },
    {
      name: 'aboutCtaLabel',
      title: 'About CTA label',
      type: 'string',
    },
    {
      name: 'aboutCtaHref',
      title: 'About CTA URL',
      type: 'string',
      initialValue: '/about',
    },
    {
      name: 'aboutImages',
      title: 'About images',
      type: 'array',
      description: 'Upload exactly 4 images in display order to preserve the 2x2 homepage collage.',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            {
              name: 'alt',
              title: 'Alt text',
              type: 'string',
              description: 'Describe the image for screen readers.',
            },
          ],
        },
      ],
      validation: (Rule) => Rule.required().min(4).max(4),
    },
    {
      name: 'featuredVideo',
      title: 'Featured video',
      type: 'file',
      options: {
        accept: 'video/mp4,video/webm',
      },
    },
    {
      name: 'featuredVideoPoster',
      title: 'Featured video poster image',
      type: 'image',
      options: { hotspot: true },
      fields: [
        {
          name: 'alt',
          title: 'Alt text',
          type: 'string',
        },
      ],
    },
    {
      name: 'newsletterHeading',
      title: 'Newsletter heading',
      type: 'string',
    },
    {
      name: 'newsletterDescription',
      title: 'Newsletter description',
      type: 'text',
      rows: 3,
    },
  ],
};
