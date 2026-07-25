import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: image().optional(),
		}),
});

const restaurants = defineCollection({
	loader: glob({ base: './src/content/restaurants', pattern: '**/*.{md,mdx}' }),
	schema: () =>
		z.object({
			name: z.string(),
			category: z.enum(['bufe', 'kafe', 'kahvaltici', 'lokanta', 'restoran', 'fast-food', 'fine-dining', 'pastane-tatlici']),
			visitDate: z.coerce.date(),
			location: z.string(),
			pricePerPerson: z.number().optional(),
			scores: z.object({
				lezzet: z.number().min(1).max(10),
				malzeme: z.number().min(1).max(10),
				porsiyon: z.number().min(1).max(10),
				servis: z.number().min(1).max(10),
				ortam: z.number().min(1).max(10),
				fiyatPerformans: z.number().min(1).max(10),
			}),
			comparedTo: z.string().optional(),
			comparisonResult: z.enum(['daha-iyi', 'daha-kotu', 'esit']).optional(),
			googleAtVisit: z.number().optional(),
			googleReviewCountAtVisit: z.number().optional(),
			googleNow: z.number().optional(),
			googleReviewCountNow: z.number().optional(),
			revisit: z.boolean(),
			notes: z.string().optional(),
			photos: z.array(z.string()).optional(),
		}),
});

export const collections = { blog, restaurants };
