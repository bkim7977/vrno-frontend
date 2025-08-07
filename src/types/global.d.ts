declare global {
  interface Window {
    loadCloudinaryImage?: (url: string) => Promise<string | null>;
    imageLoader?: any;
  }
}

export {};