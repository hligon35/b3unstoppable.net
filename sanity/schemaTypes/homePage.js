export const homePage = {
  name: 'homePage',
  title: 'Home Page',
  type: 'document',
  fields: [
    {
      name: 'aboutHeading',
      title: 'About Heading',
      type: 'string',
      validation: (Rule) => Rule.required(),
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
      of: [
        {
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
      ],
      validation: (Rule) => Rule.max(4),
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
