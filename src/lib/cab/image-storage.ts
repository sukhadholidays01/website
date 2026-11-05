export interface CabImagePreview {
  url: string;
  persistent: false;
  dispose: () => void;
}
export interface CabImageStorage {
  preview: (file: File) => Promise<CabImagePreview>;
}
/** Replace with an authenticated object-storage upload adapter after hosting is chosen. */
export const developmentImageStorage: CabImageStorage = {
  async preview(file) {
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    )
      throw Error("Choose a JPEG, PNG or WebP image up to 2 MB.");
    const url = URL.createObjectURL(file);
    return { url, persistent: false, dispose: () => URL.revokeObjectURL(url) };
  },
};
