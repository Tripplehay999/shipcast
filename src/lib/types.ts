export type BrandVoice = "casual" | "professional" | "developer";

export interface UserProfile {
  id: string;
  clerk_user_id: string;
  product_name: string;
  product_description: string;
  brand_voice: BrandVoice;
  example_posts: string[];
  created_at: string;
}

export interface Update {
  id: string;
  clerk_user_id: string;
  raw_update: string;
  created_at: string;
  generated_content?: GeneratedContent;
}

export interface GeneratedContent {
  id: string;
  update_id: string;
  tweet: string;
  thread: string[];
  linkedin: string;
  reddit: string;
  indie_hackers: string;
  created_at: string;
}

export interface GenerateRequest {
  rawUpdate: string;
  productName: string;
  productDescription: string;
  brandVoice: BrandVoice;
  examplePosts: string[];
}

export interface GenerateResponse {
  tweet: string;
  thread: string[];
  linkedin: string;
  reddit: string;
  indie_hackers: string;
}
