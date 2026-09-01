import { z } from "zod";

export const RawBookSchema = z.object({
  title: z.string(),
  product_url: z.string(),
  price_text: z.string(),
  availability_text: z.string(),
  rating_text: z.string(),
  description: z.string().nullable(),
  source_page: z.string(),
  fetched_at: z.string(),
});

export type RawBook = z.infer<typeof RawBookSchema>;

export const BookSchema = z.object({
  title: z.string().min(1),

  product_url: z
    .string()
    .url()
    .refine((url) => url.startsWith("https://"), {
      message: "product_url must start with https://",
    }),

  price_text: z.string().min(1),

  price_gbp: z.number().nonnegative(),

  availability_text: z.string().min(1),

  rating_text: z.string().min(1),

  description: z.string().nullable(),

  source_page: z
    .string()
    .url()
    .refine((url) => url.startsWith("https://"), {
      message: "source_page must start with https://",
    }),

  fetched_at: z.string().datetime(),
});

export type Book = z.infer<typeof BookSchema>;
