export interface Meme {
  id: string;
  imageUrl: string;
  altText: string;
  imageB64: string;
  title: string;
  permalink: string;
  likes: string;
  timeStamp: string;
  user: string;
  tags: string[];
  comments: any[];
  itemType?: 'post' | 'meme';
}

export interface MemeResponse {
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  memeList: Meme[];
}
